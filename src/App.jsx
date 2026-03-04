import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/loginpage";
import HomePage from "./pages/homepage";
import UserPage from "./pages/userpage";
import InventoryPage from "./pages/inventorypage";
import UsersPage from "./pages/userspage";
import AirHandlersPage from "./pages/airhandlers";

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/usermanagement" element={<UserPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/airhandlers" element={<AirHandlersPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
