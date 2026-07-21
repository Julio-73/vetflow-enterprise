"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Building2, 
  Users2, 
  AlertTriangle, 
  Wallet, 
  ArrowUpRight, 
  ShieldCheck, 
  Compass, 
  Info,
  CalendarCheck,
  Stethoscope,
  X
} from "lucide-react";
import { api } from "../lib/api";

export default function Dashboard() {
  const [tenantInfo, setTenantInfo] = useState<any>(() => api.getCached("/api/v1/tenants/me"));
  const [branchesCount, setBranchesCount] = useState<number>(() => api.getCached("/api/v1/tenants/branches")?.length || 0);
  const [usersCount, setUsersCount] = useState<number>(() => api.getCached("/api/v1/tenants/users")?.length || 0);
  const [criticalStockCount, setCriticalStockCount] = useState<number>(() => api.getCached("/api/v1/inventory/stocks")?.filter((s: any) => s.requires_reorder).length || 0);
  const [activeRegister, setActiveRegister] = useState<any>(() => api.getCached("/api/v1/billing/registers/me"));
  
  const [isLoading, setIsLoading] = useState(() => !api.getCached("/api/v1/tenants/me"));
  const [isApiFallback, setIsApiFallback] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(null);

  const fetchDashboardData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [tenant, branches, users, stocks, register] = await Promise.all([
        api.getTenantMe(),
        api.getTenantBranches(),
        api.getTenantUsers(),
        api.getStocks(),
        api.getMyActiveRegister().catch(() => null)
      ]);

      setTenantInfo(tenant);
      setBranchesCount(branches.length);
      setUsersCount(users.length);
      
      const critical = stocks.filter((s: any) => s.requires_reorder).length;
      setCriticalStockCount(critical);
      setActiveRegister(register);
      setIsApiFallback(false);
    } catch {
      setIsApiFallback(true);
      const user = api.getActiveUser();
      
      if (user?.tenant_id === "b2222222-2222-4222-b222-222222222222") {
        setTenantInfo({ name: "Clínica Veterinaria Del Bosque", plan_tier: "Starter", status: "active" });
        setBranchesCount(1);
        setUsersCount(2);
        setCriticalStockCount(0);
        setActiveRegister(null);
      } else {
        setTenantInfo({ name: "Clínica Veterinaria San Martín", plan_tier: "Professional", status: "active" });
        setBranchesCount(2);
        setUsersCount(4);
        setCriticalStockCount(3);
        setActiveRegister({ status: "Abierta", opening_balance: 1500 });
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only show loading if we don't have cached tenant info yet
    const hasCache = !!tenantInfo;
    fetchDashboardData(!hasCache);
    setActiveUser(api.getActiveUser());

    const unsubscribe = api.subscribe(() => {
      fetchDashboardData(false); // background revalidation (no loading skeleton)
      setActiveUser(api.getActiveUser());
    });

    return () => unsubscribe();
  }, [fetchDashboardData, tenantInfo]);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="h-44 rounded-2xl skeleton-shimmer border border-border/20 shadow-sm"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-80 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
          <div className="h-80 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {isApiFallback && !bannerDismissed && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start justify-between space-x-3 transition-all duration-300">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-amber-500 text-xs uppercase tracking-wider">Modo Demo Local Activo</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Navegando con credenciales de prueba local. Para sincronizar datos reales en tiempo real con la nube en Render (<span className="font-mono text-amber-300">vetflow-api-pgdb.onrender.com</span>), inicia sesión con un usuario registrado en Supabase Auth.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setBannerDismissed(true)}
            className="p-1.5 rounded-lg text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10 shrink-0 cursor-pointer"
            title="Ocultar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-tr from-indigo-900 via-indigo-950 to-purple-950 p-6 md:p-8 text-white border border-indigo-500/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full">
                Suscripción: Plan {tenantInfo?.plan_tier}
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full">
                Estado: {tenantInfo?.status}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              ¡Bienvenido, {activeUser?.name}!
            </h2>
            <p className="text-xs md:text-sm text-indigo-200/95 max-w-xl leading-relaxed">
              Panel administrativo de **{tenantInfo?.name}**. Administra las sucursales, existencias del almacén y el historial de consultas de tus pacientes.
            </p>
          </div>
          <div className="shrink-0 flex items-center space-x-3 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm shadow-inner self-start md:self-auto">
            <ShieldCheck className="w-8 h-8 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">Aislamiento Activo</div>
              <div className="text-xs font-semibold truncate max-w-[180px]">
                {activeUser?.tenant_name}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="p-5 rounded-xl border glass-card premium-card flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Sucursales</span>
            <span className="text-3xl font-extrabold text-foreground tracking-tight">{branchesCount}</span>
            <span className="text-[10px] text-muted-foreground block">Activas en el sistema</span>
          </div>
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border glass-card premium-card flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Colaboradores</span>
            <span className="text-3xl font-extrabold text-foreground tracking-tight">{usersCount}</span>
            <span className="text-[10px] text-muted-foreground block">Veterinarios y Recepción</span>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
            <Users2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border glass-card premium-card flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Stock Crítico</span>
            <span className="text-3xl font-extrabold text-foreground tracking-tight">{criticalStockCount}</span>
            <span className={`text-[10px] font-semibold block ${criticalStockCount > 0 ? "text-rose-500 animate-pulse" : "text-muted-foreground"}`}>
              {criticalStockCount > 0 ? "Requiere reabastecimiento" : "Todo en orden"}
            </span>
          </div>
          <div className={`p-3 rounded-lg ${criticalStockCount > 0 ? "bg-rose-500/10 text-rose-500 animate-pulse" : "bg-muted text-muted-foreground"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border glass-card premium-card flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Caja Activa</span>
            <span className="text-sm font-bold text-foreground mt-2 block">
              {activeRegister ? "ABIERTA" : "CERRADA"}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              {activeRegister ? `Fondo inicial: $${activeRegister.opening_balance}` : "Sin arqueo activo"}
            </span>
          </div>
          <div className={`p-3 rounded-lg ${activeRegister ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
            <Wallet className="w-5 h-5" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div className="md:col-span-2 p-5 md:p-6 rounded-xl border glass-card space-y-4">
          <h3 className="font-semibold text-foreground text-sm flex items-center space-x-2 border-b border-border/30 pb-3">
            <Compass className="w-4 h-4 text-indigo-500" />
            <span>Guía de Validación de Seguridad Multi-Tenant y Reglas</span>
          </h3>
          
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Usa el selector **Simular Usuario** de la barra lateral izquierda para alternar de tenant y validar de forma práctica el aislamiento:
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="border border-border/50 rounded-xl p-4 space-y-2 bg-foreground/[0.02]">
                <h4 className="font-semibold text-foreground flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                  <span>1. Aislamiento RLS en Base de Datos</span>
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Prueba con **Laura Gómez (Tenant A)** y verás una lista de pacientes y existencias. Cambia a **Roberto Silva (Tenant B)**; la agenda, sucursales y stock se filtrarán nativamente sin fugas de información.
                </p>
              </div>

              <div className="border border-border/50 rounded-xl p-4 space-y-2 bg-foreground/[0.02]">
                <h4 className="font-semibold text-foreground flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                  <span>2. Validación de Cédulas en Recetas</span>
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Con **Laura Gómez (Veterinario, con cédula)** podrás emitir recetas controladas (como Fentanilo). Si seleccionas a **María López (Recepcionista)**, el sistema bloqueará la acción inmediatamente.
                </p>
              </div>

              <div className="border border-border/50 rounded-xl p-4 space-y-2 bg-foreground/[0.02]">
                <h4 className="font-semibold text-foreground flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span>3. Inmutabilidad Historial EMR</span>
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  En el módulo clínico, abre una consulta y edítala libremente. Al hacer clic en **Sellar**, el trigger de base de datos bloqueará cualquier cambio posterior, arrojando error de inmutabilidad en la API.
                </p>
              </div>

              <div className="border border-border/50 rounded-xl p-4 space-y-2 bg-foreground/[0.02]">
                <h4 className="font-semibold text-foreground flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>4. Facturación SAT (MX) vs DIAN (CO)</span>
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Registra un cobro en la sucursal de la Sede Principal y verás el timbrado en formato XML SAT. Hazlo en la Sede Del Bosque de Colombia y el sistema resolverá de forma dinámica la factura DIAN con CUFE.
                </p>
              </div>

            </div>
          </div>
        </div>

        <div className="p-5 md:p-6 rounded-xl border glass-card flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm border-b border-border/30 pb-3">Accesos Directos</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Salta rápidamente a los módulos para probar los flujos interactivos.
            </p>
          </div>

          <div className="space-y-3">
            <a href="/appointments" className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 hover:bg-foreground/5 hover:border-border transition-all text-xs font-semibold shadow-sm">
              <div className="flex items-center space-x-2.5">
                <CalendarCheck className="w-4.5 h-4.5 text-indigo-500" />
                <span>Agendar Citas de Pacientes</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </a>
            
            <a href="/clinical" className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 hover:bg-foreground/5 hover:border-border transition-all text-xs font-semibold shadow-sm">
              <div className="flex items-center space-x-2.5">
                <Stethoscope className="w-4.5 h-4.5 text-purple-500" />
                <span>Historial Clínico EMR</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </a>
            
            <a href="/inventory" className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 hover:bg-foreground/5 hover:border-border transition-all text-xs font-semibold shadow-sm">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                <span>Medicamentos y Lotes FEFO</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}
