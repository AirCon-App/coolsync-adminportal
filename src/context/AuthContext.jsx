import React, { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function getStoredAuth() {
  const token = localStorage.getItem("token");
  if (!token) return { token: null, user: null };
  const payload = parseJwt(token);
  if (!payload) return { token: null, user: null };
  const exp = payload.exp ? payload.exp * 1000 : null;
  if (exp && Date.now() > exp) {
    localStorage.removeItem("token");
    return { token: null, user: null };
  }
  return {
    token,
    user: {
      id: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? payload.sub,
      email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ?? payload.email,
      role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? payload.role,
      fullName: payload.fullName ?? "",
      isSuperAdmin: payload.isSuperAdmin === "true",
      buildingIds: [payload.buildingId].flat().filter(Boolean).map(Number),
    },
  };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  const login = useCallback((token) => {
    localStorage.setItem("token", token);
    const payload = parseJwt(token);
    const user = {
      id: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? payload.sub,
      email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ?? payload.email,
      role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? payload.role,
      fullName: payload.fullName ?? "",
      isSuperAdmin: payload.isSuperAdmin === "true",
      buildingIds: [payload.buildingId].flat().filter(Boolean).map(Number),
    };
    setAuth({ token, user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("cs-active-building");
    setAuth({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
