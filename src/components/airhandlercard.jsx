import React from "react";
import { SlArrowRight } from "react-icons/sl";
import { useNavigate } from "react-router-dom";

export default function AirHandlerCard({ name, subtitle, guid }) {
  const navigate = useNavigate();

  return (
    <div className="inventory-item" style={{ cursor: "pointer" }} onClick={() => navigate(`/airhandlers/${guid}`)}>
      <div>
        <h1 className="inventory-title">{name}</h1>
        <p className="inventory-subtitle">{subtitle}</p>
      </div>
      <SlArrowRight className="inventory-arrow" />
    </div>
  );
}

