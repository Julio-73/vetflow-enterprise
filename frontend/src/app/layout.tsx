"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  Package, 
  CreditCard, 
  ShieldAlert,
  Moon,
  Sun,
  CheckCircle2,
  RefreshCw,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import "./globals.css";
import { api } from "../lib/api";
import { MOCK_USERS, generateMockJWT, MockUser } from "../lib/mock-auth";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(true);
  const [activeUser, setActiveUser] = useState<MockUser | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  
  // Responsive sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check backend health
  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await api.checkHealth();
      setBackendOnline(res.status === "healthy");
    } catch {
      setBackendOnline(false);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Load initial user
    const user = api.getActiveUser();
    if (user) {
      setActiveUser(user);
    } else {
      // Set Laura Gomez (attending vet) as default for demo convenience
      handleUserChange(MOCK_USERS[1]);
    }

    // Subscribe to API updates
    const unsubscribe = api.subscribe(() => {
      setActiveUser(api.getActiveUser());
    });

    return () => unsubscribe();
  }, []);

  // Close mobile drawer when path changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleUserChange = async (user: MockUser) => {
    setIsSigning(true);
    try {
      // Sign HS256 JWT using client-side Web Crypto
      const token = await generateMockJWT(user);
      api.setAuth(token, user);
      setActiveUser(user);
    } catch (e) {
      console.error("Authentication simulation failed", e);
    } finally {
      setIsSigning(false);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Pacientes y Tutores", href: "/patients", icon: Users },
    { name: "Agenda de Citas", href: "/appointments", icon: Calendar },
    { name: "Evolución Clínica (EMR)", href: "/clinical", icon: Stethoscope },
    { name: "Farmacia e Almacén", href: "/inventory", icon: Package },
    { name: "Caja y Facturación", href: "/billing", icon: CreditCard }
  ];

  const sidebarContent = (isMobile: boolean = false) => (
    <div className="flex flex-col justify-between h-full p-4 overflow-y-auto">
      <div className="space-y-6">
        
        {/* BRAND LOGO */}
        <div className="flex items-center space-x-2.5 px-1 py-1">
          <div className="w-7.5 h-7.5 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 shrink-0 text-sm">
            VF
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div className="transition-opacity duration-200">
              <h1 className="font-bold text-sm leading-none text-foreground tracking-tight">VetFlow SaaS</h1>
              <span className="text-[8.5px] text-muted-foreground uppercase tracking-widest font-semibold">Enterprise</span>
            </div>
          )}
        </div>

        {/* TESTING WARNING PIN */}
        {(!sidebarCollapsed || isMobile) ? (
          <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-2 space-y-1 animate-border-pulse">
            <div className="flex items-center space-x-1 text-red-500 font-semibold text-[9.5px]">
              <ShieldAlert className="w-3 h-3" />
              <span>DEV TESTING MODE</span>
            </div>
            <p className="text-[8.5px] text-muted-foreground leading-tight">
              Simulador JWT HS256 local para pruebas RLS y RBAC.
            </p>
          </div>
        ) : (
          <div className="flex justify-center text-red-500" title="Modo Pruebas Activo">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </div>
        )}

        {/* MOCK AUTH / TENANT SELECTOR */}
        {(!sidebarCollapsed || isMobile) ? (
          <div className="space-y-1.5">
            <label className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Simular Usuario (Auth)
            </label>
            <div className="space-y-1">
              {MOCK_USERS.map((user) => {
                const isSelected = activeUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => handleUserChange(user)}
                    disabled={isSigning}
                    className={`w-full text-left px-2 py-1.5 rounded-lg transition-all flex flex-col border ${
                      isSelected 
                        ? "bg-foreground/5 border-foreground/10 text-foreground font-semibold shadow-sm" 
                        : "border-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10.5px] truncate">{user.name}</span>
                      {isSelected && <CheckCircle2 className="w-2.5 h-2.5 text-indigo-500 shrink-0" />}
                    </div>
                    <span className="text-[8px] text-muted-foreground font-normal truncate mt-0.5">
                      {user.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex justify-center text-muted-foreground text-[10px] font-bold uppercase py-1">
            🔑
          </div>
        )}

        {/* NAVIGATION LINKS */}
        <nav className="space-y-1">
          {(!sidebarCollapsed || isMobile) && (
            <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wider px-1 block mb-1.5">
              Módulos de Gestión
            </span>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg transition-all ${
                  sidebarCollapsed && !isMobile 
                    ? "justify-center p-2.5" 
                    : "space-x-2.5 px-2.5 py-1.5"
                } ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/10"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {(!sidebarCollapsed || isMobile) && <span className="text-[11.5px]">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* FOOTER WIDGETS */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        
        {/* ACTIVE INQUILINO / SECURITY CONTEXT */}
        {activeUser && (!sidebarCollapsed || isMobile) && (
          <div className="bg-foreground/5 rounded-lg p-2 flex flex-col border border-border/30 text-[9.5px]">
            <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">
              Contexto de Seguridad:
            </span>
            <span className="font-semibold text-foreground truncate mt-1">
              ID: {activeUser.tenant_id.slice(0, 8)}...
            </span>
            <span className="text-muted-foreground truncate">
              Rol: {activeUser.role}
            </span>
          </div>
        )}

        {/* STATUS & UTILITIES */}
        <div className={`flex items-center text-muted-foreground ${
          sidebarCollapsed && !isMobile ? "flex-col space-y-2 justify-center" : "justify-between"
        }`}>
          
          {/* Health Indicator */}
          <button 
            onClick={checkHealth}
            disabled={isCheckingHealth}
            className="flex items-center space-x-1 hover:text-foreground text-left"
            title="Sincronización de API"
          >
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              backendOnline === null ? "bg-amber-500 animate-pulse" :
              backendOnline ? "bg-emerald-500" : "bg-rose-500"
            }`} />
            {(!sidebarCollapsed || isMobile) && (
              <span className="text-[8.5px] uppercase font-bold tracking-wider">
                {backendOnline === null ? "..." : backendOnline ? "ONLINE" : "OFFLINE"}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-1 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Alternar tema"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>
    </div>
  );

  return (
    <html lang="es" className={darkMode ? "dark-theme" : ""}>
      <head>
        <title>VetFlow SaaS - Portal Clínica Veterinaria</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Plataforma SaaS Premium de Gestión para Clínicas Veterinarias de Alta Escala" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="flex h-screen w-screen overflow-hidden text-sm bg-background">
        
        {/* MOBILE DRAWER / OVERLAY */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          />
        )}
        
        {/* MOBILE SLIDING SIDEBAR DRAWER */}
        <aside 
          className={`fixed inset-y-0 left-0 w-60 border-r z-50 lg:hidden transform transition-transform duration-300 ease-out flex flex-col justify-between ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ backgroundColor: darkMode ? "#111827" : "#ffffff" }}
        >
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
              aria-label="Cerrar menú"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {sidebarContent(true)}
        </aside>

        {/* DESKTOP/TABLET SIDEBAR */}
        <aside className={`hidden lg:flex flex-col justify-between border-r glass-card z-30 shrink-0 transition-all duration-200 ease-in-out relative ${
          sidebarCollapsed ? "w-16" : "w-60"
        }`}>
          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-3 -right-3 w-6 h-6 rounded-full border bg-card text-muted-foreground hover:text-foreground flex items-center justify-center shadow-sm cursor-pointer z-40 transition-transform duration-200"
            aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
          {sidebarContent(false)}
        </aside>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
          
          {/* HEADER BAR */}
          <header className="h-14 border-b flex items-center justify-between px-4 sm:px-6 shrink-0 glass-card z-20">
            
            {/* Left side: Hamburger button + location */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-1.5 text-[11.5px]">
                <span className="text-muted-foreground hidden xs:inline">Localización:</span>
                <span className="font-semibold text-foreground truncate max-w-[130px] sm:max-w-none">
                  {activeUser?.tenant_id === "a1111111-1111-4111-a111-111111111111" ? "México (MX) • MXN" : "Colombia (CO) • COP"}
                </span>
              </div>
            </div>
            
            {/* Right side: User Profile */}
            <div className="flex items-center space-x-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-[11.5px] font-semibold text-foreground leading-tight">{activeUser?.name}</span>
                <span className="text-[8.5px] text-muted-foreground leading-none">{activeUser?.email}</span>
              </div>
              <div className="w-7.5 h-7.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-[11px] shrink-0 select-none shadow-sm shadow-indigo-500/10">
                {activeUser?.name?.charAt(0) || "U"}
              </div>
            </div>
          </header>

          {/* PAGE BODY */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0 relative">
            {children}
          </div>
        </main>
        
      </body>
    </html>
  );
}
