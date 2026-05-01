import React from "react";
import Sidebar from "./sidebar";

export default function PageShell({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="page-content">{children}</main>
    </div>
  );
}
