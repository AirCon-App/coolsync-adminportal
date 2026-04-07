import Navbar from "../components/navbar";
import InventoryButton from "../components/inventorybutton";
import { useState, useEffect } from "react";
import api from "../data/api";

export default function InventoryPage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/Inventory?buildingId=1").then((response) => {
      setData(response.data);
    });
  }, []);

  console.log(data);

  const inventoryItems = data.map((inventoryItem) => (
    <InventoryButton
      key={inventoryItem.id}
      title={inventoryItem.catalogItem.name}
      quantity={inventoryItem.quantity}
    />
  ));
  return (
    <>
      <Navbar />
      <div className="body-container">
        <div className="inventory-container">
          <button className="inventory-button">
            <span>+</span> Add Inventory Item
          </button>
          <div className="inventory-list">{inventoryItems}</div>
        </div>
      </div>
    </>
  );
}
