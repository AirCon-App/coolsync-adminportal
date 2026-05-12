import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requireRole }) {
  const { token, user } = useAuth();

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
