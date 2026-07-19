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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = useCallback(async (token: string, email: string) => {
    try {
      // Temporarily set the token in api client to authorize backend requests
      // Use a mock user profile during the bootstrap phase
      const tempUser = { id: "", email, name: "", role: "", tenant_id: "", tenant_name: "" };
      api.setAuth(token, tempUser);

      // Fetch tenant and users list from real backend (Render)
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

      // Set the final verified authentication details
      api.setAuth(token, userProfile);
      setUser(userProfile);
    } catch (e: any) {
      console.error("Error loading user profile from backend:", e);
      api.clearAuth();
      setUser(null);
      throw new Error(e.message || "Failed to load user profile from backend.");
    }
  }, []);

  useEffect(() => {
    // 1. Recover active session on mount
    const bootstrapAuth = async () => {
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        if (activeSession && activeSession.user?.email) {
          setSession(activeSession);
          await loadUserProfile(activeSession.access_token, activeSession.user.email);
        } else {
          api.clearAuth();
          setUser(null);
        }
      } catch (e) {
        console.error("Auth restoration error:", e);
        api.clearAuth();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();

    // 2. Listen to Supabase Auth state changes (RS256 token refreshes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession && newSession.user?.email) {
        setSession(newSession);
        // Refresh token in the api client
        try {
          await loadUserProfile(newSession.access_token, newSession.user.email);
        } catch {
          // Profile fetch failed, redirect to login
          setSession(null);
          setUser(null);
        }
      } else {
        setSession(null);
        setUser(null);
        api.clearAuth();
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

      if (error) throw error;
      if (!data.session) throw new Error("Failed to initialize session.");

      setSession(data.session);
      if (data.session.user?.email) {
        await loadUserProfile(data.session.access_token, data.session.user.email);
      }
    } catch (e: any) {
      setSession(null);
      setUser(null);
      api.clearAuth();
      throw e;
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
    <AuthContext.Provider value={{ user, session, isLoading, login, logout }}>
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
