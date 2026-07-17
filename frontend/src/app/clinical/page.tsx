"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Stethoscope, 
  Plus, 
  Search, 
  Lock, 
  LockOpen, 
  FileText, 
  AlertTriangle, 
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { api } from "../../lib/api";

export default function ClinicalPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>(() => api.getCached("/api/v1/clinical/diagnoses") || []);
  const [pets, setPets] = useState<any[]>(() => api.getCached("/api/v1/patients/pets") || []);
  const [branches, setBranches] = useState<any[]>(() => api.getCached("/api/v1/tenants/branches") || []);
  const [products, setProducts] = useState<any[]>(() => api.getCached("/api/v1/inventory/products") || []);
  
  const [isLoading, setIsLoading] = useState(() => !api.getCached("/api/v1/clinical/diagnoses"));
  const [isFallback, setIsFallback] = useState(false);

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  // Forms
  const [newRecord, setNewRecord] = useState({
    pet_id: "",
    branch_id: "",
    anamnesis: "",
    physical_examination: "",
    diagnosis_id: "",
    diagnosis_notes: "",
    treatment_plan: "",
    consent_signed: false
  });

  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [newRecipe, setNewRecipe] = useState({
    product_id: "",
    dosage: "",
    quantity: 1,
    is_controlled: false
  });

  // Edit fields for opened records
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editTreatmentPlan, setEditTreatmentPlan] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [diagnosesList, petsList, branchesList, productsList] = await Promise.all([
        api.getDiagnoses(),
        api.getPets(),
        api.getTenantBranches(),
        api.getProducts()
      ]);
      setDiagnoses(diagnosesList);
      setPets(petsList);
      setBranches(branchesList);
      setProducts(productsList);
      
      setIsFallback(false);
      // Custom EMR Evolution state
      setRecords([
        {
          id: "99999999-9999-9999-9999-999999999999",
          pet_id: "99999999-9999-9999-9999-999999999999",
          branch_id: "a2222222-2222-4222-a222-222222222222",
          veterinarian_id: "22222222-2222-2222-2222-222222222222",
          anamnesis: "Paciente decaído, no come desde hace 24 horas.",
          physical_examination: "Mucosas pálidas, dolor abdominal a la palpación profunda.",
          diagnosis_id: "d1111111-0000-0000-0000-000000000003", // Gastroenteritis
          diagnosis_notes: "Gastroenteritis bacteriana aguda sospechada.",
          treatment_plan: "Administrar suero oral y antibióticos.",
          status: "Abierto",
          consent_signed: true,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
        }
      ]);
    } catch {
      setIsFallback(true);
      
      setBranches([{ id: "a2222222-2222-4222-a222-222222222222", name: "Sede Principal" }]);
      setPets([{ id: "99999999-9999-9999-9999-999999999999", name: "Toby" }]);
      setDiagnoses([
        { id: "d1111111-0000-0000-0000-000000000001", code: "DIAG-001", name: "Control sano", category: "Preventivo" },
        { id: "d1111111-0000-0000-0000-000000000003", code: "DIAG-003", name: "Gastroenteritis", category: "Digestivo" }
      ]);
      setProducts([
        { id: "c1111111-1111-1111-1111-111111111111", name: "Fentanilo (Inyectable)", is_controlled: true }
      ]);
      setRecords([
        {
          id: "99999999-9999-9999-9999-999999999999",
          pet_id: "99999999-9999-9999-9999-999999999999",
          branch_id: "a2222222-2222-4222-a222-222222222222",
          veterinarian_id: "22222222-2222-2222-2222-222222222222",
          anamnesis: "Paciente decaído, no come desde hace 24 horas.",
          physical_examination: "Mucosas pálidas, dolor abdominal a la palpación profunda.",
          diagnosis_id: "d1111111-0000-0000-0000-000000000003",
          diagnosis_notes: "Gastroenteritis bacteriana aguda sospechada.",
          treatment_plan: "Administrar suero oral y antibióticos.",
          status: "Abierto",
          consent_signed: true,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
        }
      ]);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasCache = diagnoses.length > 0;
    loadData(!hasCache);
    
    const unsubscribe = api.subscribe(() => {
      loadData(false); // background revalidation (0ms UI latency)
    });
    return () => unsubscribe();
  }, [loadData, diagnoses.length]);

  const handleCreateRecord = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (isFallback) {
        const mockNew = {
          id: `rec-mock-${Date.now()}`,
          veterinarian_id: api.getActiveUser()?.id,
          status: "Abierto",
          created_at: new Date().toISOString(),
          ...newRecord
        };
        setRecords(prev => [mockNew, ...prev]);
        setSuccessMsg("Evolución médica abierta con éxito (SIMULADO)");
        setShowRecordModal(false);
        setNewRecord({ pet_id: "", branch_id: "", anamnesis: "", physical_examination: "", diagnosis_id: "", diagnosis_notes: "", treatment_plan: "", consent_signed: false });
      } else {
        await api.createClinicalRecord(newRecord);
        setSuccessMsg("Expediente de evolución abierta correctamente.");
        setShowRecordModal(false);
        setNewRecord({ pet_id: "", branch_id: "", anamnesis: "", physical_examination: "", diagnosis_id: "", diagnosis_notes: "", treatment_plan: "", consent_signed: false });
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al abrir evolución");
    }
  }, [isFallback, newRecord, loadData]);

  const handleUpdateRecord = useCallback(async (recordId: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (isFallback) {
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, treatment_plan: editTreatmentPlan } : r));
        setSuccessMsg("Tratamiento actualizado (SIMULADO)");
        setEditingRecordId(null);
      } else {
        await api.updateClinicalRecord(recordId, { treatment_plan: editTreatmentPlan });
        setSuccessMsg("Tratamiento actualizado correctamente.");
        setEditingRecordId(null);
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al actualizar tratamiento");
    }
  }, [isFallback, editTreatmentPlan, loadData]);

  const handleSealRecord = useCallback(async (recordId: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (isFallback) {
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: "Sellado", closed_at: new Date().toISOString() } : r));
        setSuccessMsg("Expediente sealado e inmutable con éxito (SIMULADO)");
      } else {
        await api.sealClinicalRecord(recordId);
        setSuccessMsg("Expediente clínico sellado correctamente. Inmutabilidad de datos activa.");
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al sellar el expediente");
    }
  }, [isFallback, loadData]);

  const handleOpenRecipe = useCallback((rec: any) => {
    setActiveRecordId(rec.id);
    setErrorMsg("");
    setSuccessMsg("");
    setShowRecipeModal(true);
  }, []);

  const handleCreatePrescription = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const activeUser = api.getActiveUser();
      
      if (isFallback) {
        if (newRecipe.is_controlled && !activeUser?.professional_license) {
          throw new Error("Business Rule Violation (BR-CL-002): Se requiere cédula profesional del veterinario emisor para firmar recetas de fármacos controlados.");
        }
        setSuccessMsg("Receta emitida con éxito (SIMULADO)");
        setShowRecipeModal(false);
        setNewRecipe({ product_id: "", dosage: "", quantity: 1, is_controlled: false });
      } else {
        const payload = {
          clinical_record_id: activeRecordId,
          product_id: newRecipe.product_id,
          dosage: newRecipe.dosage,
          quantity: newRecipe.quantity,
          is_controlled: newRecipe.is_controlled,
          veterinarian_id: activeUser?.id
        };
        await api.createPrescription(payload);
        setSuccessMsg("Receta médica registrada y emitida correctamente.");
        setShowRecipeModal(false);
        setNewRecipe({ product_id: "", dosage: "", quantity: 1, is_controlled: false });
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al emitir la receta");
    }
  }, [isFallback, activeRecordId, newRecipe, loadData]);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="h-16 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-8 skeleton-shimmer w-48 rounded-lg"></div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-72 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
            ))}
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
          <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Expediente Clínico EMR</h2>
          <p className="text-xs text-muted-foreground mt-1">Abre consultas de evolución, receta fármacos y sella registros inmutables.</p>
        </div>
        <button 
          onClick={() => { setShowRecordModal(true); setErrorMsg(""); setSuccessMsg(""); }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-md shadow-indigo-600/10 shrink-0 min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Apertura de Evolución</span>
        </button>
      </div>

      {successMsg && <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-medium">{successMsg}</div>}
      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-medium flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center space-x-2 border-b border-border/30 pb-3">
            <FileText className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
            <span>Consultas Clínicas de Turno</span>
          </h3>

          <div className="space-y-6">
            {records.length === 0 ? (
              <div className="border border-dashed rounded-2xl p-12 text-center text-muted-foreground space-y-3 bg-foreground/[0.01]">
                <Stethoscope className="w-10 h-10 mx-auto opacity-30 animate-pulse text-indigo-500" />
                <h4 className="font-bold text-foreground text-sm">Sin Historial Clínico</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">No hay registros de evolución en el turno actual. Abre un nuevo expediente clínico para comenzar.</p>
              </div>
            ) : (
              records.map((rec) => {
                const pet = pets.find(p => p.id === rec.pet_id);
                const branch = branches.find(b => b.id === rec.branch_id);
                const diag = diagnoses.find(d => d.id === rec.diagnosis_id);
                const isOpen = rec.status === "Abierto";

                return (
                  <div key={rec.id} className="p-5 md:p-6 rounded-xl border border-border/40 glass-card premium-card space-y-5 relative">
                    
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      <span className={`flex items-center space-x-1 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isOpen ? "bg-indigo-500/10 text-indigo-500" : "bg-zinc-500/20 text-muted-foreground"
                      }`}>
                        {isOpen ? <LockOpen className="w-3.5 h-3.5 mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
                        <span>{rec.status}</span>
                      </span>
                    </div>

                    <div className="space-y-1.5 pr-20">
                      <h4 className="font-bold text-foreground text-base">Consulta de {pet?.name || "Paciente"}</h4>
                      <div className="text-[10px] text-muted-foreground">
                        Sede: {branch?.name || "Sucursal"} • Creado el: {new Date(rec.created_at).toLocaleString("es-ES")}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                      <div className="space-y-1.5 bg-foreground/[0.01] p-4 rounded-xl border border-border/30">
                        <span className="font-bold text-foreground/80 block">Anamnesis</span>
                        <p className="text-muted-foreground leading-relaxed">{rec.anamnesis}</p>
                      </div>
                      <div className="space-y-1.5 bg-foreground/[0.01] p-4 rounded-xl border border-border/30">
                        <span className="font-bold text-foreground/80 block">Examen Físico</span>
                        <p className="text-muted-foreground leading-relaxed">{rec.physical_examination}</p>
                      </div>
                    </div>

                    <div className="space-y-2 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 text-xs">
                      <span className="font-bold text-indigo-500 block">Diagnóstico Estandarizado</span>
                      <div className="font-semibold text-foreground flex items-center space-x-2 mt-1">
                        <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold">{diag?.code || "DIAG"}</span>
                        <span>{diag?.name || "Diagnóstico"} ({diag?.category})</span>
                      </div>
                      {rec.diagnosis_notes && (
                        <p className="text-muted-foreground leading-relaxed mt-2 border-t border-indigo-500/10 pt-2 text-[11px]">
                          Observaciones libres: <b className="text-foreground/80 font-normal">{rec.diagnosis_notes}</b>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <span className="font-bold text-foreground block">Plan de Tratamiento</span>
                      {editingRecordId === rec.id ? (
                        <div className="space-y-2.5 mt-1">
                          <textarea 
                            value={editTreatmentPlan} 
                            onChange={(e) => setEditTreatmentPlan(e.target.value)} 
                            className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-20 focus-visible:ring-2 focus-visible:ring-indigo-600 resize-none"
                          />
                          <div className="flex items-center space-x-2 justify-end">
                            <button onClick={() => setEditingRecordId(null)} className="px-3.5 py-2 border rounded-xl text-[11px] hover:bg-foreground/5 min-h-[38px] cursor-pointer">Cancelar</button>
                            <button onClick={() => handleUpdateRecord(rec.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-[11px] shadow-sm min-h-[38px] cursor-pointer">Guardar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4 p-3.5 bg-foreground/[0.01] rounded-xl border border-dashed border-border/60">
                          <p className="text-muted-foreground leading-relaxed">{rec.treatment_plan || "Sin plan de tratamiento registrado."}</p>
                          {isOpen && (
                            <button 
                              onClick={() => { setEditingRecordId(rec.id); setEditTreatmentPlan(rec.treatment_plan || ""); }}
                              className="text-xs text-indigo-500 hover:underline font-bold shrink-0 min-h-[38px] px-2 flex items-center"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {!isOpen && rec.closed_at && (
                      <div className="p-3.5 bg-zinc-500/10 border border-zinc-500/20 text-muted-foreground rounded-xl text-[10px] flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500" />
                        <span className="leading-relaxed">Sello Clínico Inmutable registrado el: <b>{new Date(rec.closed_at).toLocaleString("es-ES")}</b>. Este expediente no admite modificaciones regulatorias de acuerdo a la Ley de Salud Animal.</span>
                      </div>
                    )}

                    {isOpen && (
                      <div className="pt-4 border-t border-border/30 flex flex-wrap items-center justify-end gap-3">
                        <button 
                          onClick={() => handleOpenRecipe(rec)}
                          className="px-4 py-2.5 rounded-xl border border-border/40 bg-card hover:bg-foreground/5 text-xs font-semibold shadow-sm min-h-[44px] cursor-pointer"
                        >
                          Emitir Receta
                        </button>
                        <button 
                          onClick={() => handleSealRecord(rec.id)}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer"
                        >
                          Sellar Consulta (Cerrar)
                        </button>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 rounded-xl border glass-card space-y-4 h-fit">
          <h3 className="font-bold text-foreground text-sm flex items-center space-x-2 border-b border-border/30 pb-3">
            <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Catálogo de Diagnósticos</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Catálogo global precargado mediante Seeds de VetFlow.
          </p>

          <div className="space-y-3.5 overflow-y-auto max-h-[450px] pr-1">
            {diagnoses.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No hay diagnósticos cargados.</p>
            ) : (
              diagnoses.map((diag) => (
                <div key={diag.id} className="p-3 bg-foreground/[0.02] border rounded-xl text-[11px] flex flex-col space-y-1.5 transition-colors hover:bg-foreground/[0.04]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground font-mono">{diag.code}</span>
                    <span className="bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider">{diag.category}</span>
                  </div>
                  <span className="font-bold text-foreground/80 text-xs leading-normal">{diag.name}</span>
                  {diag.description && <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{diag.description}</p>}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {showRecordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-foreground text-base">Apertura de Evolución Médica</h3>
            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Paciente (Mascota)</label>
                  <select required value={newRecord.pet_id} onChange={e => setNewRecord({...newRecord, pet_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                    <option value="">-- Seleccionar --</option>
                    {pets.map(p => (
                      <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Sucursal</label>
                  <select required value={newRecord.branch_id} onChange={e => setNewRecord({...newRecord, branch_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                    <option value="">-- Seleccionar --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id} className="text-black">{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Diagnóstico Estandarizado</label>
                <select required value={newRecord.diagnosis_id} onChange={e => setNewRecord({...newRecord, diagnosis_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="">-- Buscar en Catálogo --</option>
                  {diagnoses.map(d => (
                    <option key={d.id} value={d.id} className="text-black">{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Observaciones / Nota Médica Libre</label>
                <textarea required placeholder="Sintomatología específica, comentarios del diagnóstico..." value={newRecord.diagnosis_notes} onChange={e => setNewRecord({...newRecord, diagnosis_notes: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-16 resize-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Anamnesis</label>
                <textarea required placeholder="Historial, consultas previas..." value={newRecord.anamnesis} onChange={e => setNewRecord({...newRecord, anamnesis: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-16 resize-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Examen Físico</label>
                <textarea required placeholder="Constantes fisiológicas, palpación..." value={newRecord.physical_examination} onChange={e => setNewRecord({...newRecord, physical_examination: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-16 resize-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Plan de Tratamiento</label>
                <textarea required placeholder="Medicamentos, dosis, recomendaciones..." value={newRecord.treatment_plan} onChange={e => setNewRecord({...newRecord, treatment_plan: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-16 resize-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              </div>

              <div className="flex items-center space-x-2.5 py-1">
                <input type="checkbox" id="consent" checked={newRecord.consent_signed} onChange={e => setNewRecord({...newRecord, consent_signed: e.target.checked})} className="rounded bg-foreground/5 text-indigo-600 w-4 h-4" />
                <label htmlFor="consent" className="text-muted-foreground font-semibold selection:bg-indigo-500/20 select-none">Consentimiento firmado por el tutor</label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowRecordModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Abrir Expediente</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-foreground text-base">Emitir Receta Médica</h3>
            
            <div className="bg-foreground/[0.02] border border-border/30 rounded-xl p-4 space-y-1.5 text-xs">
              <div className="font-bold text-foreground flex items-center space-x-2">
                <Award className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                <span>Veterinario Emisor</span>
              </div>
              <p className="text-muted-foreground mt-0.5">
                {api.getActiveUser()?.name} • Cédula: <b>{api.getActiveUser()?.professional_license || "Ninguna registrada"}</b>
              </p>
            </div>

            <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Seleccionar Producto / Vademécum</label>
                <select required value={newRecipe.product_id} onChange={e => setNewRecipe({...newRecipe, product_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="">-- Buscar Fármaco --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Cantidad Recetada</label>
                  <input type="number" required min="1" value={newRecipe.quantity} onChange={e => setNewRecipe({...newRecipe, quantity: parseInt(e.target.value)})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Fármaco Controlado</label>
                  <div className="flex items-center h-11">
                    <input type="checkbox" id="controlled" checked={newRecipe.is_controlled} onChange={e => setNewRecipe({...newRecipe, is_controlled: e.target.checked})} className="rounded bg-foreground/5 text-indigo-600 w-4 h-4 shrink-0" />
                    <label htmlFor="controlled" className="text-rose-500 font-bold ml-2.5 select-none">¿Requiere Regulación?</label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Instrucciones de Posología</label>
                <textarea required placeholder="Frecuencia, vía de administración y duración..." value={newRecipe.dosage} onChange={e => setNewRecipe({...newRecipe, dosage: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-20 resize-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              </div>

              {newRecipe.is_controlled && !api.getActiveUser()?.professional_license && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[10px] flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><b>Advertencia de Bloqueo (BR-CL-002):</b> No tienes una matrícula cargada en tu sesión activa. Al intentar emitir esta receta de fármaco controlado, el motor de base de datos rechazará la transacción por reglas sanitarias.</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowRecipeModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Firmar y Emitir</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
