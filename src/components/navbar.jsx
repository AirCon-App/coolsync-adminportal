import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div className="navbar-container">
      <div className="navbar-content">
        <Link to="/">
          <img
            src="src/assets/coolsync white no text.png"
            width="10%"
            height="100%"
          />
        </Link>
        <h2 className="navbar-tenant">Caesar's Superdome</h2>
        <div className="list-content">
          <ul className="navbar-list">
            <li>
              <Link to="/airhandlers">Air Handlers</Link>
            </li>
            <li>
              <Link to="/inventory">Inventory</Link>
            </li>
            <li>
              <Link to="/users">Users</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
