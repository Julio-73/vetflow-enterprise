"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Calendar, 
  Plus, 
  Clock, 
  AlertCircle, 
  User, 
  Activity, 
  Scale, 
  Thermometer, 
  Heart, 
  CheckCircle 
} from "lucide-react";
import { api } from "../../lib/api";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>(() => api.getCached("/api/v1/appointments") || []);
  const [pets, setPets] = useState<any[]>(() => api.getCached("/api/v1/patients/pets") || []);
  const [branches, setBranches] = useState<any[]>(() => api.getCached("/api/v1/tenants/branches") || []);
  const [users, setUsers] = useState<any[]>(() => api.getCached("/api/v1/tenants/users") || []);
  
  const [isLoading, setIsLoading] = useState(() => !api.getCached("/api/v1/appointments"));
  const [isFallback, setIsFallback] = useState(false);

  // Modals
  const [showApptModal, setShowApptModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  
  // Forms
  const [newAppt, setNewAppt] = useState({
    branch_id: "",
    pet_id: "",
    veterinarian_id: "",
    appointment_date: "",
    reason_for_visit: ""
  });

  const [triageApptId, setTriageApptId] = useState<string | null>(null);
  const [triagePetId, setTriagePetId] = useState<string | null>(null);
  const [newTriage, setNewTriage] = useState({
    temperature: "",
    heart_rate: "",
    respiratory_rate: "",
    weight: "",
    triage_level: "Control",
    reason: ""
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [apptsList, petsList, branchesList, usersList] = await Promise.all([
        api.getAppointments(),
        api.getPets(),
        api.getTenantBranches(),
        api.getTenantUsers()
      ]);
      setAppointments(apptsList);
      setPets(petsList);
      setBranches(branchesList);
      setUsers(usersList);
      setIsFallback(false);
    } catch {
      setIsFallback(true);
      
      const activeUser = api.getActiveUser();
      if (activeUser?.tenant_id === "b2222222-2222-4222-b222-222222222222") {
        setBranches([{ id: "branch-b1", name: "Sede Única Del Bosque" }]);
        setUsers([
          { id: "55555555-5555-5555-5555-555555555555", name: "Dr. Roberto Silva", role: "DirectorClinico" }
        ]);
        setPets([{ id: "pet-b1", name: "Kira" }]);
        setAppointments([
          {
            id: "appt-b1",
            branch_id: "branch-b1",
            pet_id: "pet-b1",
            veterinarian_id: "55555555-5555-5555-5555-555555555555",
            appointment_date: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
            status: "Programada",
            reason_for_visit: "Control anual felino"
          }
        ]);
      } else {
        setBranches([
          { id: "a2222222-2222-4222-a222-222222222222", name: "Sede Principal San Martín" },
          { id: "a3333333-3333-4333-a333-333333333333", name: "Sede Norte San Martín" }
        ]);
        setUsers([
          { id: "22222222-2222-2222-2222-222222222222", name: "Dra. Laura Gómez", role: "Veterinario" },
          { id: "33333333-3333-3333-3333-333333333333", name: "Dr. Juan Pérez", role: "Veterinario" }
        ]);
        setPets([
          { id: "99999999-9999-9999-9999-999999999999", name: "Toby" },
          { id: "pet-a2", name: "Sasha" }
        ]);
        setAppointments([
          {
            id: "appt-a1",
            branch_id: "a2222222-2222-4222-a222-222222222222",
            pet_id: "99999999-9999-9999-9999-999999999999",
            veterinarian_id: "22222222-2222-2222-2222-222222222222",
            appointment_date: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
            status: "Programada",
            reason_for_visit: "Vacunas y desparasitación"
          },
          {
            id: "appt-a2",
            branch_id: "a2222222-2222-4222-a222-222222222222",
            pet_id: "pet-a2",
            veterinarian_id: "22222222-2222-2222-2222-222222222222",
            appointment_date: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
            status: "Triaje",
            reason_for_visit: "Decaimiento general"
          }
        ]);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasCache = appointments.length > 0;
    loadData(!hasCache);
    
    const unsubscribe = api.subscribe(() => {
      loadData(false); // Silent SWR background update
    });
    return () => unsubscribe();
  }, [loadData, appointments.length]);

  const handleCreateAppointment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const formattedDate = new Date(newAppt.appointment_date).toISOString();
      const payload = {
        ...newAppt,
        appointment_date: formattedDate
      };

      if (isFallback) {
        const overlap = appointments.find(
          a => a.veterinarian_id === newAppt.veterinarian_id &&
          Math.abs(new Date(a.appointment_date).getTime() - new Date(formattedDate).getTime()) < 1000 * 60 * 30
        );

        if (overlap) {
          throw new Error("Business Rule Violation (BR-AP-001): El médico ya cuenta con una cita agendada en este intervalo de tiempo (solapamiento bloqueado).");
        }

        const mockNew = {
          id: `appt-mock-${Date.now()}`,
          status: "Programada",
          ...payload
        };
        setAppointments(prev => [mockNew, ...prev]);
        setSuccessMsg("Cita programada con éxito (SIMULADO)");
        setShowApptModal(false);
        setNewAppt({ branch_id: "", pet_id: "", veterinarian_id: "", appointment_date: "", reason_for_visit: "" });
      } else {
        await api.createAppointment(payload);
        setSuccessMsg("Cita programada correctamente.");
        setShowApptModal(false);
        setNewAppt({ branch_id: "", pet_id: "", veterinarian_id: "", appointment_date: "", reason_for_visit: "" });
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al programar la cita");
    }
  }, [isFallback, newAppt, appointments, loadData]);

  const handleUpdateStatus = useCallback(async (apptId: string, status: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (isFallback) {
        setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status } : a));
        setSuccessMsg(`Estado de la cita actualizado a ${status} (SIMULADO)`);
      } else {
        await api.updateAppointmentStatus(apptId, status);
        setSuccessMsg("Estado de la cita actualizado correctamente.");
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al actualizar el estado");
    }
  }, [isFallback, loadData]);

  const handleOpenTriage = useCallback((appt: any) => {
    setTriageApptId(appt.id);
    setTriagePetId(appt.pet_id);
    setErrorMsg("");
    setSuccessMsg("");
    setShowTriageModal(true);
  }, []);

  const handleCreateTriage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const payload = {
        appointment_id: triageApptId,
        pet_id: triagePetId,
        temperature: newTriage.temperature ? parseFloat(newTriage.temperature) : null,
        heart_rate: newTriage.heart_rate ? parseInt(newTriage.heart_rate) : null,
        respiratory_rate: newTriage.respiratory_rate ? parseInt(newTriage.respiratory_rate) : null,
        weight: parseFloat(newTriage.weight),
        triage_level: newTriage.triage_level,
        reason: newTriage.reason,
        created_by: api.getActiveUser()?.id
      };

      if (isFallback) {
        setAppointments(prev => prev.map(a => a.id === triageApptId ? { ...a, status: "Triaje" } : a));
        setSuccessMsg("Constantes de triaje registradas con éxito (SIMULADO)");
        setShowTriageModal(false);
        setNewTriage({ temperature: "", heart_rate: "", respiratory_rate: "", weight: "", triage_level: "Control", reason: "" });
      } else {
        await api.createTriage(payload);
        setSuccessMsg("Constantes de triaje registradas correctamente.");
        setShowTriageModal(false);
        setNewTriage({ temperature: "", heart_rate: "", respiratory_rate: "", weight: "", triage_level: "Control", reason: "" });
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al registrar el triaje");
    }
  }, [isFallback, triageApptId, triagePetId, newTriage, loadData]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  }, [appointments]);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="h-16 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
        <div className="border border-border/40 rounded-2xl glass-card overflow-hidden shadow-sm">
          <div className="h-12 skeleton-shimmer border-b border-border/20"></div>
          <div className="p-5 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border/30 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Agenda de Citas & Triaje</h2>
          <p className="text-xs text-muted-foreground mt-1">Organiza las consultas médicas y pre-evalúa a los pacientes en recepción.</p>
        </div>
        <button 
          onClick={() => { setShowApptModal(true); setErrorMsg(""); setSuccessMsg(""); }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-md shadow-indigo-600/10 shrink-0 min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Cita</span>
        </button>
      </div>

      {successMsg && <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-medium">{successMsg}</div>}
      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-medium flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="border border-border/40 rounded-2xl glass-card overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-foreground/[0.02] font-semibold text-foreground text-xs uppercase tracking-wider flex items-center space-x-2">
          <Clock className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
          <span>Listado de citas del día</span>
        </div>

        <div className="divide-y divide-border/30 overflow-y-auto max-h-[600px]">
          {sortedAppointments.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground space-y-3">
              <Calendar className="w-10 h-10 mx-auto opacity-30 animate-pulse text-indigo-500" />
              <h4 className="font-bold text-foreground text-sm">Agenda de Citas Vacía</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">No hay consultas programadas para este turno de trabajo. Agrega una cita para comenzar.</p>
            </div>
          ) : (
            sortedAppointments.map((appt) => {
              const pet = pets.find(p => p.id === appt.pet_id);
              const vet = users.find(u => u.id === appt.veterinarian_id);
              const branch = branches.find(b => b.id === appt.branch_id);
              const apptDate = new Date(appt.appointment_date);

              return (
                <div key={appt.id} className="p-5 hover:bg-foreground/[0.01] transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 text-xs">
                  
                  <div className="flex items-start space-x-4 min-w-0">
                    <div className="px-3.5 py-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl text-center font-bold font-mono min-w-[80px] shrink-0 shadow-sm border border-indigo-500/5">
                      <div className="text-[10px] uppercase leading-none">{apptDate.toLocaleDateString("es-ES", { weekday: "short" })}</div>
                      <div className="text-base leading-tight mt-1">{apptDate.toLocaleDateString("es-ES", { day: "numeric" })}</div>
                      <div className="text-[9px] font-medium opacity-85 mt-1 leading-none">
                        {apptDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="font-bold text-foreground text-sm truncate">Paciente: {pet?.name || "Mascota"}</h4>
                      <div className="text-muted-foreground leading-normal truncate">
                        Motivo: <b className="text-foreground/80 font-medium">{appt.reason_for_visit}</b>
                      </div>
                      <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider font-semibold truncate">
                        Sucursal: {branch?.name || "Sin sucursal"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-muted-foreground bg-foreground/[0.02] px-3.5 py-2 rounded-xl border border-border/30 md:max-w-[220px] self-start md:self-auto min-w-[150px]">
                    <User className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span className="truncate text-xs">Atiende: <b className="text-foreground/90 font-semibold">{vet?.name || "Sin asignar"}</b></span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto mt-2 md:mt-0">
                    
                    <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[9px] ${
                      appt.status === "Programada" ? "bg-indigo-500/10 text-indigo-500" :
                      appt.status === "Triaje" ? "bg-amber-500/10 text-amber-500" :
                      appt.status === "Atendida" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                    }`}>{appt.status}</span>

                    {appt.status === "Programada" && (
                      <button 
                        onClick={() => handleOpenTriage(appt)}
                        className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 font-bold min-h-[38px] cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Pre-Triaje</span>
                      </button>
                    )}

                    {appt.status === "Triaje" && (
                      <button 
                        onClick={() => handleUpdateStatus(appt.id, "Atendida")}
                        className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 font-bold min-h-[38px] cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Pasar a Consulta</span>
                      </button>
                    )}

                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {showApptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-foreground text-base">Agendar Cita Médica</h3>
            <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Sucursal</label>
                <select required value={newAppt.branch_id} onChange={e => setNewAppt({...newAppt, branch_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="" className="text-muted-foreground">-- Elija Sucursal --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="text-black">{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Mascota (Paciente)</label>
                <select required value={newAppt.pet_id} onChange={e => setNewAppt({...newAppt, pet_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="">-- Seleccionar Paciente --</option>
                  {pets.map(p => (
                    <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Médico Veterinario</label>
                <select required value={newAppt.veterinarian_id} onChange={e => setNewAppt({...newAppt, veterinarian_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="">-- Seleccionar Veterinario --</option>
                  {users.filter(u => u.role === 'Veterinario' || u.role === 'DirectorClinico').map(u => (
                    <option key={u.id} value={u.id} className="text-black">{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Fecha y Hora</label>
                <input 
                  type="datetime-local" 
                  required 
                  value={newAppt.appointment_date} 
                  onChange={e => setNewAppt({...newAppt, appointment_date: e.target.value})} 
                  className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground text-muted-foreground min-h-[44px]" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Motivo de la Visita</label>
                <textarea required value={newAppt.reason_for_visit} onChange={e => setNewAppt({...newAppt, reason_for_visit: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-20 resize-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowApptModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Agendar Cita</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showTriageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-foreground text-base">Registrar Constantes de Triaje</h3>
            <form onSubmit={handleCreateTriage} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground flex items-center space-x-1.5 font-semibold">
                    <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Peso (Kg)</span>
                  </label>
                  <input type="number" step="0.001" required value={newTriage.weight} onChange={e => setNewTriage({...newTriage, weight: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground flex items-center space-x-1.5 font-semibold">
                    <Thermometer className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Temperatura (°C)</span>
                  </label>
                  <input type="number" step="0.1" value={newTriage.temperature} onChange={e => setNewTriage({...newTriage, temperature: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground flex items-center space-x-1.5 font-semibold">
                    <Heart className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Frecuencia Cardíaca (lpm)</span>
                  </label>
                  <input type="number" value={newTriage.heart_rate} onChange={e => setNewTriage({...newTriage, heart_rate: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground flex items-center space-x-1.5 font-semibold">
                    <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Frecuencia Resp. (rpm)</span>
                  </label>
                  <input type="number" value={newTriage.respiratory_rate} onChange={e => setNewTriage({...newTriage, respiratory_rate: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Gravedad (Triaje)</label>
                <select required value={newTriage.triage_level} onChange={e => setNewTriage({...newTriage, triage_level: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="Control" className="text-black">Control / Sano</option>
                  <option value="Consulta Rotativa" className="text-black">Consulta Rotativa (No Urgente)</option>
                  <option value="Urgencia" className="text-black">Urgencia</option>
                  <option value="Emergencia" className="text-black text-rose-500 font-bold">Emergencia (Crítico)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Observaciones de Ingreso</label>
                <textarea required placeholder="Justifique detalladamente el triaje..." value={newTriage.reason} onChange={e => setNewTriage({...newTriage, reason: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground h-20 resize-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowTriageModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Registrar Triaje</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
