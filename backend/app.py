from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import create_engine, text, inspect
from cryptography.fernet import Fernet
from groq import Groq
import pandas as pd
import csv
import json
import os

from database import engine
from config import GROQ_API_KEY


# ─────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────

app = Flask(__name__, static_folder=None)
CORS(app)

bcrypt = Bcrypt(app)
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "local-dev-secret")
jwt = JWTManager(app)

client = Groq(api_key=GROQ_API_KEY)


# ─────────────────────────────────────────
# Encryption (for external DB passwords)
# ─────────────────────────────────────────

ENCRYPTION_KEY_FILE = "secret.key"

def get_encryption_key():
    if os.path.exists(ENCRYPTION_KEY_FILE):
        with open(ENCRYPTION_KEY_FILE, "rb") as f:
            return f.read()
    key = Fernet.generate_key()
    with open(ENCRYPTION_KEY_FILE, "wb") as f:
        f.write(key)
    return key

fernet = Fernet(get_encryption_key())

def encrypt(value):
    return fernet.encrypt(value.encode()).decode()

def decrypt(value):
    return fernet.decrypt(value.encode()).decode()


# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────

def clean_sql(sql_text):
    return sql_text.replace("```sql", "").replace("```", "").strip()


def get_table_columns(table_name, target_engine=None):
    """Get column names for a table. Works with SQLite and PostgreSQL."""
    e = target_engine or engine
    inspector = inspect(e)
    cols = inspector.get_columns(table_name)
    return [c["name"] for c in cols]


def get_external_engine(conn_record):
    password = decrypt(conn_record.encrypted_password)
    if conn_record.db_type == "postgresql":
        url = f"postgresql+psycopg2://{conn_record.username}:{password}@{conn_record.host}:{conn_record.port}/{conn_record.database}"
    elif conn_record.db_type == "mysql":
        url = f"mysql+pymysql://{conn_record.username}:{password}@{conn_record.host}:{conn_record.port}/{conn_record.database}"
    else:
        raise ValueError(f"Unsupported db_type: {conn_record.db_type}")
    return create_engine(url, connect_args={"connect_timeout": 10})


def validate_question(question):
    """Returns True if the question is gibberish, False if it looks valid."""
    prompt = f"""
    Is this text complete gibberish or random characters with no meaning?
    Text: "{question}"
    Reply with only "yes" if it is gibberish, or "no" if it could be a reasonable request in any context.
    """
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip().lower().startswith("yes")


