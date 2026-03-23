import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, setActiveAuthPortal, setStoredAuthToken } from "@/lib/api";
import { AuthResponse, AuthUser } from "@/types/auth";
import { AuthContext, LoginInput, RegisterInput } from "@/context/auth-context";

export type PortalType = "unified" | "citizen" | "backoffice";

interface AuthProviderProps {
  children: React.ReactNode;
  portal?: PortalType;
}

function isPortalRoleAllowed(portal: PortalType, role: AuthUser["role"]) {
  if (portal === "citizen") {
    return role === "citizen";
  }

  if (portal === "backoffice") {
    return role !== "citizen";
  }

  return true;
}

function getLoginPath(portal: PortalType) {
  if (portal === "citizen") return "/auth/login-citizen";
  if (portal === "backoffice") return "/auth/login-staff";
  return "/auth/login";
}

export function AuthProvider({
  children,
  portal = "unified",
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveAuthPortal(portal);
  }, [portal]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiRequest<{ user: AuthUser }>("/auth/me");

      if (!isPortalRoleAllowed(portal, response.user.role)) {
        setStoredAuthToken(null, portal);
        setUser(null);
        return;
      }

      setUser(response.user);
    } catch {
      setStoredAuthToken(null, portal);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [portal]);

  const authenticate = useCallback(
    async (path: string, payload: LoginInput | RegisterInput) => {
      const response = await apiRequest<AuthResponse>(path, {
        method: "POST",
        body: payload,
      });

      if (!isPortalRoleAllowed(portal, response.user.role)) {
        setStoredAuthToken(null, portal);
        setUser(null);
        throw new Error("This account is not allowed in this portal");
      }

      setStoredAuthToken(response.token ?? null, portal);
      setUser(response.user);
      return response.user;
    },
    [portal],
  );

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (payload: LoginInput) => authenticate(getLoginPath(portal), payload),
    [authenticate, portal],
  );

  const register = useCallback(
    async (payload: RegisterInput) => {
      if (portal === "backoffice") {
        throw new Error("Backoffice registration is not available");
      }

      return authenticate("/auth/register", payload);
    },
    [authenticate, portal],
  );

  const logout = async () => {
    await apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
    setStoredAuthToken(null, portal);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      portal,
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [portal, user, loading, login, register, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
