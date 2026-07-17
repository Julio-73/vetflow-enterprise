"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Users, 
  Dog, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Heart,
  UserCheck
} from "lucide-react";
import { api } from "../../lib/api";

export default function PatientsPage() {
  const [tutors, setTutors] = useState<any[]>(() => api.getCached("/api/v1/patients/tutors") || []);
  const [pets, setPets] = useState<any[]>(() => api.getCached("/api/v1/patients/pets") || []);
  
  const [isLoading, setIsLoading] = useState(() => {
    const cachedTutors = api.getCached("/api/v1/patients/tutors");
    const cachedPets = api.getCached("/api/v1/patients/pets");
    return !cachedTutors || !cachedPets;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isFallback, setIsFallback] = useState(false);

  // Forms states
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [newTutor, setNewTutor] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    tax_identifier: "",
    address: ""
  });

  const [showPetModal, setShowPetModal] = useState(false);
  const [newPet, setNewPet] = useState({
    tutor_id: "",
    name: "",
    species: "Canino",
    breed: "",
    gender: "Macho",
    birth_date: "",
    status: "Activo"
  });

  const [tutorSuccessMsg, setTutorSuccessMsg] = useState("");
  const [petSuccessMsg, setPetSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [tutorsList, petsList] = await Promise.all([
        api.getTutors(),
        api.getPets()
      ]);
      setTutors(tutorsList);
      setPets(petsList);
      setIsFallback(false);
    } catch {
      setIsFallback(true);
      const user = api.getActiveUser();
      if (user?.tenant_id === "b2222222-2222-4222-b222-222222222222") {
        setTutors([
          { id: "tutor-b1", first_name: "Ignacio", last_name: "Delgado", email: "ignacio@email.com", phone: "+57 311 999 888", tax_identifier: "NIT 800.123.456", address: "Calle 100 #15-30, Bogotá" }
        ]);
        setPets([
          { id: "pet-b1", tutor_id: "tutor-b1", name: "Kira", species: "Felino", breed: "Persa", gender: "Hembra", status: "Activo" }
        ]);
      } else {
        setTutors([
          { id: "99999999-9999-9999-9999-999999999999", first_name: "Sofía", last_name: "Ramírez", email: "sofia.ramirez@email.com", phone: "+52 55 1234 5678", tax_identifier: "RAS920315-H30", address: "Insurgentes Sur 800, CDMX" },
          { id: "tutor-a2", first_name: "Alejandro", last_name: "Torres", email: "alejandro@email.com", phone: "+52 55 9876 5432", tax_identifier: "TOA881020-K11", address: "Av. Reforma 200, CDMX" }
        ]);
        setPets([
          { id: "99999999-9999-9999-9999-999999999999", tutor_id: "99999999-9999-9999-9999-999999999999", name: "Toby", species: "Canino", breed: "Golden Retriever", gender: "Macho", status: "Activo" },
          { id: "pet-a2", tutor_id: "tutor-a2", name: "Sasha", species: "Felino", breed: "Siamés", gender: "Hembra", status: "Activo" }
        ]);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only show loading if cache is empty
    const hasCache = tutors.length > 0 && pets.length > 0;
    loadData(!hasCache);
    
    const unsubscribe = api.subscribe(() => {
      loadData(false); // Silent revalidation
    });
    return () => unsubscribe();
  }, [loadData, tutors.length, pets.length]);

  const handleCreateTutor = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setTutorSuccessMsg("");
    try {
      if (isFallback) {
        const mockNew = {
          id: `tutor-mock-${Date.now()}`,
          ...newTutor
        };
        setTutors(prev => [mockNew, ...prev]);
        setTutorSuccessMsg("Tutor creado con éxito (SIMULADO)");
        setShowTutorModal(false);
        setNewTutor({ first_name: "", last_name: "", email: "", phone: "", tax_identifier: "", address: "" });
      } else {
        await api.createTutor(newTutor);
        setTutorSuccessMsg("Tutor registrado correctamente.");
        setShowTutorModal(false);
        setNewTutor({ first_name: "", last_name: "", email: "", phone: "", tax_identifier: "", address: "" });
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al registrar el tutor");
    }
  }, [isFallback, newTutor, loadData]);

  const handleCreatePet = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setPetSuccessMsg("");
    try {
      if (isFallback) {
        const mockNew = {
          id: `pet-mock-${Date.now()}`,
          ...newPet
        };
        setPets(prev => [mockNew, ...prev]);
        setPetSuccessMsg("Mascota creada con éxito (SIMULADO)");
        setShowPetModal(false);
        setNewPet({ tutor_id: "", name: "", species: "Canino", breed: "", gender: "Macho", birth_date: "", status: "Activo" });
      } else {
        await api.createPet(newPet);
        setPetSuccessMsg("Mascota registrada correctamente.");
        setShowPetModal(false);
        setNewPet({ tutor_id: "", name: "", species: "Canino", breed: "", gender: "Macho", birth_date: "", status: "Activo" });
        loadData(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al registrar la mascota");
    }
  }, [isFallback, newPet, loadData]);

  const filteredPets = useMemo(() => {
    return pets.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.breed?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pets, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="h-16 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-12 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-36 rounded-xl skeleton-shimmer border border-border/20 shadow-sm"></div>
              ))}
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
          <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Pacientes y Tutores</h2>
          <p className="text-xs text-muted-foreground mt-1">Registra expedientes de mascotas y asócialos con sus dueños.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => { setShowTutorModal(true); setErrorMsg(""); setTutorSuccessMsg(""); }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-foreground/5 text-xs font-semibold shadow-sm shrink-0 min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Tutor</span>
          </button>
          <button 
            onClick={() => { setShowPetModal(true); setErrorMsg(""); setPetSuccessMsg(""); }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-md shadow-indigo-600/10 shrink-0 min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Mascota</span>
          </button>
        </div>
      </div>

      {(tutorSuccessMsg || petSuccessMsg || errorMsg) && (
        <div className="space-y-2">
          {tutorSuccessMsg && <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-medium">{tutorSuccessMsg}</div>}
          {petSuccessMsg && <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-medium">{petSuccessMsg}</div>}
          {errorMsg && <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-medium">{errorMsg}</div>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center space-x-3 border rounded-xl px-4 py-3 bg-foreground/[0.02] shadow-sm">
            <Search className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar mascota por nombre, especie, raza..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredPets.length === 0 ? (
              <div className="col-span-full border border-dashed rounded-2xl p-12 text-center text-muted-foreground space-y-3 bg-foreground/[0.01]">
                <Dog className="w-10 h-10 mx-auto opacity-30 animate-pulse text-indigo-500" />
                <h4 className="font-bold text-foreground text-sm">Sin Mascotas Registradas</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">Comienza agregando un tutor y posteriormente registra a la mascota para aperturar su expediente.</p>
              </div>
            ) : (
              filteredPets.map((pet) => {
                const owner = tutors.find(t => t.id === pet.tutor_id);
                return (
                  <div key={pet.id} className="p-5 rounded-xl border glass-card premium-card space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-lg shrink-0 select-none shadow-sm">
                          {pet.species === "Canino" ? "🐕" : pet.species === "Felino" ? "🐈" : "🐾"}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground text-sm truncate">{pet.name}</h4>
                          <span className="text-[9.5px] text-muted-foreground uppercase tracking-widest font-semibold block truncate mt-0.5">{pet.species} • {pet.breed || "Mestizo"}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        pet.status === "Activo" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      }`}>{pet.status}</span>
                    </div>

                    <div className="pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span>Género: <b className="text-foreground">{pet.gender}</b></span>
                      </div>
                    </div>

                    {owner && (
                      <div className="bg-foreground/[0.03] rounded-xl p-3 flex items-center space-x-2.5 text-[11px] border border-border/30">
                        <UserCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Tutor:</span>
                        <span className="font-semibold text-foreground truncate">{owner.first_name} {owner.last_name}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 rounded-xl border glass-card space-y-5 h-fit">
          <h3 className="font-bold text-foreground text-sm flex items-center space-x-2 border-b border-border/30 pb-3">
            <Users className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Directorio de Tutores</span>
          </h3>

          <div className="space-y-4 overflow-y-auto max-h-[450px] pr-1">
            {tutors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <Users className="w-8 h-8 mx-auto opacity-35" />
                <p className="text-xs">No hay tutores registrados.</p>
              </div>
            ) : (
              tutors.map((tutor) => (
                <div key={tutor.id} className="p-4 bg-foreground/[0.02] border rounded-xl space-y-3 transition-colors hover:bg-foreground/[0.04]">
                  <h4 className="font-bold text-foreground text-xs">{tutor.first_name} {tutor.last_name}</h4>
                  <div className="space-y-1.5 text-[10px] text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{tutor.phone}</span>
                    </div>
                    {tutor.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{tutor.email}</span>
                      </div>
                    )}
                    {tutor.address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="leading-tight text-left">{tutor.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {showTutorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-foreground text-base">Registrar Nuevo Tutor</h3>
            <form onSubmit={handleCreateTutor} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Nombre</label>
                  <input type="text" required value={newTutor.first_name} onChange={e => setNewTutor({...newTutor, first_name: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 min-h-[44px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Apellido</label>
                  <input type="text" required value={newTutor.last_name} onChange={e => setNewTutor({...newTutor, last_name: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 min-h-[44px]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Teléfono</label>
                <input type="text" required value={newTutor.phone} onChange={e => setNewTutor({...newTutor, phone: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 min-h-[44px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Correo electrónico</label>
                <input type="email" value={newTutor.email} onChange={e => setNewTutor({...newTutor, email: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 min-h-[44px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Identificación Fiscal (RFC/NIT)</label>
                <input type="text" value={newTutor.tax_identifier} onChange={e => setNewTutor({...newTutor, tax_identifier: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 min-h-[44px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Dirección</label>
                <textarea value={newTutor.address} onChange={e => setNewTutor({...newTutor, address: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 h-20 resize-none" />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowTutorModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="font-bold text-foreground text-base">Registrar Nueva Mascota</h3>
            <form onSubmit={handleCreatePet} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Seleccionar Tutor</label>
                <select required value={newPet.tutor_id} onChange={e => setNewPet({...newPet, tutor_id: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground min-h-[44px]">
                  <option value="" className="text-muted-foreground">-- Elija un tutor --</option>
                  {tutors.map(t => (
                    <option key={t.id} value={t.id} className="text-black">{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Nombre de la Mascota</label>
                <input type="text" required value={newPet.name} onChange={e => setNewPet({...newPet, name: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 min-h-[44px]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Especie</label>
                  <select required value={newPet.species} onChange={e => setNewPet({...newPet, species: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 min-h-[44px]">
                    <option value="Canino" className="text-black">Canino</option>
                    <option value="Felino" className="text-black">Felino</option>
                    <option value="Equino" className="text-black">Equino</option>
                    <option value="Otros" className="text-black">Otros</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Raza</label>
                  <input type="text" value={newPet.breed} onChange={e => setNewPet({...newPet, breed: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 min-h-[44px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Género</label>
                  <select required value={newPet.gender} onChange={e => setNewPet({...newPet, gender: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 min-h-[44px]">
                    <option value="Macho" className="text-black">Macho</option>
                    <option value="Hembra" className="text-black">Hembra</option>
                    <option value="Desconocido" className="text-black">Desconocido</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold">Fecha de Nacimiento</label>
                  <input type="date" value={newPet.birth_date} onChange={e => setNewPet({...newPet, birth_date: e.target.value})} className="w-full p-3 border border-border/40 rounded-xl bg-foreground/[0.02] text-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 text-muted-foreground min-h-[44px]" />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowPetModal(false)} className="px-4 py-2.5 rounded-xl border border-border/40 text-muted-foreground hover:bg-foreground/5 min-h-[44px] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-600/10 min-h-[44px] cursor-pointer">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
