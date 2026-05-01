import React, { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";

const ROLES = ["User", "BuildingAdmin", "SuperAdmin"];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [reassignToId, setReassignToId] = useState("");
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.get("/Auth/users").then((res) => setUsers(res.data));
  }, []);

  const handleAdd = async (form) => {
    await api.post("/Auth/register", form);
    const res = await api.get("/Auth/users");
    setUsers(res.data);
    setShowAddModal(false);
  };

  const handleEdit = async (form) => {
    const res = await api.put(`/Auth/users/${editingUser.id}`, form);
    setUsers((prev) =>
      prev.map((u) => (u.id === editingUser.id ? res.data : u))
    );
    setEditingUser(null);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await api.delete(`/Auth/users/${deletingUser.id}`, {
        data: { reassignToUserId: reassignToId || null },
      });
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      setDeletingUser(null);
      setReassignToId("");
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Failed to remove user.");
    }
  };

  return (
    <PageShell>
      <div className="inventory-container">
          <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
            Manage team users
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: 0,
              marginBottom: "1.5rem",
              fontSize: "0.95rem",
            }}
          >
            Invite new users to CoolSync or remove existing access.
          </p>
          <button
            className="inventory-button"
            onClick={() => setShowAddModal(true)}
          >
            <span>+</span> Add new user
          </button>
          <div className="inventory-list" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {users.map((user) => (
              <div className="inventory-item" key={user.id}>
                <div>
                  <h1 className="inventory-title">
                    {user.fullName || user.email}
                  </h1>
                  <p className="inventory-subtitle">{user.email}</p>
                  <p className="inventory-subtitle" style={{ marginTop: "0.2rem" }}>
                    Role: {user.role}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button
                    className="user-action-btn"
                    onClick={() => setEditingUser(user)}
                  >
                    Edit
                  </button>
                  <button
                    className="user-action-btn user-action-btn--danger"
                    onClick={() => setDeletingUser(user)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      {showAddModal && (
        <UserFormModal
          title="Add new user"
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
          showPassword
        />
      )}

      {editingUser && (
        <UserFormModal
          title="Edit user"
          initial={editingUser}
          onSave={handleEdit}
          onClose={() => setEditingUser(null)}
        />
      )}

      {deletingUser && (
        <div className="inventory-modal-backdrop" onClick={() => { setDeletingUser(null); setReassignToId(""); setDeleteError(null); }}>
          <div
            className="inventory-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Remove user</h2>
            <p>
              Are you sure you want to remove{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {deletingUser.fullName || deletingUser.email}
              </span>
              ? This cannot be undone.
            </p>
            <div>
              <label className="user-form-label">
                Reassign work orders to (required if user has open work orders)
              </label>
              <select
                className="inventory-modal-input"
                value={reassignToId}
                onChange={(e) => setReassignToId(e.target.value)}
              >
                <option value="">— No reassignment —</option>
                {users
                  .filter((u) => u.id !== deletingUser.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
            {deleteError && (
              <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                {deleteError}
              </p>
            )}
            <div className="inventory-modal-actions">
              <button
                className="button inventory-modal-cancel"
                onClick={() => { setDeletingUser(null); setReassignToId(""); setDeleteError(null); }}
              >
                Cancel
              </button>
              <button
                className="button"
                style={{ background: "var(--danger)" }}
                onClick={handleDelete}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function UserFormModal({ title, initial = {}, onSave, onClose, showPassword }) {
  const [form, setForm] = useState({
    fullName: initial.fullName || "",
    email: initial.email || "",
    password: "",
    role: initial.role || "User",
  });
  const [error, setError] = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="inventory-modal-backdrop" onClick={onClose}>
      <div
        className="inventory-modal-card"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label className="user-form-label">Full name</label>
            <input
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              name="fullName"
              placeholder="Jane Smith"
              value={form.fullName}
              onChange={handleChange}
            />
          </div>
          {showPassword && (
            <>
              <div>
                <label className="user-form-label">Email</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="email"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="user-form-label">Password</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}
          <div>
            <label className="user-form-label">Role</label>
            <select
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
              {error}
            </p>
          )}
          <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
            <button type="button" className="button inventory-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
