"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Wallet, 
  Plus, 
  Coins, 
  ShoppingBag, 
  Printer, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  DollarSign
} from "lucide-react";
import { api } from "../../lib/api";

export default function BillingPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>(() => api.getCached("/api/v1/patients/tutors") || []);
  const [branches, setBranches] = useState<any[]>(() => api.getCached("/api/v1/tenants/branches") || []);
  const [products, setProducts] = useState<any[]>(() => api.getCached("/api/v1/inventory/products") || []);
  const [activeRegister, setActiveRegister] = useState<any>(() => api.getCached("/api/v1/billing/registers/me"));
  
  const [isLoading, setIsLoading] = useState(() => !api.getCached("/api/v1/patients/tutors"));
  const [isFallback, setIsFallback] = useState(false);

  // Modals
  const [showOpenRegisterModal, setShowOpenRegisterModal] = useState(false);
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState<any>(null);

  // Forms
  const [openingBalance, setOpeningBalance] = useState("");
  const [actualBalance, setActualBalance] = useState("");
  
  const [newSale, setNewSale] = useState({
    branch_id: "",
    tutor_id: "",
    product_id: "",
    quantity: 1,
    unit_price: "",
    payment_method: "CASH"
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [tutorsList, branchesList, productsList, activeReg] = await Promise.all([
        api.getTutors(),
        api.getTenantBranches(),
        api.getProducts(),
        api.getMyActiveRegister().catch(() => null)
      ]);

      setTutors(tutorsList);
      setBranches(branchesList);
      setProducts(productsList);
      setActiveRegister(activeReg);
      
      setIsFallback(false);
      setSales([
        {
          id: "sale-a1",
          branch_id: "a2222222-2222-4222-a222-222222222222",
          tutor_id: "99999999-9999-9999-9999-999999999999",
          cashier_id: "11111111-1111-1111-1111-111111111111",
          total_amount: 350.0,
          status: "Pagada",
          invoice_number: "F-MX-40291",
          invoice_status: "Emitido",
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        }
      ]);
    } catch {
      setIsFallback(true);
      
      setBranches([
        { id: "a2222222-2222-4222-a222-222222222222", name: "Sede Principal San Martín", country: "MX" },
        { id: "b3333333-3333-4333-b333-333333333333", name: "Sede Única Del Bosque", country: "CO" }
      ]);
      setTutors([
        { id: "99999999-9999-9999-9999-999999999999", first_name: "Sofía", last_name: "Ramírez" }
      ]);
      setProducts([
        { id: "c2222222-2222-2222-2222-222222222222", name: "Amoxicilina (Suspensión)", unit_price: 350.00 }
      ]);
      setSales([
        {
          id: "sale-mock-1",
          branch_id: "a2222222-2222-4222-a222-222222222222",
          tutor_id: "99999999-9999-9999-9999-999999999999",
          cashier_id: "11111111-1111-1111-1111-111111111111",
          total_amount: 350.0,
          status: "Pagada",
          invoice_status: "No Emitido",
          created_at: new Date().toISOString()
        }
      ]);
      setActiveRegister({ id: "reg-mock-active", branch_id: "a2222222-2222-4222-a222-222222222222", opening_balance: 1500, expected_balance: 1500, status: "Abierta", opened_at: new Date().toISOString() });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasData = products.length > 0;
    loadData(!hasData);
    
    const unsubscribe = api.subscribe(() => {
      loadData(false); // Silent SWR background update
    });
    return () => unsubscribe();
  }, [loadData, products.length]);

  const handleOpenRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const activeUser = api.getActiveUser();
      const payload = {
        branch_id: newSale.branch_id || branches[0]?.id,
        opening_balance: parseFloat(openingBalance),
        cashier_id: activeUser?.id
      };

      if (isFallback) {
        setActiveRegister({
          id: `reg-mock-${Date.now()}`,
          branch_id: payload.branch_id,
          opening_balance: payload.opening_balance,
          expected_balance: payload.opening_balance,
          status: "Abierta",
          opened_at: new Date().toISOString()
        });
        setSuccessMsg("Caja registradora abierta con éxito (SIMULADO)");
        setShowOpenRegisterModal(false);
      } else {
        const reg = await api.openCashRegister(payload);
        setActiveRegister(reg);
        setSuccessMsg("Caja registradora abierta correctamente.");
        setShowOpenRegisterModal(false);
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al abrir caja");
    }
  }, [isFallback, newSale, branches, openingBalance, loadData]);

  const handleCloseRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const val = parseFloat(actualBalance);
      if (isFallback) {
        setActiveRegister(null);
        setSuccessMsg("Caja registradora cerrada y arqueada (SIMULADO)");
        setShowCloseRegisterModal(false);
      } else {
        await api.closeCashRegister(activeRegister.id, val);
        setSuccessMsg("Caja registradora cerrada y auditada correctamente.");
        setActiveRegister(null);
        setShowCloseRegisterModal(false);
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al realizar el arqueo");
    }
  }, [isFallback, activeRegister, actualBalance, loadData]);

  const handleCreateSale = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const qty = parseInt(newSale.quantity.toString());
      const price = parseFloat(newSale.unit_price);
      
      if (isFallback) {
        const mockNew = {
          id: `sale-mock-${Date.now()}`,
          branch_id: activeRegister?.branch_id || newSale.branch_id,
          tutor_id: newSale.tutor_id,
          total_amount: qty * price,
          status: "Pagada",
          invoice_status: "No Emitido",
          created_at: new Date().toISOString()
        };
        setSales(prev => [mockNew, ...prev]);
        setSuccessMsg("Venta registrada correctamente (SIMULADO)");
        setShowSaleModal(false);
        setNewSale({ branch_id: "", tutor_id: "", product_id: "", quantity: 1, unit_price: "", payment_method: "CASH" });
      } else {
        const payload = {
          branch_id: activeRegister.branch_id,
          tutor_id: newSale.tutor_id,
          product_id: newSale.product_id,
          quantity: qty,
          unit_price: price,
          payment_method: newSale.payment_method,
          cash_register_id: activeRegister.id
        };
        await api.createSale(payload);
        setSuccessMsg("Venta y egreso de inventario registrado.");
        setShowSaleModal(false);
        setNewSale({ branch_id: "", tutor_id: "", product_id: "", quantity: 1, unit_price: "", payment_method: "CASH" });
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al registrar la venta");
    }
  }, [isFallback, activeRegister, newSale, loadData]);

  const handleInvoiceSale = useCallback(async (sale: any) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (isFallback) {
        const isMX = branches.find(b => b.id === sale.branch_id)?.country === "MX";
        const mockResponse = isMX ? {
          provider: "SAT - México CFDI 4.0 Adapter (MOCK)",
          invoice_number: `SAT-CFDI-${Date.now()}`,
          cfdi_uuid: "99999999-AAAA-BBBB-CCCC-999999999999",
          xml_stamp: "MIIEzgIBAgIUMAwMDAwMDEwMDAwMDAwMDAwMDYwDQYJKoZIhvcNAQELBQAwggGyMTgwNgYDVQQDDC9BLk..."
        } : {
          provider: "DIAN - Colombia XML Adapter (MOCK)",
          invoice_number: `DIAN-FAC-${Date.now()}`,
          cufe: "cufe-dian-99999999999999999999999999999999",
          xml_signed: "FirmaDigitalDIAN-SignedByVetFlowSaaS-KeyHash..."
        };
        
        setSales(prev => prev.map(s => s.id === sale.id ? { ...s, invoice_status: "Emitido", invoice_number: mockResponse.invoice_number } : s));
        setShowInvoiceDetails(mockResponse);
        setSuccessMsg("Facturación electrónica emitida con éxito (SIMULADO)");
      } else {
        const res = await api.invoiceSale(sale.id);
        setShowInvoiceDetails(res);
        setSuccessMsg("Facturación electrónica emitida y sellada con éxito.");
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al emitir factura");
    }
  }, [isFallback, branches, loadData]);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="h-16 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-border/40 rounded-2xl glass-card overflow-hidden shadow-sm">
              <div className="h-12 skeleton-shimmer border-b border-border/20"></div>
              <div className="p-5 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
                ))}
              </div>
            </div>
          </div>
          <div className="h-96 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border/30 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Caja y Facturación</h2>
          <p className="text-xs text-muted-foreground mt-1">Abre el arqueo diario, registra ventas directas y timbra comprobantes fiscales.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {activeRegister ? (
            <button 
              onClick={() => { setShowCloseRegisterModal(true); setErrorMsg(""); setSuccessMsg(""); }}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 text-xs font-semibold shadow-sm shrink-0 min-h-[44px] cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Cerrar Caja (Arqueo)</span>
            </button>
          ) : (
            <button 
              onClick={() => { setShowOpenRegisterModal(true); setErrorMsg(""); setSuccessMsg(""); }}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-foreground/5 text-xs font-semibold shadow-sm shrink-0 min-h-[44px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir Turno Caja</span>
            </button>
          )}

          <button 
            onClick={() => { setShowSaleModal(true); setErrorMsg(""); setSuccessMsg(""); }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-md shadow-indigo-600/10 shrink-0 min-h-[44px] cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Registrar Venta</span>
          </button>
        </div>
      </div>

      {successMsg && <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-medium">{successMsg}</div>}
      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-medium flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 border border-border/40 rounded-2xl glass-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-foreground/[0.02] font-semibold text-foreground text-xs uppercase tracking-wider flex items-center space-x-2">
            <Coins className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
            <span>Historial de Cobros</span>
          </div>

          <div className="divide-y divide-border/30 overflow-y-auto max-h-[500px]">
            {sales.length === 0 ? (
              <div className="p-16 text-center text-muted-foreground space-y-3 bg-foreground/[0.01]">
                <Wallet className="w-10 h-10 mx-auto opacity-30 animate-pulse text-indigo-500" />
                <h4 className="font-bold text-foreground text-sm">Sin Cobros Registrados</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">No hay ventas registradas en la caja chica de la sucursal activa. Procesa una venta para comenzar.</p>
              </div>
            ) : (
              sales.map((sale) => {
                const branch = branches.find(b => b.id === sale.branch_id);
                const tutor = tutors.find(t => t.id === sale.tutor_id);
                const date = new Date(sale.created_at);

                return (
                  <div key={sale.id} className="p-5 hover:bg-foreground/[0.01] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-extrabold text-foreground text-base">Venta: ${parseFloat(sale.total_amount).toFixed(2)}</span>
                        <span className="bg-foreground/5 border border-border/40 px-2 py-0.5 rounded-lg text-[9px] font-bold text-muted-foreground font-mono">
                          {branch?.country === "MX" ? "MXN" : "COP"}
                        </span>
                      </div>
                      <div className="text-muted-foreground font-normal truncate">
                        Tutor: <b>{tutor?.first_name} {tutor?.last_name}</b> • Sucursal: {branch?.name || "Sede"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {date.toLocaleString("es-ES")}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end border-t border-border/30 pt-3 sm:pt-0 sm:border-none">
                      
                      <div className="text-left sm:text-right">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-wider block ${
                          sale.invoice_status === "Emitido" ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-500/10 text-muted-foreground"
                        }`}>{sale.invoice_status}</span>
                        {sale.invoice_number && (
                          <span className="text-[9px] font-mono text-muted-foreground mt-1.5 block">{sale.invoice_number}</span>
                        )}
                      </div>

                      {sale.invoice_status !== "Emitido" ? (
                        <button 
                          onClick={() => handleInvoiceSale(sale)}
                          className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 font-bold min-h-[38px] cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Facturar</span>
                        </button>
                      ) : (
                        <span className="p-2 text-emerald-500 bg-emerald-500/10 rounded-full shrink-0">
                          <CheckCircle2 className="w-4.5 h-4.5" />
                        </span>
                      )}

                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 rounded-xl border glass-card space-y-4 h-fit">
          <h3 className="font-bold text-foreground text-sm flex items-center space-x-2 border-b border-border/30 pb-3">
            <Printer className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>XML Sello Fiscal Emitido</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Muestra el timbrado de respuesta procesado por los adaptadores de la DIAN/SAT de VetFlow.
          </p>

          {showInvoiceDetails ? (
            <div className="bg-foreground/[0.02] border rounded-xl p-4 space-y-3.5 text-[11px] font-mono text-muted-foreground leading-relaxed break-all">
              <div className="flex items-center justify-between border-b border-border/30 pb-2 font-sans font-bold text-foreground">
                <span>{showInvoiceDetails.provider}</span>
                <span className="text-emerald-500">APROBADO</span>
              </div>
              <div>
                <span className="font-bold text-foreground font-sans">Folio Fiscal:</span>
                <p className="mt-1 bg-foreground/10 p-2 rounded text-[10px] select-all">{showInvoiceDetails.invoice_number}</p>
              </div>
              {showInvoiceDetails.cfdi_uuid && (
                <div>
                  <span className="font-bold text-foreground font-sans">UUID SAT:</span>
                  <p className="mt-1 bg-foreground/10 p-2 rounded text-[10px] select-all">{showInvoiceDetails.cfdi_uuid}</p>
                </div>
              )}
              {showInvoiceDetails.cufe && (
                <div>
                  <span className="font-bold text-foreground font-sans">CUFE DIAN:</span>
                  <p className="mt-1 bg-foreground/10 p-2 rounded text-[10px] select-all">{showInvoiceDetails.cufe}</p>
                </div>
              )}
              <div>
                <span className="font-bold text-foreground font-sans">Firma/Sello XML:</span>
                <p className="mt-1 bg-foreground/10 p-2 rounded text-[9px] line-clamp-3 select-all">
                  {showInvoiceDetails.xml_stamp || showInvoiceDetails.xml_signed}
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-xl p-10 text-center text-muted-foreground text-xs bg-foreground/[0.01]">
              <Printer className="w-10 h-10 mx-auto opacity-30 mb-2.5" />
              <span>Ninguna factura timbrada en esta sesión.</span>
            </div>
          )}
        </div>

      </div>

      {showOpenRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-foreground text-base">Abrir Turno de Caja Registradora</h3>
            <form onSubmit={handleOpenRegister} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Sucursal de Caja</label>
                <select required value={newSale.branch_id} onChange={e => setNewSale({...newSale, branch_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="">-- Elija Sucursal --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="text-black">{b.name} ({b.country})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground flex items-center space-x-1.5 font-semibold">
                  <DollarSign className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Fondo Fijo Inicial / Efectivo de Apertura</span>
                </label>
                <input type="number" step="0.01" required value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowOpenRegisterModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Abrir Turno</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showCloseRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-foreground text-base">Cerrar Caja Registradora</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Ingrese el efectivo total arqueado físicamente en caja chica. El backend auditará discrepancias.</p>
            <form onSubmit={handleCloseRegister} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-muted-foreground flex items-center space-x-1.5 font-semibold">
                  <DollarSign className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Efectivo Físico Arqueado</span>
                </label>
                <input type="number" step="0.01" required value={actualBalance} onChange={e => setActualBalance(e.target.value)} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowCloseRegisterModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Cerrar Turno</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showSaleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-foreground text-base">Registrar Cobro de Venta</h3>
            
            {!activeRegister && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs flex items-start space-x-2 leading-relaxed">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-500" />
                <span><b>Validación Requerida:</b> Debe abrir turno de caja primero para poder recibir e imputar cobros en sucursal.</span>
              </div>
            )}

            <form onSubmit={handleCreateSale} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Tutor (Comprador)</label>
                  <select required value={newSale.tutor_id} onChange={e => setNewSale({...newSale, tutor_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                    <option value="">-- Seleccionar --</option>
                    {tutors.map(t => (
                      <option key={t.id} value={t.id} className="text-black">{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Producto</label>
                  <select required value={newSale.product_id} onChange={e => setNewSale({...newSale, product_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                    <option value="">-- Seleccionar --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Cantidad</label>
                  <input type="number" required min="1" value={newSale.quantity} onChange={e => setNewSale({...newSale, quantity: parseInt(e.target.value)})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Precio Unitario ($)</label>
                  <input type="number" required min="1" value={newSale.unit_price} onChange={e => setNewSale({...newSale, unit_price: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Método de Pago</label>
                <select required value={newSale.payment_method} onChange={e => setNewSale({...newSale, payment_method: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="CASH" className="text-black">CASH (Efectivo)</option>
                  <option value="DEBIT_CARD" className="text-black">DEBIT CARD (Tarjeta Débito)</option>
                  <option value="CREDIT_CARD" className="text-black">CREDIT CARD (Tarjeta Crédito)</option>
                  <option value="BANK_TRANSFER" className="text-black">BANK TRANSFER (Transferencia Bancaria)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowSaleModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" disabled={!activeRegister} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 disabled:opacity-45 min-h-[44px] cursor-pointer">Registrar Venta</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
