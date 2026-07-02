# PowerAI — AI-Powered Analytics Dashboard

A full-stack web application that lets non-technical users query, visualize, and dashboard their data using plain English — no SQL required.

**Live demo:** https://powerai-9r9i.onrender.com  
**GitHub:** https://github.com/tgerg/powerai  
**Built with:** Python, Flask, React, PostgreSQL, Groq (Llama 3.1), SQLAlchemy

---

## The Problem

At PepsiCo, I watched operations teams struggle with Power BI's steep learning curve and maintenance overhead — a tool that required technical expertise just to keep dashboards updated, leaving non-technical managers unable to independently access their own data.

PowerAI is built around a simpler idea: upload your data, ask a question in plain English, get an answer in seconds.

---

## Features

- **Natural language querying** — type a question, get SQL generated automatically with auto-retry if the first attempt fails
- **AI insights on upload** — automatically surfaces 5 business-relevant observations the moment a file is loaded
- **Smart chart selection** — AI picks the right visualization type (bar, line, pie, scatter) for each query result
- **Persistent named dashboards** — pin query results to named dashboards that survive page refreshes
- **Cross-filtering** — click any chart element to filter all other panels on the dashboard simultaneously
- **Panel customization** — rename panels, resize them (half, full, tall, large), and reveal the underlying SQL on demand
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
| AI | Groq API (Llama 3.1 8B) |
| Database | SQLite (local), PostgreSQL via Supabase (production) |
| Auth | Flask-JWT-Extended, Flask-Bcrypt |
| Encryption | Python cryptography (Fernet) |
| Hosting | Render (web service) |

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
3. Groq/Llama 3.1 converts the question to SQL
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
Groq's inference speed is significantly faster than OpenAI for this use case — near-instant SQL generation keeps the UX feeling responsive. Llama 3.1 8B handles SQL generation, chart recommendation, insight generation, and input validation reliably at no cost.

**Why SQLite locally?**
Zero-config setup for development. The SQLAlchemy abstraction means switching to PostgreSQL for production is a single connection string change with no code modifications.

**Per-user table isolation**
Each user's uploaded data is stored in a separate table named `user_{id}_{filename}` rather than a shared table with a user_id column. This prevents accidental cross-user data exposure and makes it simple to drop a user's data cleanly.

**Encrypted external credentials**
PostgreSQL and MySQL connection passwords are encrypted at rest using Fernet symmetric encryption before being stored in the database.

**Input validation before LLM calls**
Every query is validated by the LLM before SQL generation — gibberish inputs are rejected immediately, saving unnecessary API calls and giving users clear error messages.

---

## What's Next

- [x] Deploy to Render with PostgreSQL (Supabase)
- [ ] Public shareable dashboard links
- [ ] Scheduled email reports
- [ ] Google Sheets integration
- [ ] Onboarding flow for new users