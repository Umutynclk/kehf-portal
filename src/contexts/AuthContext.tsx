"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  AdminUser,
  getStoredAdminUser,
  getStoredAdminToken,
  generateAdminToken,
  signOut as authSignOut,
} from "@/lib/auth";

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  loginAsAdmin: (email?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  loginAsAdmin: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check saved session & token
    const savedUser = getStoredAdminUser();
    const savedToken = getStoredAdminToken();

    if (savedUser && savedToken) {
      setUser(savedUser);
    }
    setLoading(false);

    const handleAuthChange = () => {
      const u = getStoredAdminUser();
      const t = getStoredAdminToken();
      if (u && t) {
        setUser(u);
      } else {
        setUser(null);
      }
    };

    window.addEventListener("auth-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const loginAsAdmin = (email = "admin@kehf.com") => {
    const adminUser: AdminUser = {
      uid: "kehf_admin_master",
      email: email,
      displayName: "Kehf Admin",
      role: "admin",
    };

    const token = generateAdminToken(adminUser.email);

    if (typeof window !== "undefined") {
      localStorage.setItem("kehf_admin_session", JSON.stringify(adminUser));
      localStorage.setItem("kehf_admin_token", token);
      document.cookie = `kehf_admin_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
      window.dispatchEvent(new Event("auth-changed"));
    }

    setUser(adminUser);
  };

  const logout = async () => {
    await authSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginAsAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
