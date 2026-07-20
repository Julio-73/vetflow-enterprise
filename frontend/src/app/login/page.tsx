"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { Shield, Mail, Lock, AlertTriangle, CheckCircle, RefreshCw, Zap } from "lucide-react";

export default function LoginPage() {
  const { user, login, demoLogin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

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
      setSuccessMsg("Sesión iniciada con éxito en Supabase. Redirigiendo...");
      setTimeout(() => {
        router.push("/");
      }, 600);
    } catch (e: any) {
      console.error("Login failure:", e);
      setErrorMsg(e.message || "Credenciales incorrectas o usuario no registrado en Supabase.");
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
      setErrorMsg(e.message || "Error al iniciar sesión demo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-tr from-slate-950 via-zinc-900 to-indigo-950 p-4 text-xs select-none relative overflow-hidden">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md border border-white/10 rounded-2xl p-6 md:p-8 bg-zinc-900/70 backdrop-blur-xl shadow-2xl space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
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
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="space-y-1.5">
            <label className="text-muted-foreground font-semibold flex items-center space-x-2">
              <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Correo Electrónico</span>
            </label>
            <input 
              type="email" 
              required
              disabled={isLoading}
              placeholder="nombre@veterinaria.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder:text-muted-foreground focus:border-indigo-500/50 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/30 min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground font-semibold flex items-center space-x-2">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Contraseña</span>
            </label>
            <input 
              type="password" 
              required
              disabled={isLoading}
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder:text-muted-foreground focus:border-indigo-500/50 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/30 min-h-[44px]"
            />
          </div>

          <div className="flex items-center justify-between pt-1 select-none text-[11px]">
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
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-45 font-bold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer mt-4"
          >
            {isLoading ? (
              <RefreshCw className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <span>Iniciar Sesión con Supabase</span>
            )}
          </button>

        </form>

        {/* QUICK DEMO ACCESS FOR LOCAL TESTING */}
        <div className="pt-4 border-t border-white/10 space-y-2.5">
          <div className="text-[9.5px] text-indigo-300 uppercase font-bold tracking-wider text-center flex items-center justify-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Acceso Rápido de Prueba (Demo / Local)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <button
              onClick={() => handleDemoAccess("laura.gomez@sanmartin.com")}
              type="button"
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/40 text-left font-semibold text-white transition-all cursor-pointer space-y-0.5"
            >
              <div className="font-bold text-white text-[11px] truncate">Dra. Laura Gómez</div>
              <div className="text-[8.5px] text-muted-foreground truncate">Veterinaria • Tenant A</div>
            </button>

            <button
              onClick={() => handleDemoAccess("carlos.admin@sanmartin.com")}
              type="button"
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/40 text-left font-semibold text-white transition-all cursor-pointer space-y-0.5"
            >
              <div className="font-bold text-white text-[11px] truncate">Carlos Pérez</div>
              <div className="text-[8.5px] text-muted-foreground truncate">Admin • Tenant A</div>
            </button>

            <button
              onClick={() => handleDemoAccess("maria.lopez@sanmartin.com")}
              type="button"
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/40 text-left font-semibold text-white transition-all cursor-pointer space-y-0.5"
            >
              <div className="font-bold text-white text-[11px] truncate">María López</div>
              <div className="text-[8.5px] text-muted-foreground truncate">Recepción • Tenant A</div>
            </button>

            <button
              onClick={() => handleDemoAccess("roberto.silva@delbosque.com")}
              type="button"
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/40 text-left font-semibold text-white transition-all cursor-pointer space-y-0.5"
            >
              <div className="font-bold text-white text-[11px] truncate">Dr. Roberto Silva</div>
              <div className="text-[8.5px] text-muted-foreground truncate">Director • Tenant B</div>
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="pt-2 flex items-center justify-center space-x-2 text-[10px] text-muted-foreground">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Conexión cifrada SSL con base de datos PostgreSQL RLS.</span>
        </div>

      </div>

    </div>
  );
}
