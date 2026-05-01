import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import LoginPage from "./pages/loginpage";
import HomePage from "./pages/homepage";
import UserPage from "./pages/userpage";
import InventoryPage from "./pages/inventorypage";
import UsersPage from "./pages/userspage";
import AirHandlersPage from "./pages/airhandlers";
import AirHandlerDetailPage from "./pages/airhandlerdetail";
import ReportingPage from "./pages/ReportingPage";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/usermanagement" element={<UserPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/airhandlers" element={<AirHandlersPage />} />
          <Route path="/airhandlers/:guid" element={<AirHandlerDetailPage />} />
          <Route path="/reports" element={<ReportingPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
