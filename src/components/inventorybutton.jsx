import React, { useState } from "react";
import { SlArrowRight } from "react-icons/sl";
import api from "../data/api";

export default function InventoryButton(props) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(props.quantity ?? 0);

  const handleOpen = () => setIsEditing(true);
  const handleClose = () => setIsEditing(false);

  const handleSave = async () => {
    try {
      // Send all required fields to backend
      await api.put(`/Inventory/${props.itemNumber}`, {
        itemNumber: props.itemNumber,
        catalogItemId: props.catalogItemId,
        buildingId: props.buildingId,
        quantity: quantity,
      });

      // Update parent state
      if (props.onQuantityUpdate) {
        props.onQuantityUpdate(props.itemNumber, quantity);
      }

      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update inventory:", err);
    }
  };

  const handleChange = (e) => {
    const value = Number(e.target.value);
    if (!Number.isNaN(value)) setQuantity(value);
  };

  return (
    <>
      <div className="inventory-item" onClick={handleOpen}>
        <div>
          <h1 className="inventory-title">{props.title}</h1>
          <p className="inventory-subtitle">Quantity in Stock: {quantity}</p>
        </div>
        <SlArrowRight className="inventory-arrow" />
      </div>

      {isEditing && (
        <div className="inventory-modal-backdrop" onClick={handleClose}>
          <div
            className="inventory-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Update quantity</h2>
            <p>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                {props.title}
              </span>
              <br />
              <span style={{ color: "var(--text-secondary)" }}>
                Adjust the quantity for this inventory item.
              </span>
            </p>
            <input
              type="number"
              min="0"
              className="inventory-modal-input"
              value={quantity}
              onChange={handleChange}
            />
            <div className="inventory-modal-actions">
              <button
                type="button"
                className="button inventory-modal-cancel"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button type="button" className="button" onClick={handleSave}>
                Save quantity
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
