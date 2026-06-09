import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../data/api";
import { useAuth } from "../context/AuthContext";
import CoolSyncLogo from "./CoolSyncLogo";

export default function LoginBox() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post<{ token?: string }>("Auth/login", {
        email: username,
        password,
      });

      const token = response.data?.token;
      if (token) {
        login(token);
      }

      navigate("/home");
    } catch {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem", gap: "0.75rem" }}>
          <CoolSyncLogo size={56} />
          <h1 className="login-title">CoolSync</h1>
        </div>
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
          {error && <p className="error" data-testid="login-error">{error}</p>}
          <button className="button" type="submit" data-testid="login-button">
            Submit
          </button>
        </form>
      </div>
      <p className="login-footer">Powered by NJ Filters © 2025</p>
    </div>
  );
}
