"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  Package, 
  CreditCard, 
  Moon,
  Sun,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw
} from "lucide-react";
import "./globals.css";
import { api } from "../lib/api";
import { AuthProvider, useAuth } from "../lib/auth-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  
  const [darkMode, setDarkMode] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  
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
  }, []);

  // Close mobile drawer when path changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Route protection and redirection
  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== "/login") {
        router.replace("/login");
      } else if (user && pathname === "/login") {
        router.replace("/");
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <html lang="es" className={darkMode ? "dark-theme" : ""}>
        <body className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cargando sesión segura...</span>
          </div>
        </body>
      </html>
    );
  }

  // If not logged in and on /login, render the login page without the layout
  if (!user && pathname === "/login") {
    return (
      <html lang="es" className={darkMode ? "dark-theme" : ""}>
        <body className="overflow-hidden bg-background">
          {children}
        </body>
      </html>
    );
  }

  // If not logged in and not on /login, show a clean loading screen while redirecting
  if (!user) {
    return (
      <html lang="es" className={darkMode ? "dark-theme" : ""}>
        <body className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="flex flex-col items-center space-y-2">
            <span className="text-xs text-muted-foreground">Redirigiendo a la pantalla de acceso...</span>
          </div>
        </body>
      </html>
    );
  }

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
        
        {/* ACTIVE USER / SECURITY CONTEXT */}
        {(!sidebarCollapsed || isMobile) && (
          <div className="bg-foreground/5 rounded-lg p-2 flex flex-col border border-border/30 text-[9.5px]">
            <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">
              Usuario Conectado:
            </span>
            <span className="font-bold text-foreground truncate mt-1.5">
              {user.name}
            </span>
            <span className="text-muted-foreground truncate mt-0.5">
              {user.role}
            </span>
            <span className="text-[8px] text-muted-foreground truncate font-mono mt-1 block">
              T: {user.tenant_name}
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
            className="flex items-center space-x-1 hover:text-foreground text-left shrink-0"
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

          {/* Logout Button */}
          <button 
            onClick={logout}
            className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 shrink-0 cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

          {/* Theme Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-1 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
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
        <aside 
          className={`hidden lg:flex flex-col justify-between border-r z-30 shrink-0 transition-all duration-200 ease-in-out relative ${
            sidebarCollapsed ? "w-16" : "w-60"
          }`}
          style={{ backgroundColor: darkMode ? "#111827" : "#ffffff" }}
        >
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
                  {user.tenant_name}
                </span>
              </div>
            </div>
            
            {/* Right side: User Profile */}
            <div className="flex items-center space-x-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-[11.5px] font-semibold text-foreground leading-tight">{user.name}</span>
                <span className="text-[8.5px] text-muted-foreground leading-none">{user.email}</span>
              </div>
              <div className="w-7.5 h-7.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-[11px] shrink-0 select-none shadow-sm shadow-indigo-500/10">
                {user.name?.charAt(0) || "U"}
              </div>
            </div>

          </header>

          {/* PAGE CONTENT CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>

        </main>
        
      </body>
    </html>
  );
}

// Simple absolute close icon mock wrapper for compilation safety
function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
