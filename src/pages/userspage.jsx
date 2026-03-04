import React from "react";
import Navbar from "../components/navbar";

export default function UsersPage() {
  return (
    <>
      <Navbar />
      <div className="body-container">
        <div className="inventory-container">
          <h1 style={{ color: "#e5e7eb", marginBottom: "0.75rem" }}>
            Manage team users
          </h1>
          <p
            style={{
              color: "#9ca3af",
              marginTop: 0,
              marginBottom: "1.5rem",
              fontSize: "0.95rem",
            }}
          >
            Invite new users to CoolSync or remove existing access.
          </p>
          <button className="inventory-button">
            <span>+</span> Add new user
          </button>
          <div className="inventory-list">
            <div className="inventory-item">
              <div>
                <h1 className="inventory-title">Add a user</h1>
                <p className="inventory-subtitle">
                  Create a new account and assign the right role.
                </p>
              </div>
            </div>
            <div className="inventory-item">
              <div>
                <h1 className="inventory-title">Remove a user</h1>
                <p className="inventory-subtitle">
                  Safely revoke access when someone leaves your team.
                </p>
              </div>
            </div>
            <div className="inventory-item">
              <div>
                <h1 className="inventory-title">Edit user roles</h1>
                <p className="inventory-subtitle">
                  Promote, demote, or fine-tune user permissions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
