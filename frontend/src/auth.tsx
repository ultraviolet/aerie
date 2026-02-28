import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("prairie_token");
    const savedUser = localStorage.getItem("prairie_user");
    if (saved && savedUser) {
      setToken(saved);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("prairie_token");
        localStorage.removeItem("prairie_user");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem("prairie_token", token);
    localStorage.setItem("prairie_user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("prairie_token");
    localStorage.removeItem("prairie_user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