def recommend_chart_type(question, columns, sample_rows):
    """Ask the LLM to pick the best chart type for a query result."""
    prompt = f"""
    A user asked: "{question}"
    Result columns: {columns}
    Sample data: {sample_rows}
    Best chart type? Choose ONLY one of: bar, line, pie, scatter, none
    Rules: bar=comparisons, line=trends over time, pie=proportions under 8 categories,
    scatter=two numeric correlations, none=single number or not visual.
    Respond with ONLY one word.
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        chart_type = response.choices[0].message.content.strip().lower()
        return chart_type if chart_type in ["bar", "line", "pie", "scatter", "none"] else "bar"
    except Exception:
        return "bar"


def parse_uploaded_file(file):
    """Parse CSV, Excel, or JSON file into a DataFrame."""
    file_name = file.filename
    ext = file_name.rsplit(".", 1)[-1].lower()

    if ext in ["xlsx", "xls"]:
        df = pd.read_excel(file, engine="openpyxl")

    elif ext == "json":
        content = file.read().decode("utf-8")
        parsed = json.loads(content)
        if isinstance(parsed, list):
            df = pd.DataFrame(parsed)
        elif isinstance(parsed, dict):
            for key in ["data", "records", "results", "rows", "items"]:
                if key in parsed and isinstance(parsed[key], list):
                    df = pd.DataFrame(parsed[key])
                    break
            else:
                df = pd.DataFrame([parsed])
        else:
            raise ValueError("Unsupported JSON structure")

    elif ext == "csv":
        sample = file.read(2048).decode("utf-8")
        file.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
            delimiter = dialect.delimiter
        except csv.Error:
            delimiter = ","
        df = pd.read_csv(file, sep=delimiter, engine="python")

    else:
        raise ValueError(f"Unsupported file type: .{ext}. Please upload a CSV, Excel, or JSON file.")

    # Clean column names
    df.columns = (df.columns.str.strip().str.lower()
                   .str.replace(" ", "_")
                   .str.replace(r"[^\w]", "_", regex=True))
    df = df.dropna(how="all", axis=1).dropna(how="all", axis=0)
    return df, file_name, ext


# ─────────────────────────────────────────
# Static File Serving
# ─────────────────────────────────────────

@app.route("/")
def landing():
    return send_from_directory("../landing", "index.html")

@app.route("/app")
def react_app():
    return send_from_directory("../frontend/build", "index.html")

@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory("../frontend/build/static", path)

@app.route("/app/<path:path>")
def react_static(path):
    try:
        return send_from_directory("../frontend/build", path)
    except Exception:
        return send_from_directory("../frontend/build", "index.html")

@app.route("/status")
def status():
    return jsonify({"status": "ok"})

@app.route("/debug")
def debug():
    build_path = os.path.abspath("../frontend/build")
    files = os.listdir(build_path) if os.path.exists(build_path) else "PATH NOT FOUND"
    return jsonify({"build_path": build_path, "files": files, "cwd": os.getcwd()})


# ─────────────────────────────────────────
# Authentication
# ─────────────────────────────────────────

@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data["email"]
    password = data["password"]
    hashed = bcrypt.generate_password_hash(password).decode("utf-8")
    try:
        with engine.begin() as conn:
            conn.execute(
                text("INSERT INTO users (email, password) VALUES (:e, :p)"),
                {"e": email, "p": hashed}
            )
        return jsonify({"message": "User created"})
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data["email"]
    password = data["password"]
    try:
        with engine.connect() as conn:
            user = conn.execute(
                text("SELECT * FROM users WHERE email = :e"),
                {"e": email}
            ).fetchone()
    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token})


# ─────────────────────────────────────────
# File Upload & Management
# ─────────────────────────────────────────

@app.route("/upload", methods=["POST"])
@jwt_required()
def upload():
    user_id = get_jwt_identity()

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    try:
        df, file_name, ext = parse_uploaded_file(file)
        safe_name = file_name.lower().rsplit(".", 1)[0].replace(" ", "_")
        table_name = f"user_{user_id}_{safe_name}"
        df.to_sql(table_name, engine, if_exists="replace", index=False)

        with engine.begin() as conn:
            conn.execute(
                text("DELETE FROM uploaded_files WHERE user_id = :u AND file_name = :f"),
                {"u": user_id, "f": file_name}
            )
            conn.execute(
                text("INSERT INTO uploaded_files (user_id, file_name, table_name) VALUES (:u, :f, :t)"),
                {"u": user_id, "f": file_name, "t": table_name}
            )

        return jsonify({
            "message": "File uploaded successfully",
            "rows": len(df),
            "columns": len(df.columns),
            "table_name": table_name,
            "file_name": file_name,
            "file_type": ext
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/files", methods=["GET"])
@jwt_required()
def list_files():
    user_id = get_jwt_identity()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, file_name, table_name FROM uploaded_files WHERE user_id = :u"),
            {"u": user_id}
        ).fetchall()
    return jsonify({"files": [dict(r._mapping) for r in rows]})


@app.route("/files/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    user_id = get_jwt_identity()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT table_name FROM uploaded_files WHERE id = :id AND user_id = :u"),
            {"id": file_id, "u": user_id}
        ).fetchone()

    if not row:
        return jsonify({"error": "File not found"}), 404

    with engine.begin() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {row.table_name}"))
        conn.execute(text("DELETE FROM uploaded_files WHERE id = :id"), {"id": file_id})

    return jsonify({"message": "Deleted"})


@app.route("/files/<int:file_id>/replace", methods=["POST"])
@jwt_required()
def replace_file(file_id):
    user_id = get_jwt_identity()

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    with engine.connect() as conn:
        existing = conn.execute(
            text("SELECT * FROM uploaded_files WHERE id = :id AND user_id = :u"),
            {"id": file_id, "u": user_id}
        ).fetchone()

    if not existing:
        return jsonify({"error": "File not found"}), 404

    try:
        df, _, _ = parse_uploaded_file(request.files["file"])
        table_name = existing.table_name
        df.to_sql(table_name, engine, if_exists="replace", index=False)

        with engine.connect() as conn:
            panels = conn.execute(
                text("""
                    SELECT dp.id, dp.sql FROM dashboard_panels dp
                    JOIN dashboards d ON dp.dashboard_id = d.id
                    WHERE d.user_id = :u AND dp.sql LIKE :t
                """),
                {"u": user_id, "t": f"%{table_name}%"}
            ).fetchall()

        updated_count = 0
        for panel in panels:
            try:
                result_df = pd.read_sql(panel.sql, engine)
                with engine.begin() as conn:
                    conn.execute(
                        text("UPDATE dashboard_panels SET rows = :r WHERE id = :id"),
                        {"r": json.dumps(result_df.to_dict(orient="records")), "id": panel.id}
                    )
                updated_count += 1
            except Exception:
                pass

        return jsonify({
            "message": "File replaced successfully",
            "rows": len(df),
            "panels_updated": updated_count
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Querying
# ─────────────────────────────────────────

@app.route("/query", methods=["POST"])
@jwt_required()
def query():
    user_id = get_jwt_identity()
    data = request.get_json()
    question = data.get("question")
    table_name = data.get("table_name") or f"user_{user_id}_data"

    if not question:
        return jsonify({"error": "No question provided"}), 400

    if validate_question(question):
        return jsonify({"error": "That doesn't look like a valid question. Try something like 'show me all rows' or 'count by category'."}), 400

    try:
        columns = get_table_columns(table_name)
    except Exception as e:
        return jsonify({"error": f"Could not read schema: {str(e)}"}), 500

    if not columns:
        return jsonify({"error": "No data uploaded yet"}), 400

    schema = ", ".join(columns)

    def generate_sql(q, error_feedback=None):
        if error_feedback:
            prompt = f"""
            You are an expert data analyst. The table '{table_name}' has columns: {schema}.
            You previously generated: {error_feedback['sql']}
            It failed with: {error_feedback['error']}
            Fix the SQL. Only return the fixed SQL. No explanation.
            """
        else:
            prompt = f"""
            You are an expert data analyst. The table '{table_name}' has columns: {schema}.
            Convert this question into a valid SQL query.
            Question: "{q}"
            Only return SQL. No explanation.
            """
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        return clean_sql(response.choices[0].message.content.strip())

    sql_query = None
    last_error = None
    for attempt in range(3):
        try:
            sql_query = generate_sql(question, {"sql": sql_query, "error": str(last_error)} if last_error else None)
            result_df = pd.read_sql(sql_query, engine)
            break
        except Exception as e:
            last_error = e
            if attempt == 2:
                return jsonify({"error": f"Could not generate valid query after 3 attempts: {str(e)}", "sql": sql_query}), 500

    rows = result_df.to_dict(orient="records")
    chart_type = recommend_chart_type(question, list(result_df.columns), rows[:3])

    return jsonify({"sql": sql_query, "rows": rows, "chartType": chart_type})


@app.route("/query/filtered", methods=["POST"])
@jwt_required()
def query_filtered():
    data = request.get_json()
    sql = data.get("sql")
    filter_column = data.get("filter_column")
    filter_value = data.get("filter_value")

    if not sql or not filter_column or filter_value is None:
        return jsonify({"error": "Missing parameters"}), 400

    try:
        prompt = f"""
        You are a SQL expert. Here is an existing SQL query:
        {sql}

        Rewrite this query to filter where the value related to "{filter_column}" equals "{filter_value}".
        Rules:
        - Add a WHERE clause filtering on the relevant column
        - If the query uses an alias like "sales_rep AS Employee", filter on the original column
        - If the query has GROUP BY, add the filter before it
        - If the data has no logical connection to "{filter_column}", return the original SQL unchanged
        - Only return SQL. No explanation.
        """
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        filtered_sql = clean_sql(response.choices[0].message.content.strip())
        result_df = pd.read_sql(filtered_sql, engine)
        return jsonify({"rows": result_df.to_dict(orient="records")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Insights & Suggestions
# ─────────────────────────────────────────

@app.route("/insights", methods=["POST"])
@jwt_required()
def insights():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    table_name = data.get("table_name") or f"user_{user_id}_data"

    try:
        columns = get_table_columns(table_name)
        with engine.connect() as conn:
            sample_rows = [dict(r._mapping) for r in conn.execute(
                text(f"SELECT * FROM {table_name} LIMIT 5")
            ).fetchall()]
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if not columns:
        return jsonify({"error": "No data uploaded yet"}), 400

    prompt = f"""
    You are a data analyst. Dataset columns: {", ".join(columns)}.
    First 5 rows: {sample_rows}
    Generate exactly 5 short, specific, interesting business insights.
    Respond ONLY with a JSON array of strings, no markdown.
    Example: ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"]
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
        return jsonify({"insights": json.loads(raw)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/suggestions", methods=["POST"])
@jwt_required()
def suggestions():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    table_name = data.get("table_name") or f"user_{user_id}_data"

    try:
        columns = get_table_columns(table_name)
        with engine.connect() as conn:
            sample_rows = [dict(r._mapping) for r in conn.execute(
                text(f"SELECT * FROM {table_name} LIMIT 5")
            ).fetchall()]
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if not columns:
        return jsonify({"error": "No data uploaded yet"}), 400

    prompt = f"""
    You are a data analyst. Dataset columns: {", ".join(columns)}.
    First 5 rows: {sample_rows}
    Generate exactly 6 specific, useful questions a business user might ask.
    Use actual column names. Keep each under 10 words.
    Respond ONLY with a JSON array of strings, no markdown.
    Example: ["question 1", "question 2", "question 3", "question 4", "question 5", "question 6"]
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
        return jsonify({"suggestions": json.loads(raw)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Saved Queries
# ─────────────────────────────────────────

@app.route("/queries/save", methods=["POST"])
@jwt_required()
def save_query():
    user_id = get_jwt_identity()
    data = request.get_json()
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO saved_queries (user_id, question, sql) VALUES (:u, :q, :s)"),
            {"u": user_id, "q": data["question"], "s": data["sql"]}
        )
    return jsonify({"message": "Saved"})


@app.route("/queries/list", methods=["GET"])
@jwt_required()
def list_queries():
    user_id = get_jwt_identity()
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT * FROM saved_queries WHERE user_id = :u"),
                {"u": user_id}
            ).fetchall()
        return jsonify([dict(r._mapping) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Dashboards
# ─────────────────────────────────────────

@app.route("/dashboards", methods=["GET"])
@jwt_required()
def list_dashboards():
    user_id = get_jwt_identity()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT * FROM dashboards WHERE user_id = :u ORDER BY id"),
            {"u": user_id}
        ).fetchall()
    return jsonify({"dashboards": [dict(r._mapping) for r in rows]})


@app.route("/dashboards", methods=["POST"])
@jwt_required()
def create_dashboard():
    user_id = get_jwt_identity()
    name = request.get_json().get("name", "Untitled Dashboard")
    with engine.begin() as conn:
        result = conn.execute(
            text("INSERT INTO dashboards (user_id, name) VALUES (:u, :n) RETURNING id"),
            {"u": user_id, "n": name}
        )
        dashboard_id = result.fetchone()[0]
    return jsonify({"id": dashboard_id, "name": name})


@app.route("/dashboards/<int:dashboard_id>", methods=["DELETE"])
@jwt_required()
def delete_dashboard(dashboard_id):
    user_id = get_jwt_identity()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM dashboard_panels WHERE dashboard_id = :d"), {"d": dashboard_id})
        conn.execute(text("DELETE FROM dashboards WHERE id = :d AND user_id = :u"), {"d": dashboard_id, "u": user_id})
    return jsonify({"message": "Deleted"})


@app.route("/dashboards/<int:dashboard_id>/rename", methods=["POST"])
@jwt_required()
def rename_dashboard(dashboard_id):
    user_id = get_jwt_identity()
    name = request.get_json().get("name", "Untitled Dashboard")
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE dashboards SET name = :n WHERE id = :d AND user_id = :u"),
            {"n": name, "d": dashboard_id, "u": user_id}
        )
    return jsonify({"message": "Renamed"})


# ─────────────────────────────────────────
# Dashboard Panels
# ─────────────────────────────────────────

@app.route("/dashboards/<int:dashboard_id>/panels", methods=["GET"])
@jwt_required()
def get_panels(dashboard_id):
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT * FROM dashboard_panels WHERE dashboard_id = :d ORDER BY position"),
            {"d": dashboard_id}
        ).fetchall()
    return jsonify({"panels": [
        {
            "id": r.id,
            "name": r.name or "",
            "question": r.question,
            "sql": r.sql,
            "rows": json.loads(r.rows),
            "chartType": r.chart_type,
            "fileName": r.file_name
        }
        for r in rows
    ]})


@app.route("/dashboards/<int:dashboard_id>/panels", methods=["POST"])
@jwt_required()
def add_panel(dashboard_id):
    data = request.get_json()
    with engine.begin() as conn:
        position = conn.execute(
            text("SELECT COUNT(*) FROM dashboard_panels WHERE dashboard_id = :d"),
            {"d": dashboard_id}
        ).fetchone()[0]
        conn.execute(
            text("""
                INSERT INTO dashboard_panels
                (dashboard_id, question, sql, rows, chart_type, file_name, position)
                VALUES (:d, :q, :s, :r, :c, :f, :p)
            """),
            {
                "d": dashboard_id,
                "q": data.get("question", ""),
                "s": data.get("sql", ""),
                "r": json.dumps(data.get("rows", [])),
                "c": data.get("chartType", "bar"),
                "f": data.get("fileName", ""),
                "p": position
            }
        )
    return jsonify({"message": "Panel added"})


@app.route("/dashboards/<int:dashboard_id>/panels/<int:panel_id>", methods=["DELETE"])
@jwt_required()
def delete_panel(dashboard_id, panel_id):
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM dashboard_panels WHERE id = :id AND dashboard_id = :d"),
            {"id": panel_id, "d": dashboard_id}
        )
    return jsonify({"message": "Deleted"})


@app.route("/dashboards/<int:dashboard_id>/panels/<int:panel_id>/rename", methods=["POST"])
@jwt_required()
def rename_panel(dashboard_id, panel_id):
    name = request.get_json().get("name", "").strip()
    if not name:
        return jsonify({"error": "Name required"}), 400
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE dashboard_panels SET name = :n WHERE id = :id AND dashboard_id = :d"),
            {"n": name, "id": panel_id, "d": dashboard_id}
        )
    return jsonify({"message": "Renamed"})


# ─────────────────────────────────────────
# External Database Connections
# ─────────────────────────────────────────

@app.route("/connections", methods=["GET"])
@jwt_required()
def list_connections():
    user_id = get_jwt_identity()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, name, db_type, host, port, database, username, active_table FROM database_connections WHERE user_id = :u"),
            {"u": user_id}
        ).fetchall()
    return jsonify({"connections": [dict(r._mapping) for r in rows]})


@app.route("/connections", methods=["POST"])
@jwt_required()
def add_connection():
    user_id = get_jwt_identity()
    data = request.get_json()
    password = data["password"]
    db_type = data["db_type"]
    host = data["host"]
    port = data["port"]
    database = data["database"]
    username = data["username"]

    # Test connection before saving
    test_engine = None
    try:
        if db_type == "postgresql":
            url = f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}"
        elif db_type == "mysql":
            url = f"mysql+pymysql://{username}:{password}@{host}:{port}/{database}"
        else:
            return jsonify({"error": "Unsupported database type"}), 400

        test_engine = create_engine(url, connect_args={"connect_timeout": 10})
        with test_engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
    except Exception as e:
        return jsonify({"error": f"Connection failed: {str(e)}"}), 400
    finally:
        if test_engine:
            test_engine.dispose()

    with engine.begin() as conn:
        result = conn.execute(
            text("""
                INSERT INTO database_connections
                (user_id, name, db_type, host, port, database, username, encrypted_password)
                VALUES (:u, :n, :t, :h, :p, :d, :un, :ep)
                RETURNING id
            """),
            {
                "u": user_id,
                "n": data.get("name", f"{db_type} — {database}"),
                "t": db_type, "h": host, "p": port,
                "d": database, "un": username,
                "ep": encrypt(password)
            }
        )
        conn_id = result.fetchone()[0]

    return jsonify({"id": conn_id, "message": "Connection saved"})


@app.route("/connections/<int:conn_id>", methods=["DELETE"])
@jwt_required()
def delete_connection(conn_id):
    user_id = get_jwt_identity()
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM database_connections WHERE id = :id AND user_id = :u"),
            {"id": conn_id, "u": user_id}
        )
    return jsonify({"message": "Deleted"})


@app.route("/connections/<int:conn_id>/tables", methods=["GET"])
@jwt_required()
def list_tables(conn_id):
    user_id = get_jwt_identity()
    with engine.connect() as conn:
        record = conn.execute(
            text("SELECT * FROM database_connections WHERE id = :id AND user_id = :u"),
            {"id": conn_id, "u": user_id}
        ).fetchone()

    if not record:
        return jsonify({"error": "Connection not found"}), 404

    try:
        ext_engine = get_external_engine(record)
        with ext_engine.connect() as ext_conn:
            if record.db_type == "postgresql":
                result = ext_conn.execute(text("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                """))
            elif record.db_type == "mysql":
                result = ext_conn.execute(text("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                """))
            tables = [r[0] for r in result.fetchall()]
        ext_engine.dispose()
        return jsonify({"tables": tables})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/connections/<int:conn_id>/query", methods=["POST"])
