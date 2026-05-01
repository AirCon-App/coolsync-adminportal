import React, { useState, useEffect, useMemo } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";

const ROLES = ["User", "BuildingAdmin", "SuperAdmin"];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [reassignToId, setReassignToId] = useState("");
  const [deleteError, setDeleteError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortKey, setSortKey] = useState("fullName");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    api.get("/Auth/users").then((res) => setUsers(res.data));
    api.get("/Buildings").then((res) => setBuildings(res.data));
  }, []);

  const handleAdd = async (form) => {
    await api.post("/Auth/register", form);
    const res = await api.get("/Auth/users");
    setUsers(res.data);
    setShowAddModal(false);
  };

  const handleEdit = async (form) => {
    const res = await api.put(`/Auth/users/${editingUser.id}`, form);
    const updated = res.data;

    // If building changed, also call the building assignment endpoint
    if (form.buildingId !== editingUser.buildingId) {
      const buildingRes = await api.put(`/Auth/users/${editingUser.id}/building`, {
        buildingId: form.buildingId ?? null,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? buildingRes.data : u))
      );
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? updated : u))
      );
    }
    setEditingUser(null);
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = users;

    // Building filter: show users assigned to this building, plus SuperAdmins (null buildingId)
    if (selectedBuildingId !== "all") {
      const bid = Number(selectedBuildingId);
      rows = rows.filter((u) => u.buildingId === bid || u.buildingId === null);
    }

    if (q) {
      rows = rows.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") {
      rows = rows.filter((u) => u.role === roleFilter);
    }
    return [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? "").toLowerCase();
      const bv = (b[sortKey] ?? "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [users, selectedBuildingId, search, roleFilter, sortKey, sortDir]);

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDir === "asc" ? "↑" : "↓"}</span>;
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

  const selectedBuilding = buildings.find((b) => b.buildingId === Number(selectedBuildingId));

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 900 }}>
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
          Invite new users to CoolSync or remove existing access. Filter by building to manage access per location.
        </p>

        {/* Building selector */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label className="user-form-label" style={{ display: "block", marginBottom: "0.4rem" }}>
            Filter by building
          </label>
          <select
            className="table-filter-select"
            style={{ minWidth: 240 }}
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
          >
            <option value="all">All buildings</option>
            {buildings.map((b) => (
              <option key={b.buildingId} value={b.buildingId}>
                {b.name}
              </option>
            ))}
          </select>
          {selectedBuildingId !== "all" && selectedBuilding && (
            <span style={{ marginLeft: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {selectedBuilding.address}
            </span>
          )}
        </div>

        <div className="table-toolbar">
          <input
            className="table-search"
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="table-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button className="inventory-button" onClick={() => setShowAddModal(true)}>
            <span>+</span> Add new user
          </button>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("fullName")}>Name <SortIcon col="fullName" /></th>
                <th onClick={() => handleSort("email")}>Email <SortIcon col="email" /></th>
                <th onClick={() => handleSort("role")}>Role <SortIcon col="role" /></th>
                <th>Building</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {search || roleFilter !== "all" || selectedBuildingId !== "all"
                      ? "No users match your filters."
                      : "No users yet."}
                  </td>
                </tr>
              )}
              {filtered.map((user) => {
                const building = buildings.find((b) => b.buildingId === user.buildingId);
                return (
                  <tr key={user.id} className="data-table-row">
                    <td className="td-primary">{user.fullName || <span className="td-empty">—</span>}</td>
                    <td className="td-mono">{user.email}</td>
                    <td><span className="role-badge">{user.role}</span></td>
                    <td>
                      {building
                        ? building.name
                        : user.buildingId === null
                        ? <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>All buildings</span>
                        : <span className="td-empty">—</span>}
                    </td>
                    <td>
                      <div className="user-row-actions">
                        <button
                          className="user-action-btn"
                          onClick={(e) => { e.stopPropagation(); setEditingUser(user); }}
                        >
                          Edit
                        </button>
                        <button
                          className="user-action-btn user-action-btn--danger"
                          onClick={(e) => { e.stopPropagation(); setDeletingUser(user); }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="table-count">{filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}</p>
      </div>

      {showAddModal && (
        <UserFormModal
          title="Add new user"
          buildings={buildings}
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
          showPassword
        />
      )}

      {editingUser && (
        <UserFormModal
          title="Edit user"
          initial={editingUser}
          buildings={buildings}
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

function UserFormModal({ title, initial = {}, buildings = [], onSave, onClose, showPassword }) {
  const [form, setForm] = useState({
    fullName: initial.fullName || "",
    email: initial.email || "",
    password: "",
    role: initial.role || "User",
    buildingId: initial.buildingId ?? "",
  });
  const [error, setError] = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        ...form,
        buildingId: form.buildingId !== "" ? Number(form.buildingId) : null,
      };
      await onSave(payload);
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
          <div>
            <label className="user-form-label">Building access</label>
            <select
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              name="buildingId"
              value={form.buildingId}
              onChange={handleChange}
            >
              <option value="">All buildings (SuperAdmin)</option>
              {buildings.map((b) => (
                <option key={b.buildingId} value={b.buildingId}>
                  {b.name}
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
