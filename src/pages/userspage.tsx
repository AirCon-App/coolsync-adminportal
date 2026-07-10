import React, { useState } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { invalidateUsersCache } from "../hooks/useUsers";
import { useApiData } from "../hooks/useApiData";
import { getErrorMessage } from "../utils/apiError";
import { useAuth } from "../context/AuthContext";
import { Pagination } from "../components/Pagination";

interface AppUser { id: string; email: string; fullName?: string; role: string; buildingIds?: number[]; }
interface AppBuilding { buildingId: number; name: string; address?: string; }

const ROLES = ["User", "BuildingAdmin", "SuperAdmin"];
const ROLE_LABELS = { User: "Technician", BuildingAdmin: "Building Admin", SuperAdmin: "Super Admin" };
const PAGE_SIZE = 25;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [selectedBuildingId, setSelectedBuildingId] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AppUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  const { data: usersData, reload: fetchUsers } = useApiData<{ items: AppUser[]; totalCount: number }>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (selectedBuildingId !== "all") params.set("buildingId", selectedBuildingId);
      return api.get(`/Auth/users?${params}`).then((res) => res.data);
    },
    "Users failed to load.",
    { key: `${page}|${search}|${roleFilter}|${selectedBuildingId}`, debounceMs: 250 },
  );
  const users = usersData?.items ?? [];
  const totalCount = usersData?.totalCount ?? 0;

  const buildingsData = useApiData<{ items: AppBuilding[] }>(
    () => api.get("/Buildings").then((res) => res.data),
    "Buildings failed to load.",
  );
  const buildings = buildingsData.data?.items ?? [];

  const handleAdd = async (form) => {
    // Register takes a single buildingId for the legacy field; sync the rest after
    const { buildingIds, ...rest } = form;
    await api.post("/Auth/register", {
      ...rest,
      buildingId: buildingIds.length > 0 ? buildingIds[0] : null,
    });

    // Re-fetch all users to get the new user's id, then sync all selected buildings
    const res = await api.get("/Auth/users");
    const newUser = res.data.items.find((u) => u.email === form.email);
    if (newUser && buildingIds.length > 0) {
      await api.put(`/Auth/users/${newUser.id}/buildings/sync`, { buildingIds });
    }

    fetchUsers();
    invalidateUsersCache();
    setShowAddModal(false);
    // errors bubble up to UserFormModal's catch — do not swallow here
  };

  const handleEdit = async (form) => {
    if (!editingUser) return;
    const { buildingIds, ...rest } = form;

    // Update name/role
    await api.put(`/Auth/users/${editingUser.id}`, rest);

    // Sync building assignments atomically
    await api.put(`/Auth/users/${editingUser.id}/buildings/sync`, { buildingIds });

    fetchUsers();
    invalidateUsersCache();
    setEditingUser(null);
  };

  const handleOpenDelete = (user: AppUser) => {
    setDeletingUser(user);
    setReassignToId("");
    setDeleteError(null);
    api.get("/Auth/users").then((res) => setAllUsers(res.data.items)).catch(() => setAllUsers(users));
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    if (deletingUser.id === currentUser?.id) return;
    setDeleteError(null);
    try {
      await api.delete(`/Auth/users/${deletingUser.id}`, {
        data: { reassignToUserId: reassignToId || null },
      });
      fetchUsers();
      invalidateUsersCache();
      setDeletingUser(null);
      setReassignToId("");
    } catch (err) {
      setDeleteError(getErrorMessage(err));
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
            onChange={(e) => { setSelectedBuildingId(e.target.value); setPage(1); }}
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <div className="table-actions">
            <select
              className="table-filter-select"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
              ))}
            </select>
            <button className="inventory-button" onClick={() => setShowAddModal(true)}>
              <span>+</span> Add new user
            </button>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Buildings</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {search || roleFilter !== "all" || selectedBuildingId !== "all"
                      ? "No users match your filters."
                      : "No users yet."}
                  </td>
                </tr>
              )}
              {users.map((user) => {
                const userBuildings = (user.buildingIds ?? [])
                  .map((bid) => buildings.find((b) => b.buildingId === bid)?.name)
                  .filter(Boolean);
                return (
                  <tr key={user.id} className="data-table-row">
                    <td className="td-primary">{user.fullName || <span className="td-empty">—</span>}</td>
                    <td className="td-mono">{user.email}</td>
                    <td><span className="role-badge">{ROLE_LABELS[user.role] ?? user.role}</span></td>
                    <td>
                      {userBuildings.length > 0
                        ? userBuildings.join(", ")
                        : <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>All buildings</span>}
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
                          className="user-action-btn"
                          onClick={(e) => { e.stopPropagation(); setPasswordUser(user); }}
                          data-testid={`set-password-${user.id}`}
                        >
                          Password
                        </button>
                        <button
                          className="user-action-btn user-action-btn--danger"
                          onClick={(e) => { e.stopPropagation(); handleOpenDelete(user); }}
                          disabled={user.id === currentUser?.id}
                          title={user.id === currentUser?.id ? "You cannot remove your own account" : undefined}
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
        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
        <p className="table-count">{totalCount} user{totalCount !== 1 ? "s" : ""}</p>
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

      {passwordUser && (
        <SetPasswordModal
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
        />
      )}

      {deletingUser && (
        <div className="inventory-modal-backdrop" onClick={() => { setDeletingUser(null); setReassignToId(""); setDeleteError(null); setAllUsers([]); }}>
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
                {allUsers
                  .filter((u) => u.id !== deletingUser.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} ({ROLE_LABELS[u.role] ?? u.role})
                    </option>
                  ))}
              </select>
            </div>
            {deleteError && (
              <div className="alert alert--danger alert--inline" style={{ marginTop: "0.25rem" }}>
                {deleteError}
              </div>
            )}
            <div className="inventory-modal-actions">
              <button
                className="button inventory-modal-cancel"
                onClick={() => { setDeletingUser(null); setReassignToId(""); setDeleteError(null); setAllUsers([]); }}
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

function SetPasswordModal({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [temporary, setTemporary] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/Auth/users/${user.id}/password`, { newPassword, temporary });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-modal-backdrop" onClick={onClose}>
      <div
        className="inventory-modal-card"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Set password</h2>
        {done ? (
          <>
            <p>
              Password updated for{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {user.fullName || user.email}
              </span>
              .{" "}
              {temporary
                ? "They will be required to choose a new password the next time they sign in."
                : "They can sign in with it immediately."}
            </p>
            <div className="inventory-modal-actions">
              <button className="button" onClick={onClose} data-testid="set-password-done">
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Set a new password for{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {user.fullName || user.email}
              </span>
              .
            </p>
            <div>
              <label className="user-form-label">New password</label>
              <input
                className="inventory-modal-input"
                style={{ marginBottom: 0 }}
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                data-testid="set-password-input"
              />
            </div>
            <div>
              <label className="user-form-label">Confirm password</label>
              <input
                className="inventory-modal-input"
                style={{ marginBottom: 0 }}
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                data-testid="set-password-confirm"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
                <input
                  type="radio"
                  name="password-mode"
                  checked={temporary}
                  onChange={() => setTemporary(true)}
                  style={{ marginTop: "0.2rem" }}
                />
                <span>
                  <strong>Temporary</strong>
                  <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    User must choose a new password at next sign-in
                  </span>
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
                <input
                  type="radio"
                  name="password-mode"
                  checked={!temporary}
                  onChange={() => setTemporary(false)}
                  style={{ marginTop: "0.2rem" }}
                />
                <span>
                  <strong>Permanent</strong>
                  <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    User keeps this password until they change it themselves
                  </span>
                </span>
              </label>
            </div>
            {error && (
              <div className="alert alert--danger alert--inline">
                {error}
              </div>
            )}
            <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="button inventory-modal-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={saving} data-testid="set-password-save">
                {saving ? "Saving…" : "Set Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function UserFormModal({ title, initial = {} as any, buildings = [] as AppBuilding[], onSave, onClose, showPassword = false }) {
  const [form, setForm] = useState({
    fullName: initial.fullName || "",
    email: initial.email || "",
    password: "",
    role: initial.role || "User",
    buildingIds: initial.buildingIds ?? [],
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleBuilding = (bid) => {
    setForm((prev) => {
      const ids = prev.buildingIds.includes(bid)
        ? prev.buildingIds.filter((id) => id !== bid)
        : [...prev.buildingIds, bid];
      return { ...prev, buildingIds: ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(getErrorMessage(err));
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
                  {ROLE_LABELS[r] ?? r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="user-form-label">
              Building access
              <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.4rem", fontSize: "0.8rem" }}>
                (leave empty for all buildings)
              </span>
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                maxHeight: 160,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "0.5rem 0.75rem",
                background: "var(--input-bg, var(--bg-secondary))",
              }}
            >
              {buildings.length === 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No buildings available</span>
              )}
              {buildings.map((b) => (
                <label
                  key={b.buildingId}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  <input
                    type="checkbox"
                    checked={form.buildingIds.includes(b.buildingId)}
                    onChange={() => toggleBuilding(b.buildingId)}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
          {error && (
            <div className="alert alert--danger alert--inline">
              {error}
            </div>
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
