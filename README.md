# Power AI — AI-Powered Analytics Dashboard

A full-stack web application that lets non-technical users query, visualize, and dashboard their data using plain English — no SQL required.

**Live demo:** *Coming soon*  
**Built with:** Python, Flask, React, SQLite, Groq (Llama 3.3), SQLAlchemy

---

## The Problem

At PepsiCo, I watched plant managers wait days for data requests to come back from analysts — questions as simple as "how many units did we ship last year?" required going through multiple people and tools. Power BI exists to solve this, but it requires hours of setup, a steep learning curve (DAX formulas, data gateways, workspace configuration), and a paid license for every person you share with.

PowerAI is built around a simpler idea: upload your data, ask a question in plain English, get an answer in seconds.

---

## Features

- **Natural language querying** — type a question, get SQL generated automatically with auto-retry if the first attempt fails
- **AI insights on upload** — automatically surfaces 5 business-relevant observations the moment a file is loaded
- **Smart chart selection** — AI picks the right visualization type (bar, line, pie, scatter) for each query result
- **Persistent named dashboards** — pin query results to dashboards that survive page refreshes
- **Cross-filtering** — click any chart element to filter all other panels on the dashboard simultaneously
- **Live database connections** — connect directly to PostgreSQL or MySQL with encrypted credential storage
- **Multi-file support** — upload and switch between CSV, Excel (.xlsx), and JSON files
- **Dataset replacement** — replace a file and all dashboard panels that reference it update automatically
- **Sortable, paginated tables** — search, sort, and page through query results
- **CSV export** — download any query result or dashboard panel as a CSV file
- **Per-user data isolation** — each user's uploads and dashboards are completely separate
- **JWT authentication** — secure register/login/logout flow

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask, SQLAlchemy |
| Frontend | React, Recharts, Axios |
| AI | Groq API (Llama 3.3 70B) |
| Database | SQLite (local), PostgreSQL (production) |
| Auth | Flask-JWT-Extended, Flask-Bcrypt |
| Encryption | Python cryptography (Fernet) |

---

## Architecture

```
ai-ops-dashboard/
├── backend/
│   ├── app.py          # Flask API — 13 route sections
│   ├── database.py     # SQLAlchemy models
│   └── config.py       # API keys (not committed)
├── frontend/
│   └── src/
│       ├── App.js
│       ├── DashboardView.js
│       ├── ConnectionView.js
│       └── ...
└── landing/
    └── index.html      # Marketing landing page
```

**How a query works:**
1. User types a plain English question
2. Flask validates the input (rejects gibberish)
3. Groq/Llama 3.3 converts the question to SQL
4. SQL runs against the user's data table in SQLite/PostgreSQL
5. If it fails, the error is fed back to the LLM for auto-correction (up to 3 attempts)
6. Result is returned with a chart type recommendation
7. Frontend renders the appropriate chart and paginated table

---

## Running Locally

**Prerequisites:** Python 3.10+, Node.js 18+

```bash
# Clone the repo
git clone https://github.com/tgerg/powerai.git
cd powerai

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Add your Groq API key (get one free at console.groq.com)
echo 'GROQ_API_KEY = "your_key_here"' > config.py

# Start the backend
python app.py

# Frontend setup (new terminal)
cd ../frontend
npm install
npm start
```

Visit `http://localhost:3000` for the React dev server or `http://localhost:5001` for the Flask-served production build.

---

## Key Engineering Decisions

**Why Groq over OpenAI?**  
Groq's inference speed is significantly faster than OpenAI for this use case — sub-second SQL generation keeps the UX feeling responsive. Llama 3.3 70B handles SQL generation, chart recommendation, insight generation, and input validation reliably.

**Why SQLite locally?**  
Zero-config setup for development. The SQLAlchemy abstraction means switching to PostgreSQL for production is a single connection string change with no code modifications.

**Per-user table isolation**  
Each user's uploaded data is stored in a separate table named `user_{id}_{filename}` rather than a shared table with a user_id column. This prevents accidental cross-user data exposure and makes it simple to drop a user's data cleanly.

**Encrypted external credentials**  
PostgreSQL and MySQL connection passwords are encrypted at rest using Fernet symmetric encryption before being stored in the database.

---

## What's Next

- [ ] Deploy to Render with PostgreSQL
- [ ] Public shareable dashboard links
- [ ] Scheduled email reports
- [ ] Google Sheets integration
- [ ] Onboarding flow for new users
