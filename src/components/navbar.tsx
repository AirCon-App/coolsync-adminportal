import { Link } from "react-router-dom";
import logo from "../assets/coolsync white no text.png";

export default function Navbar() {
  return (
    <div className="navbar-container">
      <div className="navbar-content">
        <Link to="/home" className="navbar-logo">
          <img src={logo} alt="CoolSync" />
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
            <li>
              <Link to="/reports">Reporting</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
