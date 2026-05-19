import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: string;
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { token, user } = useAuth();

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
