import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar";
import InventoryButton from "../components/inventorybutton";
import api from "../data/api";

export default function InventoryPage() {
  const [data, setData] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [form, setForm] = useState({ catalogItemId: "", quantity: 1 });
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    api.get("/Inventory?buildingId=1").then((res) => setData(res.data));
  }, []);

  const handleOpenAdd = () => {
    setAddError(null);
    setForm({ catalogItemId: "", quantity: 1 });
    if (catalogItems.length === 0) {
      api.get("/ItemCatalog").then((res) => setCatalogItems(res.data));
    }
    setShowAddModal(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError(null);
    try {
      await api.post("/Inventory", {
        catalogItemId: Number(form.catalogItemId),
        buildingId: 1,
        quantity: Number(form.quantity),
      });
      const res = await api.get("/Inventory?buildingId=1");
      setData(res.data);
      setShowAddModal(false);
    } catch (err) {
      setAddError(err.response?.data || "Failed to add inventory item.");
    }
  };

  const updateQuantity = (itemNumber, newQuantity) => {
    setData((prev) =>
      prev.map((item) =>
        item.itemNumber === itemNumber ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  return (
    <>
      <Navbar />
      <div className="body-container">
        <div className="inventory-container">
          <h1 style={{ color: "#e5e7eb", marginBottom: "0.75rem" }}>
            Manage inventory
          </h1>
          <p
            style={{
              color: "#9ca3af",
              marginTop: 0,
              marginBottom: "1.5rem",
              fontSize: "0.95rem",
            }}
          >
            View and manage inventory items for this building.
          </p>
          <button className="inventory-button" onClick={handleOpenAdd}>
            <span>+</span> Add Inventory Item
          </button>
          <div className="inventory-list">
            {data.map((inventoryItem) => (
              <InventoryButton
                key={inventoryItem.itemNumber}
                title={inventoryItem.catalogItem.name}
                quantity={inventoryItem.quantity}
                itemNumber={inventoryItem.itemNumber}
                catalogItemId={inventoryItem.catalogItemId}
                buildingId={inventoryItem.buildingId}
                onQuantityUpdate={updateQuantity}
              />
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="inventory-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="inventory-modal-card"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Add inventory item</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label className="user-form-label">Catalog item</label>
                <select
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  value={form.catalogItemId}
                  onChange={(e) => setForm((p) => ({ ...p, catalogItemId: e.target.value }))}
                  required
                >
                  <option value="">— Select an item —</option>
                  {catalogItems.map((c) => (
                    <option key={c.catalogItemId} value={c.catalogItemId}>
                      {c.name} {c.sku ? `(${c.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="user-form-label">Quantity</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                  required
                />
              </div>
              {addError && (
                <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>
                  {typeof addError === "string" ? addError : "Failed to add item."}
                </p>
              )}
              <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="button inventory-modal-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button">
                  Add item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