@jwt_required()
def query_connection(conn_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    question = data.get("question")
    table_name = data.get("table_name")

    if not question or not table_name:
        return jsonify({"error": "Missing question or table_name"}), 400

    with engine.connect() as conn:
        record = conn.execute(
            text("SELECT * FROM database_connections WHERE id = :id AND user_id = :u"),
            {"id": conn_id, "u": user_id}
        ).fetchone()

    if not record:
        return jsonify({"error": "Connection not found"}), 404

    if validate_question(question):
        return jsonify({"error": "That doesn't look like a valid question."}), 400

    try:
        ext_engine = get_external_engine(record)
        db_dialect = "PostgreSQL" if record.db_type == "postgresql" else "MySQL"

        with ext_engine.connect() as ext_conn:
            if record.db_type == "postgresql":
                result = ext_conn.execute(text(f"""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = '{table_name}' AND table_schema = 'public'
                    ORDER BY ordinal_position
                """))
            else:
                result = ext_conn.execute(text(f"""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = '{table_name}' AND table_schema = DATABASE()
                    ORDER BY ordinal_position
                """))
            columns = [r[0] for r in result.fetchall()]

        if not columns:
            return jsonify({"error": f"Table '{table_name}' not found or has no columns"}), 400

        schema = ", ".join(columns)

        def generate_sql(q, error_feedback=None):
            if error_feedback:
                prompt = f"You are a {db_dialect} expert. Table '{table_name}' has columns: {schema}. You previously generated: {error_feedback['sql']} — it failed with: {error_feedback['error']}. Fix it. Only return SQL."
            else:
                prompt = f"You are a {db_dialect} expert. Table '{table_name}' has columns: {schema}. Convert this to a valid {db_dialect} SQL query: \"{q}\". Only return SQL."
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}]
            )
            return clean_sql(response.choices[0].message.content.strip())

        sql_query = None
        last_error = None
        for attempt in range(3):
            try:
                sql_query = generate_sql(question, {"sql": sql_query, "error": str(last_error)} if last_error else None)
                with ext_engine.connect() as ext_conn:
                    result_df = pd.read_sql(sql_query, ext_conn)
                break
            except Exception as e:
                last_error = e
                if attempt == 2:
                    ext_engine.dispose()
                    return jsonify({"error": f"Could not generate valid query: {str(e)}", "sql": sql_query}), 500

        ext_engine.dispose()
        rows = result_df.to_dict(orient="records")
        chart_type = recommend_chart_type(question, list(result_df.columns), rows[:3])
        return jsonify({"sql": sql_query, "rows": rows, "chartType": chart_type})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/connections/<int:conn_id>/insights", methods=["POST"])
