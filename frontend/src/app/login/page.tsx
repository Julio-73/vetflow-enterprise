"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { Shield, Mail, Lock, AlertTriangle, CheckCircle, RefreshCw, Zap, Settings } from "lucide-react";

export default function LoginPage() {
  const { user, login, demoLogin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Settings modal/drawer for custom Supabase URL & Key
  const [showSettings, setShowSettings] = useState(false);
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState("");
  const [customSupabaseKey, setCustomSupabaseKey] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCustomSupabaseUrl(localStorage.getItem("vetflow_supabase_url") || "");
      setCustomSupabaseKey(localStorage.getItem("vetflow_supabase_anon_key") || "");
    }
  }, []);

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("vetflow_supabase_url", customSupabaseUrl);
      localStorage.setItem("vetflow_supabase_anon_key", customSupabaseKey);
    }
    setShowSettings(false);
    setSuccessMsg("Configuración de Supabase guardada. Reiniciando...");
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  // If already authenticated, redirect to home
  useEffect(() => {
    if (user && !authLoading) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!email || !password) {
      setErrorMsg("Por favor, ingrese su correo y contraseña.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      setSuccessMsg("Sesión iniciada con éxito. Redirigiendo...");
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (e: any) {
      console.error("Login failure:", e);
      setErrorMsg(e.message || "Credenciales incorrectas o error de conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = async (demoEmail: string) => {
    setErrorMsg("");
    setSuccessMsg("Ingresando en modo demo...");
    setIsLoading(true);
    try {
      await demoLogin(demoEmail);
      router.push("/");
    } catch (e: any) {
      setErrorMsg(e.message || "Error al iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-tr from-slate-950 via-zinc-900 to-indigo-950 p-4 text-xs select-none relative overflow-hidden">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md border border-white/10 rounded-2xl p-6 md:p-8 bg-zinc-900/70 backdrop-blur-xl shadow-2xl space-y-5 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-1.5 relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            type="button"
            className="absolute top-0 right-0 p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
            title="Configurar URL y Key de Supabase"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30 text-lg">
            VF
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight pt-1">
            VetFlow SaaS Enterprise
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Portal de Acceso Clínico
          </p>
        </div>

        {/* Custom Supabase Settings Modal Drawer */}
        {showSettings && (
          <form onSubmit={saveSettings} className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2.5 animate-fadeIn text-[11px]">
            <div className="font-bold text-indigo-300 flex items-center justify-between">
              <span>⚙️ Configurar Supabase URL / Key</span>
            </div>
            <div className="space-y-1">
              <label className="text-[9.5px] text-muted-foreground uppercase font-semibold">Supabase Project URL</label>
              <input 
                type="url" 
                placeholder="https://xxxx.supabase.co"
                value={customSupabaseUrl}
                onChange={e => setCustomSupabaseUrl(e.target.value)}
                className="w-full p-2 rounded bg-black/40 border border-white/10 text-white text-[10px] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9.5px] text-muted-foreground uppercase font-semibold">Supabase Anon Key</label>
              <input 
                type="password" 
                placeholder="ey..."
                value={customSupabaseKey}
                onChange={e => setCustomSupabaseKey(e.target.value)}
                className="w-full p-2 rounded bg-black/40 border border-white/10 text-white text-[10px] outline-none"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button 
                type="button" 
                onClick={() => setShowSettings(false)}
                className="px-2.5 py-1 rounded text-muted-foreground hover:text-white"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-3 py-1 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-500"
              >
                Guardar
              </button>
            </div>
          </form>
        )}

        {/* Message Alerts */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium flex items-start space-x-2.5 animate-pulse">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-medium flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          <div className="space-y-1">
            <label className="text-muted-foreground font-semibold flex items-center space-x-2">
              <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Correo Electrónico</span>
            </label>
            <input 
              type="email" 
              required
              disabled={isLoading}
              placeholder="nombre@veterinaria.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-2.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder:text-muted-foreground focus:border-indigo-500/50 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/30 min-h-[40px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-muted-foreground font-semibold flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Contraseña</span>
            </label>
            <input 
              type="password" 
              required
              disabled={isLoading}
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder:text-muted-foreground focus:border-indigo-500/50 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/30 min-h-[40px]"
            />
          </div>

          <div className="flex items-center justify-between pt-0.5 select-none text-[11px]">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="rounded bg-white/5 border-white/10 text-indigo-600 focus:ring-0 w-3.5 h-3.5" 
              />
              <label htmlFor="remember" className="text-muted-foreground font-medium cursor-pointer">
                Recordar mi sesión
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || authLoading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-45 font-bold shadow-md shadow-indigo-600/10 min-h-[40px] cursor-pointer mt-3"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Iniciar Sesión con Supabase</span>
            )}
          </button>

        </form>

        {/* QUICK DEMO ACCESS FOR LOCAL TESTING */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="text-[9.5px] text-indigo-300 uppercase font-bold tracking-wider text-center flex items-center justify-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Acceso Rápido de Prueba (Demo / Local)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <button
              onClick={() => handleDemoAccess("julioquispe.dev@gmail.com")}
              type="button"
              disabled={isLoading}
              className="col-span-2 p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-left font-semibold text-white transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-white text-[11px]">Julio Quispe (Owner)</div>
                <div className="text-[8.5px] text-indigo-200">julioquispe.dev@gmail.com • Tenant A</div>
              </div>
              <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">1-Clic</span>
            </button>

            <button
              onClick={() => handleDemoAccess("laura.gomez@sanmartin.com")}
              type="button"
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/40 text-left font-semibold text-white transition-all cursor-pointer space-y-0.5"
            >
              <div className="font-bold text-white text-[10.5px] truncate">Dra. Laura Gómez</div>
              <div className="text-[8.5px] text-muted-foreground truncate">Veterinaria • Tenant A</div>
            </button>

            <button
              onClick={() => handleDemoAccess("carlos.admin@sanmartin.com")}
              type="button"
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/40 text-left font-semibold text-white transition-all cursor-pointer space-y-0.5"
            >
              <div className="font-bold text-white text-[10.5px] truncate">Carlos Pérez</div>
              <div className="text-[8.5px] text-muted-foreground truncate">Admin • Tenant A</div>
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="pt-1 flex items-center justify-center space-x-2 text-[10px] text-muted-foreground">
          <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Conexión cifrada SSL con base de datos PostgreSQL RLS.</span>
        </div>

      </div>

    </div>
  );
}
