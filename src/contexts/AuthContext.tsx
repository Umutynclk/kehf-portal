"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  AdminUser,
  fetchAdminSession,
  signOut as authSignOut,
} from "@/lib/auth";

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refreshSession: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const sessionUser = await fetchAdminSession();
      setUser(sessionUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const sessionUser = await fetchAdminSession();
        if (active) setUser(sessionUser);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadSession();

    const handleAuthChange = () => {
      void loadSession();
    };

    window.addEventListener("auth-changed", handleAuthChange);
    return () => {
      active = false;
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, []);

  const logout = useCallback(async () => {
    await authSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
