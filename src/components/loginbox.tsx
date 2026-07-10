import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../data/api";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/apiError";
import CoolSyncLogo from "./CoolSyncLogo";

interface LoginResponse {
  token?: string;
  requiresPasswordChange?: boolean;
}

export default function LoginBox() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Set when the account has a temporary password: the user must choose a new
  // password (verified against the current one) before a session is issued.
  const [mustChange, setMustChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post<LoginResponse>("Auth/login", {
        email: username,
        password,
      });

      if (response.data?.requiresPasswordChange) {
        setMustChange(true);
        setCurrentPassword("");
        return;
      }

      const token = response.data?.token;
      if (!token) {
        setError("Invalid username or password");
        return;
      }

      login(token);
      navigate("/home");
    } catch {
      setError("Invalid username or password");
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await api.post<{ token?: string }>("Auth/change-password", {
        email: username,
        currentPassword,
        newPassword,
      });

      const token = response.data?.token;
      if (!token) {
        setError("Something went wrong. Please try again.");
        return;
      }

      login(token);
      navigate("/home");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem", gap: "0.75rem" }}>
          <CoolSyncLogo size={56} />
          <h1 className="login-title">CoolSync</h1>
        </div>

        {mustChange ? (
          <>
            <p className="login-text" style={{ marginBottom: "0.5rem" }}>
              Your password is temporary. Enter it once more, then choose a new password to continue.
            </p>
            <form onSubmit={handleChangePassword}>
              <p className="login-text">Current Password</p>
              <input
                className="login-input"
                type="password"
                placeholder="Temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoFocus
                data-testid="current-password-input"
              />
              <p className="login-text">New Password</p>
              <input
                className="login-input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                data-testid="new-password-input"
              />
              <p className="login-text">Confirm Password</p>
              <input
                className="login-input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                data-testid="confirm-password-input"
              />
              {error && <p className="auth-error" data-testid="change-password-error">{error}</p>}
              <button className="button" type="submit" data-testid="change-password-button">
                Set New Password
              </button>
            </form>
          </>
        ) : (
          <>
            <form onSubmit={handleLogin}>
              <p className="login-text">Username</p>
              <input
                className="login-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid="email-input"
              />
              <p className="login-text">Password</p>
              <input
                className="login-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
              />
              {error && <p className="auth-error" data-testid="login-error">{error}</p>}
              <button className="button" type="submit" data-testid="login-button">
                Submit
              </button>
            </form>
            <Link to="/forgot-password" className="auth-link" data-testid="forgot-password-link">
              Forgot your password?
            </Link>
          </>
        )}
      </div>
      <p className="login-footer">Powered by NJ Filters © 2025</p>
    </div>
  );
}
