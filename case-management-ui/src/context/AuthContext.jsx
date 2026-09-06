import { createContext, useContext, useState } from "react";
import { authenticateWithGroups } from "../api/client";

const STORAGE_KEY = "casework_auth_session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authData, setAuthData] = useState(() => {
    try {
      const stored =
        localStorage.getItem(STORAGE_KEY) ||
        sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse stored auth session", e);
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password, remember = false) => {
    setLoading(true);
    setError(null);
    try {
      // password is dummy/pass-through as requested
      const result = await authenticateWithGroups(email);
      setAuthData(result);

      const serialized = JSON.stringify(result);
      if (remember) {
        localStorage.setItem(STORAGE_KEY, serialized);
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, serialized);
        localStorage.removeItem(STORAGE_KEY);
      }
      return result;
    } catch (err) {
      const message = err.message || "Authentication failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthData(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear auth session", e);
    }
  };

  const switchGroup = (groupId) => {
    if (!authData || !authData.allGroups) return;
    const targetGroup = authData.allGroups.find((g) => g.id === groupId);
    if (targetGroup) {
      const updated = {
        ...authData,
        group: {
          id: targetGroup.id,
          name: targetGroup.name,
          description: targetGroup.description
        },
        role: targetGroup.role
      };
      setAuthData(updated);
      try {
        if (localStorage.getItem(STORAGE_KEY)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } else {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch (e) {
        console.error("Failed to update active group in storage", e);
      }
    }
  };

  const value = {
    isAuthenticated: Boolean(authData?.user),
    user: authData?.user ?? null,
    group: authData?.group ?? null,
    role: authData?.role ?? null,
    allGroups: authData?.allGroups ?? [],
    isDemo: Boolean(authData?.isDemo),
    loading,
    error,
    login,
    logout,
    switchGroup
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
