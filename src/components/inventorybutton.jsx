import React, { useState } from "react";
import { SlArrowRight } from "react-icons/sl";

export default function inventorybutton(props) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(props.quantity ?? 0);

  const handleOpen = () => {
    setIsEditing(true);
  };

  const handleClose = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    // In the future you can call an API or parent callback here.
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const value = Number(e.target.value);
    if (Number.isNaN(value)) return;
    setQuantity(value);
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
              <span style={{ fontWeight: 500, color: "#e5e7eb" }}>
                {props.title}
              </span>
              <br />
              <span style={{ color: "#9ca3af" }}>
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
