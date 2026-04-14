import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlArrowLeft } from "react-icons/sl";
import Navbar from "../components/navbar";
import api from "../data/api";

export default function AirHandlerDetailPage() {
  const { guid } = useParams();
  const navigate = useNavigate();
  const [handler, setHandler] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/AirHandlers/${guid}`)
      .then((res) => setHandler(res.data))
      .finally(() => setLoading(false));
  }, [guid]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="body-container" style={{ justifyContent: "center", alignItems: "center" }}>
          <p style={{ color: "#9ca3af" }}>Loading...</p>
        </div>
      </>
    );
  }

  if (!handler) {
    return (
      <>
        <Navbar />
        <div className="body-container" style={{ justifyContent: "center", alignItems: "center" }}>
          <p style={{ color: "#ef4444" }}>Air handler not found.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="body-container">
        <div className="inventory-container">
          <button
            onClick={() => navigate("/airhandlers")}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.9rem",
              padding: 0,
              marginBottom: "1rem",
              fontFamily: "inherit",
            }}
          >
            <SlArrowLeft /> Back to air handlers
          </button>

          <h1 style={{ color: "#e5e7eb", marginBottom: "0.25rem" }}>{handler.name}</h1>
          {handler.description && (
            <p style={{ color: "#9ca3af", marginTop: 0, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              {handler.description}
            </p>
          )}

          <div className="inventory-list" style={{ marginBottom: "2rem" }}>
            {handler.filtersName && (
              <div className="inventory-item">
                <div>
                  <p className="inventory-subtitle">Filters</p>
                  <h1 className="inventory-title">{handler.filtersName}</h1>
                </div>
              </div>
            )}
            {handler.quantity != null && (
              <div className="inventory-item">
                <div>
                  <p className="inventory-subtitle">Quantity</p>
                  <h1 className="inventory-title">{handler.quantity}</h1>
                </div>
              </div>
            )}
            {handler.scheduleChangeInterval && (
              <div className="inventory-item">
                <div>
                  <p className="inventory-subtitle">Change interval</p>
                  <h1 className="inventory-title">{handler.scheduleChangeInterval}</h1>
                </div>
              </div>
            )}
            {handler.sku && (
              <div className="inventory-item">
                <div>
                  <p className="inventory-subtitle">SKU</p>
                  <h1 className="inventory-title">{handler.sku}</h1>
                </div>
              </div>
            )}
          </div>

          <h2 style={{ color: "#e5e7eb", marginBottom: "1rem" }}>Work orders</h2>
          {handler.workOrders?.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>No work orders for this air handler.</p>
          ) : (
            <div className="inventory-list">
              {handler.workOrders?.map((wo) => (
                <div className="inventory-item" key={wo.id}>
                  <div>
                    <h1 className="inventory-title">Work Order #{wo.id}</h1>
                    <p className="inventory-subtitle">Count: {wo.count}</p>
                    {wo.dueDate && (
                      <p className="inventory-subtitle">
                        Due: {new Date(wo.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    {wo.completedDate && (
                      <p className="inventory-subtitle">
                        Completed: {new Date(wo.completedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
