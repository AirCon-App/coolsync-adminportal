import React from "react";
import Navbar from "../components/navbar";
import AirHandlerCard from "../components/airhandlercard";
import { useState, useEffect } from "react";
import api from "../data/api";

export default function AirHandlersPage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/AirHandlers?buildingId=1").then((response) => {
      setData(response.data);
    });
  }, []);

  console.log(data);

  const airHandlers = data.map((airHandler) => {
    return {
      id: airHandler.id,
      name: airHandler.name,
      subtitle: airHandler.subtitle,
    };
  });
  return (
    <>
      <Navbar />
      <div className="body-container">
        <div className="inventory-container">
          <h1 style={{ color: "#e5e7eb", marginBottom: "0.75rem" }}>
            Manage your air handlers
          </h1>
          <p
            style={{
              color: "#9ca3af",
              marginTop: 0,
              marginBottom: "1.5rem",
              fontSize: "0.95rem",
            }}
          >
            View and manage all air handlers for this tenant.
          </p>
          <button className="inventory-button">
            <span>+</span> Add air handler
          </button>
          <div className="inventory-list">
            {airHandlers.map((ah) => (
              <AirHandlerCard
                key={ah.id}
                name={ah.name}
                subtitle={ah.subtitle}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
