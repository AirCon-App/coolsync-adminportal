import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { User, AuthContextValue } from "../types";
import { invalidateUsersCache } from "../hooks/useUsers";

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  fullName?: string;
  isSuperAdmin?: string;
  buildingId?: string | string[];
  exp?: number;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwt(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    // JWTs are base64URL-encoded; atob() only accepts standard base64 and throws
    // (InvalidCharacterError) on the URL-safe characters "-" and "_". Convert and
    // pad before decoding, then read the bytes as UTF-8 so non-ASCII claim values
    // (e.g. accented names) survive. Raw atob() silently broke login for any user
    // whose token payload contained "-" or "_".
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractUser(payload: JwtPayload): User {
  return {
    id: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? payload.sub ?? "",
    email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ?? payload.email ?? "",
    role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? payload.role ?? "",
    fullName: payload.fullName ?? "",
    isSuperAdmin: payload.isSuperAdmin === "true",
    buildingIds: [payload.buildingId].flat().filter(Boolean).map(Number),
  };
}

function getStoredAuth(): { token: string | null; user: User | null } {
  const token = localStorage.getItem("token");
  if (!token) return { token: null, user: null };
  const payload = parseJwt(token);
  if (!payload) return { token: null, user: null };
  const exp = payload.exp ? payload.exp * 1000 : null;
  if (exp && Date.now() > exp) {
    localStorage.removeItem("token");
    return { token: null, user: null };
  }
  return { token, user: extractUser(payload) };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  const login = useCallback((token: string) => {
    localStorage.setItem("token", token);
    const payload = parseJwt(token);
    const user = payload ? extractUser(payload) : null;
    setAuth({ token, user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("cs-active-building");
    invalidateUsersCache();
    setAuth({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
