import React, { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import AirHandlerCard from "../components/airhandlercard";
import api from "../data/api";

const EMPTY_FORM = {
  name: "",
  description: "",
  filtersName: "",
  quantity: "",
  scheduleChangeInterval: "",
  sku: "",
};

export default function AirHandlersPage() {
  const [data, setData] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    api.get("/AirHandlers?buildingId=1").then((res) => setData(res.data));
  }, []);

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setAddError(null);
    setShowAddModal(true);
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError(null);
    try {
      await api.post("/AirHandlers", {
        name: form.name,
        description: form.description,
        buildingId: 1,
        filtersName: form.filtersName || null,
        quantity: form.quantity !== "" ? Number(form.quantity) : null,
        scheduleChangeInterval: form.scheduleChangeInterval || null,
        sku: form.sku || null,
      });
      const res = await api.get("/AirHandlers?buildingId=1");
      setData(res.data);
      setShowAddModal(false);
    } catch (err) {
      setAddError(err.response?.data || "Failed to add air handler.");
    }
  };

  return (
    <PageShell>
      <div className="inventory-container">
          <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
            Manage your air handlers
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: 0,
              marginBottom: "1.5rem",
              fontSize: "0.95rem",
            }}
          >
            View and manage all air handlers for this tenant.
          </p>
          <button className="inventory-button" onClick={handleOpenAdd}>
            <span>+</span> Add air handler
          </button>
          <div className="inventory-list">
            {data.map((ah) => (
              <AirHandlerCard
                key={ah.id}
                guid={ah.airHandlerGuid}
                name={ah.name}
                subtitle={ah.description}
              />
            ))}
          </div>
        </div>

      {showAddModal && (
        <div
          className="inventory-modal-backdrop"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="inventory-modal-card"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Add air handler</h2>
            <form
              onSubmit={handleAdd}
              style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
            >
              <div>
                <label className="user-form-label">Name *</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="name"
                  placeholder="AHU-01"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="user-form-label">Description</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="description"
                  placeholder="Main lobby unit"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="user-form-label">Filters name</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="filtersName"
                  placeholder="MERV-13"
                  value={form.filtersName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="user-form-label">Quantity</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.quantity}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="user-form-label">Schedule change interval</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="scheduleChangeInterval"
                  placeholder="90 days"
                  value={form.scheduleChangeInterval}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="user-form-label">SKU</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="sku"
                  placeholder="FLT-0042"
                  value={form.sku}
                  onChange={handleChange}
                />
              </div>
              {addError && (
                <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
                  {typeof addError === "string" ? addError : "Failed to add air handler."}
                </p>
              )}
              <div
                className="inventory-modal-actions"
                style={{ marginTop: "0.5rem" }}
              >
                <button
                  type="button"
                  className="button inventory-modal-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
