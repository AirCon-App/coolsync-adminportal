import React from "react";
import { SlArrowRight } from "react-icons/sl";

export default function AirHandlerCard({ name, subtitle }) {
  return (
    <div className="inventory-item">
      <div>
        <h1 className="inventory-title">{name}</h1>
        <p className="inventory-subtitle">{subtitle}</p>
      </div>
      <SlArrowRight className="inventory-arrow" />
    </div>
  );
}

