import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import API_BASE_URL from "./config";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const BRANCHES = ["Headquarters", "New York", "London", "Tokyo", "Sydney", "Dubai"];

const EMPTY_FORM = {
  first_name: "", last_name: "", email: "", phone: "",
  address: "", education: "", position: "", salary: "",
  join_date: "", branch: BRANCHES[0], status: "active",
};

function validateForm(form) {
  const errors = {};
  if (!form.first_name.trim()) errors.first_name = "Required";
  if (!form.last_name.trim()) errors.last_name = "Required";
  if (!form.email.trim()) errors.email = "Required";
  else if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(form.email))
    errors.email = "Invalid email format";
  if (!form.phone.trim()) errors.phone = "Required";
  if (!form.address.trim()) errors.address = "Required";
  if (!form.education.trim()) errors.education = "Required";
  if (!form.position.trim()) errors.position = "Required";
  if (form.salary === "" || form.salary === null) errors.salary = "Required";
  else if (isNaN(Number(form.salary)) || Number(form.salary) < 0)
    errors.salary = "Must be a number ≥ 0";
  if (!form.join_date) errors.join_date = "Required";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.join_date))
    errors.join_date = "Use YYYY-MM-DD format";
  if (!form.branch) errors.branch = "Required";
  return errors;
}

