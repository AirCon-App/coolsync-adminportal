import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../data/api";
import CoolSyncLogo from "./CoolSyncLogo";
import { useAuth } from "../context/AuthContext";

export default function LoginBox() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("Auth/login", {
        email: username,
        password,
      });

      const token = response.data?.token;
      if (token) {
        login(token);
      }

      navigate("/home");
    } catch (err) {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <CoolSyncLogo size={48} />
        </div>
        <h1 className="login-title">CoolSync</h1>
        <form onSubmit={handleLogin}>
          <p className="login-text">Username</p>
          <input
            className="login-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <p className="login-text">Password</p>
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button className="button" type="submit">
            Submit
          </button>
        </form>
      </div>
      <p className="login-footer">Powered by NJ Filters © 2025</p>
    </div>
  );
}
