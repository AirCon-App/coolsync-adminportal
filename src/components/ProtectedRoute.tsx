import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReactNode } from "react";

const ROLE_RANK: Record<string, number> = {
  User: 0,
  BuildingAdmin: 1,
  SuperAdmin: 2,
};

function meetsRole(userRole: string, required: string): boolean {
  return (ROLE_RANK[userRole] ?? -1) >= (ROLE_RANK[required] ?? 0);
}

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: string;
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { token, user } = useAuth();

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (requireRole && !meetsRole(user.role, requireRole)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
