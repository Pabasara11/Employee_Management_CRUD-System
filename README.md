# Workforce — Employee Management System

A full-stack Employee Management application built with **FastAPI** (Python) + **React**.

```
employee-mgmt/
├── backend/
│   ├── main.py              ← FastAPI app (all endpoints)
│   ├── requirements.txt     ← Python dependencies
│   └── employees.db         ← SQLite database (auto-created on first run)
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js           ← Main React component (full UI)
    │   ├── App.css          ← Styles
    │   ├── index.js         ← React entry point
    │   └── config.js        ← ⚙️  Backend URL configuration
    └── package.json
```

---

## Prerequisites

Install these before starting:

| Tool    | Version           | Download                          |
| ------- | ----------------- | --------------------------------- |
| Python  | 3.10 +            | https://www.python.org/downloads/ |
| Node.js | 18 +              | https://nodejs.org/               |
| npm     | bundled with Node | —                                 |

> **Tip:** During Python installation on Windows, check **"Add Python to PATH"**.

---

## 1 — Backend Setup (FastAPI + SQLite)

Open **Command Prompt** or **PowerShell** and run:

```cmd
cd employee-mgmt\backend

:: Create a virtual environment
python -m venv venv

:: Activate it (Command Prompt)
venv\Scripts\activate.bat

:: OR activate it (PowerShell)
venv\Scripts\Activate.ps1

:: Install dependencies
pip install -r requirements.txt
```

### Start the backend server

```cmd
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

The SQLite database file **`employees.db`** is created automatically in the `backend/` folder on first run — no migrations needed.

### API Documentation

While the backend is running, visit:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 2 — Frontend Setup (React)

Open a **second** Command Prompt / PowerShell window:

```cmd
cd employee-mgmt\frontend

:: Install Node dependencies
npm install

:: Start the React development server
npm start
```

The app opens automatically at **http://localhost:3000**

---

## 3 — Configure Backend URL

The backend URL is set in one place:

```
frontend/src/config.js
```

```js
const API_BASE_URL = "http://localhost:8000";
```

Change this if:

- You run the backend on a different port
- You deploy the backend to a remote server (e.g. `https://api.mycompany.com`)

---

## 4 — Database (SQLite)

- The database file is `backend/employees.db`
- It is created automatically when the FastAPI app starts for the first time
- No external database server needed — SQLite is built into Python
- To reset the database, simply **delete** `employees.db` and restart the backend

### Schema

| Column     | Type    | Notes                        |
| ---------- | ------- | ---------------------------- |
| id         | INTEGER | Auto-increment PK            |
| first_name | TEXT    | Required                     |
| last_name  | TEXT    | Required                     |
| email      | TEXT    | Required, unique, validated  |
| phone      | TEXT    | Required                     |
| address    | TEXT    | Required                     |
| education  | TEXT    | Required                     |
| position   | TEXT    | Required                     |
| salary     | REAL    | Required, ≥ 0                |
| join_date  | TEXT    | Required, YYYY-MM-DD         |
| branch     | TEXT    | Required                     |
| status     | TEXT    | `active` or `inactive`       |
| created_at | TEXT    | Auto set to current datetime |

---

## 5 — REST API Reference

| Method | Endpoint           | Description          |
| ------ | ------------------ | -------------------- |
| GET    | `/employees`       | List all employees   |
| GET    | `/employees/{id}`  | Get employee by ID   |
| POST   | `/employees`       | Create employee      |
| PUT    | `/employees/{id}`  | Update employee      |
| DELETE | `/employees/{id}`  | Delete employee      |
| GET    | `/dashboard/stats` | Dashboard statistics |

### Dashboard Stats Response

```json
{
  "total": 42,
  "active": 35,
  "inactive": 7,
  "by_branch": [
    { "branch": "Headquarters", "count": 12 },
    { "branch": "New York", "count": 8 }
  ],
  "joined_per_year": [
    { "year": "2022", "count": 10 },
    { "year": "2023", "count": 15 }
  ],
  "active_per_year": [...],
  "inactive_per_year": [...]
}
```

---

## 6 — Features

### Dashboard

- **4 summary cards**: Total, Active, Inactive, Branch count
- **Branch breakdown cards**: Count per branch, clickable to filter
- **Line chart**: Employees joined / active / inactive per year
- **Pie chart**: Distribution across branches

### Employee Table

- Shows all employees with name, email, position, branch, salary, join date, status
- **Edit** and **Delete** buttons on every row
- Filtered views when clicking any dashboard card

### Add / Edit Form

- Same form for both create and edit (prefilled on edit)
- **Frontend validation**: required fields, email format, salary ≥ 0, date format
- **Backend validation**: same rules enforced via Pydantic

### Filter Views (click any card)

- All employees
- Active employees only
- Inactive employees only
- Employees by specific branch

---

## 7 — Running Both Servers (Quick Reference)

**Terminal 1 — Backend:**

```cmd
cd employee-mgmt\backend
venv\Scripts\activate.bat
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**

```cmd
cd employee-mgmt\frontend
npm start
```

Then open **http://localhost:3000** in your browser.

---

## 8 — Troubleshooting

| Problem                           | Solution                                                                  |
| --------------------------------- | ------------------------------------------------------------------------- |
| `python` not found                | Reinstall Python and check "Add to PATH"                                  |
| `npm` not found                   | Reinstall Node.js                                                         |
| Port 8000 in use                  | Run: `uvicorn main:app --port 8001` and update `config.js`                |
| Port 3000 in use                  | React will ask to use another port — press `Y`                            |
| CORS error in browser             | Make sure backend is running and `API_BASE_URL` in `config.js` is correct |
| PowerShell execution policy error | Run: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`                |
| `employees.db` locked             | Close any SQLite browser tools (e.g. DB Browser) that have the file open  |

