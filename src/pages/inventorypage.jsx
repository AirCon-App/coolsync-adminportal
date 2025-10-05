import Navbar from "../components/navbar";
import InventoryButton from "../components/inventorybutton";

export default function InventoryPage() {
  return (
    <>
      <Navbar />
      <div className="body-container">
        <div className="inventory-container">
          <button className="inventory-button">
            <span>+</span> Add Inventory Item
          </button>
          <div className="inventory-list">
            <InventoryButton title={"Air Filter 1"}quantity={3}/>
            <InventoryButton title={"Air Filter 2"}quantity={5}/>
            <InventoryButton title={"Air Filter 3"}quantity={10}/>
            <InventoryButton title={"Air Filter 4"}quantity={12}/>
          </div>
        </div>
      </div>
    </>
  );
}
