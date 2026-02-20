from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
import sqlite3
import re
from datetime import date, datetime
from contextlib import contextmanager

app = FastAPI(title="Employee Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "employees.db"

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            address TEXT NOT NULL,
            education TEXT NOT NULL,
            position TEXT NOT NULL,
            salary REAL NOT NULL,
            join_date TEXT NOT NULL,
            branch TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()

init_db()

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
DATE_REGEX = re.compile(r'^\d{4}-\d{2}-\d{2}$')

class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    address: str
    education: str
    position: str
    salary: float
    join_date: str
    branch: str
    status: str = "active"

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not EMAIL_REGEX.match(v):
            raise ValueError('Invalid email format')
        return v

    @field_validator('salary')
    @classmethod
    def validate_salary(cls, v):
        if v < 0:
            raise ValueError('Salary must be >= 0')
        return v

    @field_validator('join_date')
    @classmethod
    def validate_join_date(cls, v):
        if not DATE_REGEX.match(v):
            raise ValueError('join_date must be YYYY-MM-DD')
        try:
            datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError('join_date must be a valid date in YYYY-MM-DD format')
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v not in ('active', 'inactive'):
            raise ValueError('status must be "active" or "inactive"')
        return v

    @field_validator('first_name', 'last_name', 'phone', 'address', 'education', 'position', 'branch')
    @classmethod
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

def row_to_dict(row):
    return dict(row)

@app.get("/employees", response_model=List[Employee])
def list_employees(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT * FROM employees ORDER BY id DESC").fetchall()
    return [row_to_dict(r) for r in rows]

@app.get("/employees/{employee_id}", response_model=Employee)
def get_employee(employee_id: int, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Employee not found")
    return row_to_dict(row)

@app.post("/employees", response_model=Employee, status_code=201)
def create_employee(emp: EmployeeCreate, db: sqlite3.Connection = Depends(get_db)):
    existing = db.execute("SELECT id FROM employees WHERE email = ?", (emp.email,)).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    cursor = db.execute(
        """INSERT INTO employees (first_name, last_name, email, phone, address, education, position, salary, join_date, branch, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (emp.first_name, emp.last_name, emp.email, emp.phone, emp.address,
         emp.education, emp.position, emp.salary, emp.join_date, emp.branch, emp.status)
    )
    db.commit()
    row = db.execute("SELECT * FROM employees WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_dict(row)

@app.put("/employees/{employee_id}", response_model=Employee)
def update_employee(employee_id: int, emp: EmployeeUpdate, db: sqlite3.Connection = Depends(get_db)):
    existing = db.execute("SELECT id FROM employees WHERE id = ?", (employee_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    email_conflict = db.execute("SELECT id FROM employees WHERE email = ? AND id != ?", (emp.email, employee_id)).fetchone()
    if email_conflict:
        raise HTTPException(status_code=400, detail="Email already used by another employee")
    db.execute(
        """UPDATE employees SET first_name=?, last_name=?, email=?, phone=?, address=?, education=?, position=?, salary=?, join_date=?, branch=?, status=?
           WHERE id=?""",
        (emp.first_name, emp.last_name, emp.email, emp.phone, emp.address,
         emp.education, emp.position, emp.salary, emp.join_date, emp.branch, emp.status, employee_id)
    )
    db.commit()
    row = db.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
    return row_to_dict(row)

@app.delete("/employees/{employee_id}", status_code=204)
def delete_employee(employee_id: int, db: sqlite3.Connection = Depends(get_db)):
    existing = db.execute("SELECT id FROM employees WHERE id = ?", (employee_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.execute("DELETE FROM employees WHERE id = ?", (employee_id,))
    db.commit()

@app.get("/dashboard/stats")
def dashboard_stats(db: sqlite3.Connection = Depends(get_db)):
    total = db.execute("SELECT COUNT(*) as cnt FROM employees").fetchone()["cnt"]
    active = db.execute("SELECT COUNT(*) as cnt FROM employees WHERE status='active'").fetchone()["cnt"]
    inactive = db.execute("SELECT COUNT(*) as cnt FROM employees WHERE status='inactive'").fetchone()["cnt"]

    by_branch = db.execute(
        "SELECT branch, COUNT(*) as count FROM employees GROUP BY branch ORDER BY count DESC"
    ).fetchall()

    joined_per_year = db.execute(
        "SELECT strftime('%Y', join_date) as year, COUNT(*) as count FROM employees GROUP BY year ORDER BY year"
    ).fetchall()

    active_per_year = db.execute(
        "SELECT strftime('%Y', join_date) as year, COUNT(*) as count FROM employees WHERE status='active' GROUP BY year ORDER BY year"
    ).fetchall()

    inactive_per_year = db.execute(
        "SELECT strftime('%Y', join_date) as year, COUNT(*) as count FROM employees WHERE status='inactive' GROUP BY year ORDER BY year"
    ).fetchall()

    return {
        "total": total,
        "active": active,
        "inactive": inactive,
        "by_branch": [{"branch": r["branch"], "count": r["count"]} for r in by_branch],
        "joined_per_year": [{"year": r["year"], "count": r["count"]} for r in joined_per_year],
        "active_per_year": [{"year": r["year"], "count": r["count"]} for r in active_per_year],
        "inactive_per_year": [{"year": r["year"], "count": r["count"]} for r in inactive_per_year],
    }