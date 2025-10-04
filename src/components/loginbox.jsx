import React from "react";
import { Link } from "react-router-dom";

export default function LoginBox() {
  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">CoolSync Admin Management</h1>
        <p className="login-text">Username</p>
        <input className="login-input" type="text" placeholder="Username" />
        <p className="login-text">Password</p>
        <input className="login-input" type="text" placeholder="Password" />
        <Link to="/">
          <button className="button" type="submit">
            Submit
          </button>
        </Link>
      </div>
    </div>
  );
}