@jwt_required()
def connection_insights(conn_id):
    user_id = get_jwt_identity()
    table_name = (request.get_json() or {}).get("table_name")
    if not table_name:
        return jsonify({"error": "table_name required"}), 400

    with engine.connect() as conn:
        record = conn.execute(
            text("SELECT * FROM database_connections WHERE id = :id AND user_id = :u"),
            {"id": conn_id, "u": user_id}
        ).fetchone()

    if not record:
        return jsonify({"error": "Connection not found"}), 404

    try:
        ext_engine = get_external_engine(record)
        with ext_engine.connect() as ext_conn:
            result_df = pd.read_sql(f"SELECT * FROM {table_name} LIMIT 5", ext_conn)
        ext_engine.dispose()

        prompt = f"""
        You are a data analyst. Dataset columns: {", ".join(result_df.columns)}.
        First 5 rows: {result_df.to_dict(orient="records")}
        Generate exactly 5 short, specific, interesting business insights.
        Respond ONLY with a JSON array of strings, no markdown.
        """
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
        return jsonify({"insights": json.loads(raw)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/connections/<int:conn_id>/suggestions", methods=["POST"])
@jwt_required()
def connection_suggestions(conn_id):
    user_id = get_jwt_identity()
    table_name = (request.get_json() or {}).get("table_name")
    if not table_name:
        return jsonify({"error": "table_name required"}), 400

    with engine.connect() as conn:
        record = conn.execute(
            text("SELECT * FROM database_connections WHERE id = :id AND user_id = :u"),
            {"id": conn_id, "u": user_id}
        ).fetchone()

    if not record:
        return jsonify({"error": "Connection not found"}), 404

    try:
        ext_engine = get_external_engine(record)
        with ext_engine.connect() as ext_conn:
            result_df = pd.read_sql(f"SELECT * FROM {table_name} LIMIT 5", ext_conn)
        ext_engine.dispose()

        prompt = f"""
        Dataset columns: {", ".join(result_df.columns)}.
        First 5 rows: {result_df.to_dict(orient="records")}
        Generate exactly 6 specific, useful questions a business user might ask.
        Use actual column names. Keep each under 10 words.
        Respond ONLY with a JSON array of strings, no markdown.
        """
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
        return jsonify({"suggestions": json.loads(raw)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(port=port, host="0.0.0.0", debug=False)