const BRANCH_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899",
];

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null); // null=all, 'active','inactive', or branch name
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [empRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/employees`),
        axios.get(`${API_BASE_URL}/dashboard/stats`),
      ]);
      setEmployees(empRes.data);
      setStats(statsRes.data);
    } catch (e) {
      showToast("Failed to fetch data from backend", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (emp) => {
    setEditId(emp.id);
    setForm({
      first_name: emp.first_name, last_name: emp.last_name,
      email: emp.email, phone: emp.phone, address: emp.address,
      education: emp.education, position: emp.position,
      salary: emp.salary.toString(), join_date: emp.join_date,
      branch: emp.branch, status: emp.status,
    });
    setErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const payload = { ...form, salary: Number(form.salary) };
    try {
      if (editId) {
        await axios.put(`${API_BASE_URL}/employees/${editId}`, payload);
        showToast("Employee updated successfully");
      } else {
        await axios.post(`${API_BASE_URL}/employees`, payload);
        showToast("Employee added successfully");
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.detail || "Operation failed";
      showToast(typeof msg === "string" ? msg : JSON.stringify(msg), "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/employees/${id}`);
      showToast("Employee deleted");
      setDeleteConfirm(null);
      fetchAll();
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => { const c = { ...er }; delete c[name]; return c; });
  };

  const filteredEmployees = employees.filter(emp => {
    if (!filter) return true;
    if (filter === "active") return emp.status === "active";
    if (filter === "inactive") return emp.status === "inactive";
    return emp.branch === filter;
  });

  // Chart data
  const allYears = stats
    ? Array.from(new Set([
        ...(stats.joined_per_year || []).map(d => d.year),
        ...(stats.active_per_year || []).map(d => d.year),
        ...(stats.inactive_per_year || []).map(d => d.year),
      ])).sort()
    : [];

  const lineData = {
    labels: allYears,
    datasets: [
      {
        label: "Joined",
        data: allYears.map(y => (stats?.joined_per_year || []).find(d => d.year === y)?.count || 0),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#6366f1",
      },
      {
        label: "Active",
        data: allYears.map(y => (stats?.active_per_year || []).find(d => d.year === y)?.count || 0),
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#10b981",
      },
      {
        label: "Inactive",
        data: allYears.map(y => (stats?.inactive_per_year || []).find(d => d.year === y)?.count || 0),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#ef4444",
      },
    ],
  };

  const pieData = stats?.by_branch?.length
    ? {
        labels: stats.by_branch.map(b => b.branch),
        datasets: [{
          data: stats.by_branch.map(b => b.count),
          backgroundColor: BRANCH_COLORS.slice(0, stats.by_branch.length),
          borderWidth: 2,
          borderColor: "#1e1e2e",
        }],
      }
    : null;

  const filterLabel = !filter ? "All Employees"
    : filter === "active" ? "Active Employees"
    : filter === "inactive" ? "Inactive Employees"
    : `Branch: ${filter}`;

  return (
    <div className="app">
      {/* Toast */}
      {toast && (
        <div className={`toast toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal--confirm" onClick={e => e.stopPropagation()}>
            <h3>Delete Employee</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.first_name} {deleteConfirm.last_name}</strong>? This cannot be undone.</p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn--danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal--form" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editId ? "Edit Employee" : "Add New Employee"}</h2>
              <button className="modal__close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="emp-form" noValidate>
              <div className="form-grid">
                <Field label="First Name" name="first_name" value={form.first_name} onChange={handleChange} error={errors.first_name} />
                <Field label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} error={errors.last_name} />
                <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
                <Field label="Phone" name="phone" type="number" value={form.phone} onChange={handleChange} error={errors.phone} />
                <Field label="Position" name="position" value={form.position} onChange={handleChange} error={errors.position} />
                <Field label="Salary ($)" name="salary" type="number" value={form.salary} onChange={handleChange} error={errors.salary} />
                <Field label="Join Date" name="join_date" type="date" value={form.join_date} onChange={handleChange} error={errors.join_date} />
                <div className="field">
                  <label>Branch</label>
                  <select name="branch" value={form.branch} onChange={handleChange} className={errors.branch ? "input input--error" : "input"}>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {errors.branch && <span className="field__error">{errors.branch}</span>}
                </div>
                <div className="field">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="input">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="field">
                  <label>Education</label>
                  <input name="education" value={form.education} onChange={handleChange} className={errors.education ? "input input--error" : "input"} placeholder="e.g. B.Sc. Computer Science" />
                  {errors.education && <span className="field__error">{errors.education}</span>}
                </div>
                <div className="field field--full">
                  <label>Address</label>
                  <textarea name="address" value={form.address} onChange={handleChange} className={errors.address ? "input input--error" : "input"} rows={2} />
                  {errors.address && <span className="field__error">{errors.address}</span>}
                </div>
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary">{editId ? "Save Changes" : "Add Employee"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-text">Workforce</span>
        </div>
        <nav className="sidebar__nav">
          <button className={`nav-item ${!filter ? "nav-item--active" : ""}`} onClick={() => setFilter(null)}>
            <span className="nav-item__icon">◈</span> Dashboard
          </button>
          <div className="nav-section">Filters</div>
          <button className={`nav-item ${filter === "active" ? "nav-item--active" : ""}`} onClick={() => setFilter("active")}>
            <span className="nav-dot nav-dot--active" /> Active
          </button>
          <button className={`nav-item ${filter === "inactive" ? "nav-item--active" : ""}`} onClick={() => setFilter("inactive")}>
            <span className="nav-dot nav-dot--inactive" /> Inactive
          </button>
          <div className="nav-section">Branches</div>
          {BRANCHES.map((b, i) => (
            <button key={b} className={`nav-item ${filter === b ? "nav-item--active" : ""}`} onClick={() => setFilter(b)}>
              <span className="nav-branch-dot" style={{ background: BRANCH_COLORS[i] }} /> {b}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="main__header">
          <div>
            <h1 className="main__title">{filterLabel}</h1>
            <p className="main__subtitle">{loading ? "Loading..." : `${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? "s" : ""}`}</p>
          </div>
          <button className="btn btn--primary btn--add" onClick={openAdd}>
            <span>+</span> Add Employee
          </button>
        </header>

        {/* Stats Cards */}
        {!filter && stats && (
          <div className="cards">
            <StatCard label="Total Employees" value={stats.total} icon="👥" accent="#6366f1" onClick={() => setFilter(null)} />
            <StatCard label="Active" value={stats.active} icon="✅" accent="#10b981" onClick={() => setFilter("active")} />
            <StatCard label="Inactive" value={stats.inactive} icon="⏸️" accent="#ef4444" onClick={() => setFilter("inactive")} />
            <StatCard label="Branches" value={stats.by_branch?.length || 0} icon="🌐" accent="#f59e0b" onClick={() => {}} />
          </div>
        )}

        {/* Branch cards when no filter */}
        {!filter && stats?.by_branch?.length > 0 && (
          <div className="cards cards--branch">
            {stats.by_branch.map((b, i) => (
              <StatCard key={b.branch} label={b.branch} value={b.count} icon="🏢" accent={BRANCH_COLORS[i]} onClick={() => setFilter(b.branch)} small />
            ))}
          </div>
        )}

        {/* Charts */}
        {!filter && stats && (
          <div className="charts">
            <div className="chart-card chart-card--line">
              <h3 className="chart-title">Employee Trends by Year</h3>
              {allYears.length > 0 ? (
                <Line data={lineData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { labels: { color: "#a0aec0" } } },
                  scales: {
                    x: { ticks: { color: "#a0aec0" }, grid: { color: "rgba(255,255,255,0.05)" } },
                    y: { ticks: { color: "#a0aec0", stepSize: 1 }, grid: { color: "rgba(255,255,255,0.05)" } },
                  },
                }} />
              ) : <div className="chart-empty">No data yet. Add employees to see trends.</div>}
            </div>
            <div className="chart-card chart-card--pie">
              <h3 className="chart-title">By Branch</h3>
              {pieData ? (
                <div style={{ position: "relative", width: "100%", height: "220px" }}>
                  <Pie data={pieData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom", labels: { color: "#a0aec0", padding: 12, boxWidth: 12 } },
                    },
                  }} />
                </div>
              ) : <div className="chart-empty">No branch data yet.</div>}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="table-card">
          <div className="table-wrapper">
            {loading ? (
              <div className="table-loading">Loading employees...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="table-empty">No employees found. <button className="link" onClick={openAdd}>Add one?</button></div>
            ) : (
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Position</th>
                    <th>Branch</th>
                    <th>Salary</th>
                    <th>Join Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td className="td-name">
                        <div className="avatar">{emp.first_name[0]}{emp.last_name[0]}</div>
                        <div>
                          <div className="td-fullname">{emp.first_name} {emp.last_name}</div>
                          <div className="td-phone">{emp.phone}</div>
                        </div>
                      </td>
                      <td>{emp.email}</td>
                      <td>{emp.position}</td>
                      <td>{emp.branch}</td>
                      <td className="td-salary">${Number(emp.salary).toLocaleString()}</td>
                      <td>{emp.join_date}</td>
                      <td>
                        <span className={`badge badge--${emp.status}`}>{emp.status}</span>
                      </td>
                      <td className="td-actions">
                        <button className="btn-icon btn-icon--edit" onClick={() => openEdit(emp)} title="Edit">✎</button>
                        <button className="btn-icon btn-icon--delete" onClick={() => setDeleteConfirm(emp)} title="Delete">⌫</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, accent, onClick, small }) {
  return (
    <div className={`stat-card ${small ? "stat-card--small" : ""}`} style={{ "--accent": accent }} onClick={onClick}>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__bar" />
    </div>
  );
}

function Field({ label, name, type = "text", value, onChange, error }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={error ? "input input--error" : "input"}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "any" : undefined}
      />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}