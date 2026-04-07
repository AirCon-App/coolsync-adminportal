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
  }, [data]);

  // Callback to update quantity in parent state
  const updateQuantity = (itemNumber, newQuantity) => {
    setData((prevData) =>
      prevData.map((item) =>
        item.itemNumber === itemNumber
          ? { ...item, quantity: newQuantity }
          : item,
      ),
    );
  };

  return (
    <>
      <Navbar />
      <div className="body-container">
        <div className="inventory-container">
          <button className="inventory-button">
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
                onQuantityUpdate={updateQuantity} // pass callback
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
