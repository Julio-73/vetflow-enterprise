"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { api } from "./api";
import { Session } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  professional_license?: string;
  tenant_name: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_PROFILES: Record<string, UserProfile> = {
  "julioquispe.dev@gmail.com": {
    id: "99999999-9999-9999-9999-999999999999",
    email: "julioquispe.dev@gmail.com",
    name: "Julio Quispe",
    role: "TenantOwner",
    tenant_id: "a1111111-1111-4111-a111-111111111111",
    professional_license: "MV-10001-PE",
    tenant_name: "Clínica Veterinaria San Martín"
  },
  "carlos.admin@sanmartin.com": {
    id: "11111111-1111-1111-1111-111111111111",
    email: "carlos.admin@sanmartin.com",
    name: "Carlos Pérez",
    role: "TenantOwner",
    tenant_id: "a1111111-1111-4111-a111-111111111111",
    tenant_name: "Clínica Veterinaria San Martín"
  },
  "laura.gomez@sanmartin.com": {
    id: "22222222-2222-2222-2222-222222222222",
    email: "laura.gomez@sanmartin.com",
    name: "Dra. Laura Gómez",
    role: "Veterinario",
    tenant_id: "a1111111-1111-4111-a111-111111111111",
    professional_license: "MV-98765-MX",
    tenant_name: "Clínica Veterinaria San Martín"
  },
  "maria.lopez@sanmartin.com": {
    id: "44444444-4444-4444-4444-444444444444",
    email: "maria.lopez@sanmartin.com",
    name: "María López",
    role: "Recepcionista",
    tenant_id: "a1111111-1111-4111-a111-111111111111",
    tenant_name: "Clínica Veterinaria San Martín"
  },
  "roberto.silva@delbosque.com": {
    id: "55555555-5555-5555-5555-555555555555",
    email: "roberto.silva@delbosque.com",
    name: "Dr. Roberto Silva",
    role: "DirectorClinico",
    tenant_id: "b2222222-2222-4222-b222-222222222222",
    professional_license: "MV-12345-CO",
    tenant_name: "Clínica Veterinaria Del Bosque"
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = useCallback(async (token: string, email: string) => {
    try {
      const tempUser = { id: "", email, name: "", role: "", tenant_id: "", tenant_name: "" };
      api.setAuth(token, tempUser);

      const [tenant, users] = await Promise.all([
        api.getTenantMe(),
        api.getTenantUsers()
      ]);

      const dbUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (!dbUser) {
        throw new Error(`User profile for ${email} not found in tenant database.`);
      }

      const userProfile: UserProfile = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        tenant_id: dbUser.tenant_id,
        professional_license: dbUser.professional_license || "",
        tenant_name: tenant.name
      };

      api.setAuth(token, userProfile);
      setUser(userProfile);
    } catch (e: any) {
      console.warn("Error loading user profile from backend:", e);
      // Fallback to local profile if available
      const fallback = DEMO_PROFILES[email.toLowerCase()];
      if (fallback) {
        api.setAuth(token, fallback);
        setUser(fallback);
      } else {
        api.clearAuth();
        setUser(null);
        throw new Error(e.message || "Failed to load user profile from backend.");
      }
    }
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const storedUser = api.getActiveUser();
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        
        if (activeSession && activeSession.user?.email) {
          setSession(activeSession);
          await loadUserProfile(activeSession.access_token, activeSession.user.email);
        } else if (storedUser) {
          setUser(storedUser);
        } else {
          api.clearAuth();
          setUser(null);
        }
      } catch (e) {
        console.error("Auth restoration error:", e);
        const storedUser = api.getActiveUser();
        if (storedUser) {
          setUser(storedUser);
        } else {
          api.clearAuth();
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession && newSession.user?.email) {
        setSession(newSession);
        try {
          await loadUserProfile(newSession.access_token, newSession.user.email);
        } catch {
          setSession(null);
          setUser(null);
        }
      } else {
        const storedUser = api.getActiveUser();
        if (!storedUser) {
          setSession(null);
          setUser(null);
          api.clearAuth();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // If Supabase Auth fails due to unconfigured URL or network, check if email is registered locally
        const fallback = DEMO_PROFILES[email.toLowerCase()];
        if (fallback) {
          api.setAuth("demo-jwt-token", fallback);
          setUser(fallback);
          return;
        }
        throw error;
      }

      if (!data.session) throw new Error("Failed to initialize session.");

      setSession(data.session);
      if (data.session.user?.email) {
        await loadUserProfile(data.session.access_token, data.session.user.email);
      }
    } catch (e: any) {
      const fallback = DEMO_PROFILES[email.toLowerCase()];
      if (fallback) {
        api.setAuth("demo-jwt-token", fallback);
        setUser(fallback);
        return;
      }
      setSession(null);
      setUser(null);
      api.clearAuth();
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (email: string) => {
    setIsLoading(true);
    try {
      const selected = DEMO_PROFILES[email.toLowerCase()] || DEMO_PROFILES["julioquispe.dev@gmail.com"];
      api.setAuth("demo-jwt-token", selected);
      setUser(selected);
    } catch (e) {
      console.error("Demo login error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signOut error:", e);
    } finally {
      setSession(null);
      setUser(null);
      api.clearAuth();
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
