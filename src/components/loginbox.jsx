import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../data/api";

export default function LoginBox() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // ✅ prevent page reload
    setError("");

    try {
      const response = await api.post("Auth/login", {
        email: username,
        password,
      });

      // Optional: store token
      const token = response.data?.token;
      if (token) {
        localStorage.setItem("token", token);
      }

      // ✅ Navigate to homepage
      navigate("/home");
    } catch (err) {
      console.log(err);
      console.log("ERROR RESPONSE:", err.response?.data);
      setError("Invalid username or password");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">CoolSync Admin Management</h1>
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
