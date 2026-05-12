import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { BuildingProvider } from "./context/BuildingContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/loginpage";
import HomePage from "./pages/homepage";
import UserPage from "./pages/userpage";
import InventoryPage from "./pages/inventorypage";
import UsersPage from "./pages/userspage";
import AirHandlersPage from "./pages/airhandlers";
import AirHandlerDetailPage from "./pages/airhandlerdetail";
import ReportingPage from "./pages/ReportingPage";
import BuildingsPage from "./pages/BuildingsPage";
import AreasPage from "./pages/AreasPage";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BuildingProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/usermanagement" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
              <Route path="/airhandlers" element={<ProtectedRoute><AirHandlersPage /></ProtectedRoute>} />
              <Route path="/airhandlers/:guid" element={<ProtectedRoute><AirHandlerDetailPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportingPage /></ProtectedRoute>} />
              <Route path="/buildings" element={<ProtectedRoute requireRole="SuperAdmin"><BuildingsPage /></ProtectedRoute>} />
              <Route path="/areas" element={<ProtectedRoute><AreasPage /></ProtectedRoute>} />
            </Routes>
          </Router>
        </BuildingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
