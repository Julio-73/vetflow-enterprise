"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ShieldAlert, 
  CalendarDays,
  FileCheck
} from "lucide-react";
import { api } from "../../lib/api";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>(() => api.getCached("/api/v1/inventory/products") || []);
  const [stocks, setStocks] = useState<any[]>(() => api.getCached("/api/v1/inventory/stocks") || []);
  const [batches, setBatches] = useState<any[]>(() => api.getCached("/api/v1/inventory/batches") || []);
  const [branches, setBranches] = useState<any[]>(() => api.getCached("/api/v1/tenants/branches") || []);
  
  const [isLoading, setIsLoading] = useState(() => !api.getCached("/api/v1/inventory/products"));
  const [searchQuery, setSearchQuery] = useState("");
  const [isFallback, setIsFallback] = useState(false);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);

  // Forms
  const [newProduct, setNewProduct] = useState({
    sku: "",
    name: "",
    description: "",
    category: "Medicamento",
    is_controlled: false,
    requires_prescription: false,
    unit_of_measure: "Caja",
    minimum_stock: 10,
    is_active: true
  });

  const [newTx, setNewTx] = useState({
    branch_id: "",
    product_id: "",
    batch_id: "",
    quantity: "",
    transaction_type: "Compra",
    notes: ""
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [productsList, stocksList, batchesList, branchesList] = await Promise.all([
        api.getProducts(),
        api.getStocks(),
        api.getBatches(),
        api.getTenantBranches()
      ]);
      setProducts(productsList);
      setStocks(stocksList);
      setBatches(batchesList);
      setBranches(branchesList);
      setIsFallback(false);
    } catch {
      setIsFallback(true);
      
      setBranches([{ id: "a2222222-2222-4222-a222-222222222222", name: "Sede Principal San Martín" }]);
      setProducts([
        { id: "c1111111-1111-1111-1111-111111111111", sku: "MED-001", name: "Fentanilo (Inyectable)", category: "Medicamento Controlado", is_controlled: true, requires_prescription: true, minimum_stock: 15.0 },
        { id: "c2222222-2222-2222-2222-222222222222", sku: "MED-002", name: "Amoxicilina (Suspensión)", category: "Medicamento", is_controlled: false, requires_prescription: true, minimum_stock: 50.0 }
      ]);
      setBatches([
        { id: "e2222222-2222-2222-2222-222222222222", product_id: "c1111111-1111-1111-1111-111111111111", batch_number: "LOT-FENT-002", expiration_date: "2026-10-01" },
        { id: "e1111111-1111-1111-1111-111111111111", product_id: "c1111111-1111-1111-1111-111111111111", batch_number: "LOT-FENT-001", expiration_date: "2027-01-01" }
      ]);
      setStocks([
        { branch_id: "a2222222-2222-4222-a222-222222222222", product_id: "c1111111-1111-1111-1111-111111111111", batch_id: "e2222222-2222-2222-2222-222222222222", quantity: 8.0, requires_reorder: true }
      ]);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasCache = products.length > 0;
    loadData(!hasCache);
    
    const unsubscribe = api.subscribe(() => {
      loadData(false); // Silent SWR background update
    });
    return () => unsubscribe();
  }, [loadData, products.length]);

  const handleCreateProduct = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (isFallback) {
        const mockNew = {
          id: `prod-mock-${Date.now()}`,
          tenant_id: api.getActiveUser()?.tenant_id,
          ...newProduct
        };
        setProducts(prev => [mockNew, ...prev]);
        setSuccessMsg("Producto registrado en catálogo (SIMULADO)");
        setShowProductModal(false);
        setNewProduct({ sku: "", name: "", description: "", category: "Medicamento", is_controlled: false, requires_prescription: false, unit_of_measure: "Caja", minimum_stock: 10, is_active: true });
      } else {
        await api.createProduct(newProduct);
        setSuccessMsg("Producto registrado en catálogo con éxito.");
        setShowProductModal(false);
        setNewProduct({ sku: "", name: "", description: "", category: "Medicamento", is_controlled: false, requires_prescription: false, unit_of_measure: "Caja", minimum_stock: 10, is_active: true });
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al registrar producto");
    }
  }, [isFallback, newProduct, loadData]);

  const handleCreateTransaction = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const activeUser = api.getActiveUser();

      if (["Ajuste Merma", "Ajuste Faltante"].includes(newTx.transaction_type)) {
        const isAdmin = ["DirectorClinico", "TenantOwner", "SuperAdmin"].includes(activeUser?.role || "");
        if (!isAdmin) {
          throw new Error("Security Restriction (BR-INV-004): Manual adjustments require an authorized role (DirectorClinico, TenantOwner, SuperAdmin).");
        }
        
        if (!newTx.notes || newTx.notes.trim().length < 15) {
          throw new Error("Audit Violation (BR-INV-004): Manual stock adjustments require a detailed justification (min 15 characters).");
        }
      }

      if (isFallback) {
        const qty = parseFloat(newTx.quantity);
        const matchedStock = stocks.find(
          s => s.product_id === newTx.product_id && 
          s.batch_id === newTx.batch_id && 
          s.branch_id === newTx.branch_id
        );

        if (matchedStock) {
          const delta = ["Compra"].includes(newTx.transaction_type) ? qty : -qty;
          matchedStock.quantity = Math.max(0, matchedStock.quantity + delta);
        } else {
          stocks.push({
            branch_id: newTx.branch_id,
            product_id: newTx.product_id,
            batch_id: newTx.batch_id,
            quantity: qty,
            requires_reorder: false
          });
        }
        
        setSuccessMsg("Movimiento de inventario procesado (SIMULADO)");
        setShowTxModal(false);
        setNewTx({ branch_id: "", product_id: "", batch_id: "", quantity: "", transaction_type: "Compra", notes: "" });
      } else {
        const qty = parseFloat(newTx.quantity);
        const payload = {
          branch_id: newTx.branch_id,
          product_id: newTx.product_id,
          batch_id: newTx.batch_id,
          quantity: qty,
          transaction_type: newTx.transaction_type,
          notes: newTx.notes,
          created_by: activeUser?.id
        };
        await api.createInventoryTransaction(payload);
        setSuccessMsg("Movimiento de inventario procesado correctamente.");
        setShowTxModal(false);
        setNewTx({ branch_id: "", product_id: "", batch_id: "", quantity: "", transaction_type: "Compra", notes: "" });
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al registrar movimiento");
    }
  }, [isFallback, newTx, stocks, loadData]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="h-16 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-12 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
            <div className="border border-border/40 rounded-2xl glass-card overflow-hidden shadow-sm">
              <div className="h-12 skeleton-shimmer border-b border-border/20"></div>
              <div className="p-5 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
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
          <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Farmacia e Inventarios</h2>
          <p className="text-xs text-muted-foreground mt-1">Monitorea el stock disponible, lotes por FEFO y justifica mermas bajo auditoría.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => { setShowProductModal(true); setErrorMsg(""); setSuccessMsg(""); }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-foreground/5 text-xs font-semibold shadow-sm shrink-0 min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
          <button 
            onClick={() => { setShowTxModal(true); setErrorMsg(""); setSuccessMsg(""); }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-md shadow-indigo-600/10 shrink-0 min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Movimiento de Stock</span>
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
        
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex items-center space-x-3 border rounded-xl px-4 py-3 bg-foreground/[0.02] shadow-sm">
            <Search className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar producto por SKU, nombre o categoría..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="border border-border/40 rounded-2xl glass-card overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-foreground/[0.02] font-semibold text-foreground text-xs uppercase tracking-wider flex items-center space-x-2">
              <Package className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <span>Catálogo de Almacén Consolidado</span>
            </div>

            <div className="divide-y divide-border/30 overflow-y-auto max-h-[500px]">
              {filteredProducts.length === 0 ? (
                <div className="p-16 text-center text-muted-foreground space-y-3 bg-foreground/[0.01]">
                  <Package className="w-10 h-10 mx-auto opacity-30 animate-pulse text-indigo-500" />
                  <h4 className="font-bold text-foreground text-sm">Almacén de Farmacia Vacío</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">No hay insumos ni medicamentos registrados. Haz clic en "Nuevo Producto" para comenzar.</p>
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const prodStocks = stocks.filter(s => s.product_id === prod.id);
                  const totalStock = prodStocks.reduce((sum, s) => sum + parseFloat(s.quantity), 0);
                  const requiresReorder = prodStocks.some(s => s.requires_reorder) || totalStock <= prod.minimum_stock;

                  return (
                    <div key={prod.id} className="p-5 hover:bg-foreground/[0.01] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                          <span className="bg-foreground/5 border border-border/40 px-2 py-0.5 rounded-lg text-[9.5px] font-bold text-muted-foreground font-mono">{prod.sku}</span>
                          <h4 className="font-bold text-foreground text-sm truncate">{prod.name}</h4>
                        </div>
                        {prod.description && <p className="text-muted-foreground font-normal leading-relaxed">{prod.description}</p>}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <span>Categoría: <b className="text-foreground/80 font-medium">{prod.category}</b></span>
                          <span>•</span>
                          <span>Unidad: {prod.unit_of_measure}</span>
                          {prod.is_controlled && <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold px-2 py-0.5 rounded-full uppercase text-[8.5px] tracking-wider">Controlado</span>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end border-t border-border/30 pt-3 sm:pt-0 sm:border-none">
                        <div className="text-left sm:text-right">
                          <div className="text-[9.5px] text-muted-foreground font-bold uppercase tracking-wider leading-none">Stock Físico:</div>
                          <div className="text-xl font-black text-foreground mt-1.5 leading-none">
                            {totalStock.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">{prod.unit_of_measure}s</span>
                          </div>
                        </div>

                        {requiresReorder && (
                          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[8.5px] font-bold uppercase tracking-wider animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Reorden</span>
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

        <div className="p-6 rounded-xl border glass-card space-y-4 h-fit">
          <h3 className="font-bold text-foreground text-sm flex items-center space-x-2 border-b border-border/30 pb-3">
            <CalendarDays className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Lotes por FEFO (Vencimiento)</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Orden de despacho prioritario por fecha de caducidad ascendente.
          </p>

          <div className="space-y-4 overflow-y-auto max-h-[450px] pr-1">
            {batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <CalendarDays className="w-8 h-8 mx-auto opacity-35" />
                <p className="text-xs">No hay lotes con fecha de expiración.</p>
              </div>
            ) : (
              batches.map((batch) => {
                const prod = products.find(p => p.id === batch.product_id);
                const isExpired = new Date(batch.expiration_date).getTime() < Date.now();
                return (
                  <div key={batch.id} className="p-4 bg-foreground/[0.02] border rounded-xl text-xs space-y-2 transition-colors hover:bg-foreground/[0.04]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground text-xs font-mono">{batch.batch_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isExpired ? "bg-rose-500/10 text-rose-500 animate-pulse" : "bg-indigo-500/10 text-indigo-500"
                      }`}>
                        {isExpired ? "Vencido" : "Activo"}
                      </span>
                    </div>
                    
                    <p className="font-bold text-foreground/80 truncate text-xs">{prod?.name || "Medicamento"}</p>
                    
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between border-t border-border/30 pt-2 mt-1">
                      <span>Expiración:</span>
                      <span className="font-mono font-semibold text-foreground">{batch.expiration_date}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-foreground text-base">Registrar Nuevo Producto en Catálogo</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">SKU / Código</label>
                  <input type="text" required value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Nombre del Producto</label>
                  <input type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Categoría</label>
                <select required value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="Medicamento" className="text-black">Medicamento</option>
                  <option value="Medicamento Controlado" className="text-black">Medicamento Controlado</option>
                  <option value="Insumo" className="text-black">Insumo</option>
                  <option value="Alimento" className="text-black">Alimento</option>
                  <option value="Servicio" className="text-black">Servicio</option>
                  <option value="Otros" className="text-black">Otros</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Unidad de Medida</label>
                  <input type="text" required placeholder="Caja, Frasco, Unidad..." value={newProduct.unit_of_measure} onChange={e => setNewProduct({...newProduct, unit_of_measure: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Stock Mínimo (Reorden)</label>
                  <input type="number" required min="1" value={newProduct.minimum_stock} onChange={e => setNewProduct({...newProduct, minimum_stock: parseFloat(e.target.value)})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center space-x-2.5">
                  <input type="checkbox" id="controlled_prod" checked={newProduct.is_controlled} onChange={e => setNewProduct({...newProduct, is_controlled: e.target.checked})} className="rounded bg-foreground/5 text-indigo-600 w-4 h-4" />
                  <label htmlFor="controlled_prod" className="text-rose-500 font-bold select-none">Fármaco Controlado</label>
                </div>
                <div className="flex items-center space-x-2.5">
                  <input type="checkbox" id="prescription_prod" checked={newProduct.requires_prescription} onChange={e => setNewProduct({...newProduct, requires_prescription: e.target.checked})} className="rounded bg-foreground/5 text-indigo-600 w-4 h-4" />
                  <label htmlFor="prescription_prod" className="text-muted-foreground font-semibold select-none">Requiere Receta</label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Descripción</label>
                <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-16 resize-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Guardar</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showTxModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-foreground text-base">Registrar Movimiento de Inventario</h3>
            
            <div className="bg-foreground/[0.02] border border-border/30 rounded-xl p-4 space-y-1.5 text-xs">
              <div className="font-bold text-foreground flex items-center space-x-2">
                <FileCheck className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                <span>Auditor de Transacción</span>
              </div>
              <p className="text-muted-foreground">
                Usuario activo: <b>{api.getActiveUser()?.name}</b> • Rol: {api.getActiveUser()?.role}
              </p>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Sucursal</label>
                <select required value={newTx.branch_id} onChange={e => setNewTx({...newTx, branch_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="">-- Seleccionar --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="text-black">{b.name} ({b.country})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Producto</label>
                <select required value={newTx.product_id} onChange={e => setNewTx({...newTx, product_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="">-- Seleccionar --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="text-black">{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Lote</label>
                  <select required value={newTx.batch_id} onChange={e => setNewTx({...newTx, batch_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                    <option value="">-- Seleccionar Lote --</option>
                    {batches.filter(b => b.product_id === newTx.product_id).map(b => (
                      <option key={b.id} value={b.id} className="text-black">{b.batch_number} (Exp: {b.expiration_date})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Cantidad</label>
                  <input type="number" step="0.0001" required min="1" value={newTx.quantity} onChange={e => setNewTx({...newTx, quantity: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Tipo de Transacción</label>
                <select required value={newTx.transaction_type} onChange={e => setNewTx({...newTx, transaction_type: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="Compra" className="text-black">Compra (Ingreso)</option>
                  <option value="Consumo Clinico" className="text-black">Consumo Clínico (Salida)</option>
                  <option value="Ajuste Merma" className="text-black font-semibold text-rose-500">Ajuste Merma (Pérdida - Admins)</option>
                  <option value="Ajuste Faltante" className="text-black font-semibold text-rose-500">Ajuste Faltante (Pérdida - Admins)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Justificación / Notas de Auditoría</label>
                <textarea required placeholder="Justifique ampliamente el ajuste de stock (mínimo 15 caracteres para mermas)..." value={newTx.notes} onChange={e => setNewTx({...newTx, notes: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-16 resize-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              </div>

              {["Ajuste Merma", "Ajuste Faltante"].includes(newTx.transaction_type) && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[10px] space-y-1.5">
                  <div className="font-bold uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Control de Auditoría Activo (BR-INV-004)</span>
                  </div>
                  <p className="leading-relaxed">
                    Las mermas manuales exigen rol administrativo. Si simulas con **María López (Recepcionista)** o colocas notas cortas, el backend bloqueará la transacción.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowTxModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Procesar Movimiento</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
