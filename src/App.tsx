import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarCheck2, 
  LayoutDashboard, 
  HelpCircle, 
  Award, 
  Scale, 
  Building2, 
  PhoneCall, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  Languages,
  Zap,
  ArrowRight,
  Shield,
  Globe
} from 'lucide-react';
import { DatosPersonales, ServicioCategoriaId, Cita } from './types';
import FormularioDatos from './components/FormularioDatos';
import SeleccionServicio from './components/SeleccionServicio';
import AgendamientoCita from './components/AgendamientoCita';
import CitaComprobante from './components/CitaComprobante';
import DashboardCitas from './components/DashboardCitas';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'agendar' | 'mis-citas' | 'admin'>('agendar');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Core Booking wizard state
  const [datosPersonales, setDatosPersonales] = useState<DatosPersonales | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<ServicioCategoriaId | null>(null);
  const [selectedSubServicioId, setSelectedSubServicioId] = useState<string | null>(null);
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null);
  const [selectedFecha, setSelectedFecha] = useState<string | null>(null);
  const [selectedHora, setSelectedHora] = useState<string | null>(null);

  // Stored receipt state for current booking
  const [activeCita, setActiveCita] = useState<Cita | null>(null);

  // Full appointments history list
  const [citasList, setCitasList] = useState<Cita[]>([]);

  // Load from LocalStorage on mount & Sync with server
  useEffect(() => {
    try {
      const stored = localStorage.getItem('te_panama_citas');
      if (stored) {
        const parsed: Cita[] = JSON.parse(stored);
        setCitasList(parsed);

        // Fetch newest statuses for these appointments from the backend DB
        const ids = parsed.map(c => c.id);
        if (ids.length > 0) {
          fetch('/api/sync-appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          })
          .then(res => res.json())
          .then(data => {
            if (data && data.success && Array.isArray(data.appointments)) {
              // Map updated statuses back to ours
              const updatedList = parsed.map(localCita => {
                const match = data.appointments.find((srv: any) => srv.id === localCita.id);
                if (match) {
                  return { ...localCita, estado: match.estado };
                }
                return localCita;
              });
              
              // Only save if there was actually a change to prevent infinite loops
              const isDifferent = JSON.stringify(updatedList) !== JSON.stringify(parsed);
              if (isDifferent) {
                console.log("[Sync] Synced appointments with server-side configurations.");
                setCitasList(updatedList);
                localStorage.setItem('te_panama_citas', JSON.stringify(updatedList));
              }
            }
          })
          .catch(err => console.warn('Could not sync appointments with server DB:', err));
        }
      }
    } catch (e) {
      console.warn('Could not read te_panama_citas from localStorage', e);
    }
  }, []);

  // Sync to LocalStorage
  const saveCitas = (updatedList: Cita[]) => {
    setCitasList(updatedList);
    try {
      localStorage.setItem('te_panama_citas', JSON.stringify(updatedList));
    } catch {
      console.error('Could not save to localStorage');
    }
  };

  // Step 1 Completed (Personal Details + Math Captcha)
  const handleStep1Success = (data: DatosPersonales) => {
    setDatosPersonales(data);
    setCurrentStep(2);
  };

  // Step 2 Completed (Service Selection)
  const handleStep2Success = (categoria: ServicioCategoriaId, subServicioId: string) => {
    setSelectedCategoria(categoria);
    setSelectedSubServicioId(subServicioId);
    setCurrentStep(3);
  };

  // Step 3 Completed (Appointment confirmation booking)
  const handleStep3Success = (sucursalId: string, fecha: string, hora: string) => {
    if (!datosPersonales || !selectedCategoria || !selectedSubServicioId) {
      setCurrentStep(1);
      return;
    }

    // Generate unique random ticket number
    const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += alpha.charAt(Math.floor(Math.random() * alpha.length));
    }
    const finalTxCode = `${fecha.replace(/-/g, '').substring(2, 6)}-${code}`;

    const nuevaCita: Cita = {
      id: `TE-${Date.now()}`,
      datosPersonales,
      servicioCategoria: selectedCategoria,
      subServicioId: selectedSubServicioId,
      sucursalId,
      fecha,
      hora,
      codigoTransaccion: finalTxCode,
      fechaCreacion: new Date().toISOString(),
      estado: 'confirmada',
    };

    // Register on express server as well
    try {
      fetch('/api/register-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaCita)
      }).catch(err => console.warn("Could not register booking on server:", err));
    } catch (e) {
      console.warn("Exception registering booking on server:", e);
    }

    const updated = [nuevaCita, ...citasList];
    saveCitas(updated);
    setActiveCita(nuevaCita);
    setCurrentStep(4);
  };

  // Delete appointment helper
  const handleDeleteCita = (citaId: string) => {
    const updated = citasList.filter((c) => c.id !== citaId);
    saveCitas(updated);
    if (activeCita && activeCita.id === citaId) {
      setActiveCita(null);
      setCurrentStep(1);
    }
  };

  // Cancel appointment helper (mark as 'cancelada')
  const handleCancelCita = (citaId: string) => {
    const updated = citasList.map((c) => {
      if (c.id === citaId) {
        return { ...c, estado: 'cancelada' as const };
      }
      return c;
    });
    saveCitas(updated);
    if (activeCita && activeCita.id === citaId) {
      setActiveCita({ ...activeCita, estado: 'cancelada' as const });
    }

    // Cancel on express server as well
    try {
      fetch('/api/cancel-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: citaId })
      }).catch(err => console.warn("Could not cancel on server:", err));
    } catch (e) {
      console.warn("Exception canceling on server:", e);
    }
  };

  // Select a previous appointment to inspect
  const handleSelectCita = (cita: Cita) => {
    setActiveCita(cita);
    setCurrentStep(4);
    setActiveTab('agendar');
  };

  // Reset booking form and return to dashboard or Step 1
  const resetFlow = () => {
    setDatosPersonales(null);
    setSelectedCategoria(null);
    setSelectedSubServicioId(null);
    setSelectedSucursalId(null);
    setSelectedFecha(null);
    setSelectedHora(null);
    setActiveCita(null);
    setCurrentStep(1);
  };

  // Fast testing auto-book helper
  const handleFastDemoBooking = () => {
    const mockDatos: DatosPersonales = {
      tipoIdentificacion: 'Cedula',
      identificacion: '8-945-904',
      fechaNacimiento: '1995-10-15',
      telefono: '6612-3456',
      correo: 'oscargave3003@gmail.com'
    };

    setDatosPersonales(mockDatos);
    setSelectedCategoria('cedulacion');
    setSelectedSubServicioId('ced_primera_vez');
    setSelectedSucursalId('anc_main');
    setSelectedFecha('2026-05-30');
    setSelectedHora('10:00 AM');

    const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += alpha.charAt(Math.floor(Math.random() * alpha.length));
    }
    const finalTxCode = `2605-${code}`;

    const nuevaCita: Cita = {
      id: `TE-${Date.now()}`,
      datosPersonales: mockDatos,
      servicioCategoria: 'cedulacion',
      subServicioId: 'ced_primera_vez',
      sucursalId: 'anc_main',
      fecha: '2026-05-30',
      hora: '10:00 AM',
      codigoTransaccion: finalTxCode,
      fechaCreacion: new Date().toISOString(),
      estado: 'confirmada',
    };

    const updated = [nuevaCita, ...citasList];
    saveCitas(updated);
    setActiveCita(nuevaCita);
    setCurrentStep(4);
    setActiveTab('agendar');
  };

  // Skip step-by-step helper
  const handleNextStepBypass = () => {
    if (currentStep === 1) {
      setDatosPersonales({
        tipoIdentificacion: 'Cedula',
        identificacion: '8-945-904',
        fechaNacimiento: '1995-10-15',
        telefono: '6612-3456',
        correo: 'oscargave3003@gmail.com'
      });
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setSelectedCategoria('cedulacion');
      setSelectedSubServicioId('ced_primera_vez');
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleStep3Success('anc_main', '2026-05-30', '10:00 AM');
    }
  };

  const getStepIndicatorStyle = (stepNum: number) => {
    if (currentStep === stepNum) {
      return 'bg-blue-700 text-white ring-4 ring-blue-100 border-blue-700';
    }
    if (currentStep > stepNum) {
      return 'bg-emerald-600 text-white border-emerald-600';
    }
    return 'bg-white text-slate-400 border-slate-200';
  };

  return (
    <div id="applet-root" className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased">
      
      {/* Decorative Superior Flags of Panama strip */}
      <div className="w-full h-1.5 flex" aria-hidden="true">
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-red-600"></div>
        <div className="flex-1 bg-blue-900"></div>
        <div className="flex-1 bg-white"></div>
      </div>

      {/* Main Corporate Header navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo Oficial del Tribunal Electoral de Panamá */}
            <div className="flex items-center select-none">
              <img
                src="https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-30-at-09.45.35.png"
                alt="Tribunal Electoral de Panamá"
                className="h-14 md:h-16 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Core Applet Navigation tabs */}
          <nav className="flex bg-slate-100 p-1 rounded border border-slate-200" aria-label="Navegación principal">
            <button
              type="button"
              onClick={() => {
                setActiveTab('agendar');
                if (currentStep === 4) {
                  resetFlow();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'agendar'
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarCheck2 className="w-3.5 h-3.5 text-blue-700" />
              <span className="hidden sm:inline">Agendar Cita</span>
              <span className="inline sm:hidden">Agendar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mis-citas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'mis-citas'
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-blue-700" />
              <span className="hidden sm:inline">Mis Citas</span>
              <span className="inline sm:hidden">Mis Citas</span>
              {citasList.length > 0 && (
                <span className="bg-red-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                  {citasList.filter(c => c.estado === 'confirmada').length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Announcement (Brief Context Panel) */}
      <section className="bg-gradient-to-r from-blue-950 to-blue-900 text-white py-8 px-4 text-center space-y-2 print:hidden">
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight uppercase">
          Portal de Citas Tecnológicas
        </h2>
        <p className="text-xs md:text-sm text-blue-100 max-w-xl mx-auto font-semibold leading-relaxed">
          Evite filas y programe su atención presencial obligatoria para servicios de Cédula, Registro Civil, Extranjería y Organización Electoral de manera transparente.
        </p>
      </section>

      {/* Main content body with Side informational columns or Full-width Admin Panel */}
      <main className={`flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 ${activeTab === 'admin' ? 'block' : 'grid grid-cols-1 lg:grid-cols-12 gap-6'}`}>
        
        {activeTab === 'admin' ? (
          <div className="w-full">
            <AdminPanel 
              citas={citasList} 
              onUpdateCitas={saveCitas}
              onClose={() => setActiveTab('agendar')}
            />
          </div>
        ) : (
          <>
            {/* Left main area (wizard or dashboard) */}
            <div className="lg:col-span-8 space-y-6">
             {activeTab === 'agendar' ? (
            /* WIZARD CARD WRAPPER */
            <div className="bg-white border border-slate-200 rounded shadow-sm p-4 md:p-6 space-y-6">
              
              {/* Step indicator visuals */}
              {currentStep < 4 && (
                <div className="border-b border-slate-100 pb-5" aria-label="Progreso de agendamiento">
                  <div className="flex items-center justify-between max-w-md mx-auto relative px-4">
                    
                    {/* Background indicator line */}
                    <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 -z-0">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300" 
                        style={{ width: `${(currentStep - 1) * 50}%` }}
                      ></div>
                    </div>
 
                    {/* Step 1 badge */}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flex flex-col items-center gap-1.5 relative z-10 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg p-1"
                      title="Ir al Paso 1: Datos Personales"
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 group-hover:scale-110 ${getStepIndicatorStyle(1)}`}>
                        {currentStep > 1 ? '✓' : '1'}
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider group-hover:text-blue-700 transition-colors">Datos</span>
                    </button>

                    {/* Step 2 badge */}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="flex flex-col items-center gap-1.5 relative z-10 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg p-1"
                      title="Ir al Paso 2: Selección de Trámite"
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 group-hover:scale-110 ${getStepIndicatorStyle(2)}`}>
                        {currentStep > 2 ? '✓' : '2'}
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider group-hover:text-blue-700 transition-colors">Trámite</span>
                    </button>

                    {/* Step 3 badge */}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="flex flex-col items-center gap-1.5 relative z-10 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg p-1"
                      title="Ir al Paso 3: Agendamiento de Cita"
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 group-hover:scale-110 ${getStepIndicatorStyle(3)}`}>
                        3
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider group-hover:text-blue-700 transition-colors">Fecha</span>
                    </button>

                  </div>
                </div>
              )}

              {/* Step Routing Switcher */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${currentStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentStep === 1 && (
                    <FormularioDatos 
                      initialData={datosPersonales || undefined}
                      onSuccess={handleStep1Success} 
                    />
                  )}

                  {currentStep === 2 && (
                    <SeleccionServicio
                      selectedCategoria={selectedCategoria}
                      selectedSubServicioId={selectedSubServicioId}
                      onBack={() => setCurrentStep(1)}
                      onSelect={handleStep2Success}
                    />
                  )}

                  {currentStep === 3 && (
                    <AgendamientoCita
                      selectedSucursalId={selectedSucursalId}
                      selectedFecha={selectedFecha}
                      selectedHora={selectedHora}
                      onBack={() => setCurrentStep(2)}
                      onSubmit={handleStep3Success}
                      selectedCategoria={selectedCategoria}
                      selectedSubServicioId={selectedSubServicioId}
                    />
                  )}

                  {currentStep === 4 && activeCita && (
                    <CitaComprobante
                      cita={activeCita}
                      onDone={() => {
                        resetFlow();
                        setActiveTab('mis-citas');
                      }}
                      onCancelCita={handleCancelCita}
                      onDeleteCita={handleDeleteCita}
                    />
                  )}
                </motion.div>
              </AnimatePresence>



            </div>
          ) : (
            /* DASHBOARD VIEW */
            <div className="bg-white border border-slate-200 rounded shadow-sm p-4 md:p-6">
              <DashboardCitas
                citas={citasList}
                onSelectCita={handleSelectCita}
                onCancelCita={handleCancelCita}
                onDeleteCita={handleDeleteCita}
                onNavigateToBooking={() => {
                  resetFlow();
                  setActiveTab('agendar');
                }}
              />
            </div>
          )}

        </div>

        {/* Right Info pane (Help & Contact information) */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          
          {/* Quick Informational Guide */}
          <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Garantías de Atención</span>
            </h4>
            
            <div className="space-y-4 text-xs">
              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 p-1 rounded bg-amber-50 text-amber-700 font-extrabold text-[10px] leading-none shrink-0 border border-amber-100">
                  01
                </div>
                <div>
                  <h5 className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wide">Cero filas obligatorias</h5>
                  <p className="text-slate-500 text-[11px] leading-normal font-medium">
                    Al programar su cita oficial, se le asigna un turno prioritario en ventanilla biométrica.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 p-1 rounded bg-emerald-50 text-emerald-700 font-extrabold text-[10px] leading-none shrink-0 border border-emerald-100">
                  02
                </div>
                <div>
                  <h5 className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wide">Transparencia arancelaria</h5>
                  <p className="text-slate-500 text-[11px] leading-normal font-medium">
                    Los trámites públicos listados informan sus costos oficiales exactos vigentes por ley.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 p-1 rounded bg-blue-50 text-blue-700 font-extrabold text-[10px] leading-none shrink-0 border border-blue-100">
                  03
                </div>
                <div>
                  <h5 className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wide">Protección de Datos</h5>
                  <p className="text-slate-500 text-[11px] leading-normal font-medium">
                    La información de su cédula y datos biométricos se resguarda bajo la Ley de Protección de Datos de Panamá.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Contacts Regional offices */}
          <div className="bg-gradient-to-b from-blue-950 to-blue-900 text-white rounded p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold tracking-wider uppercase text-amber-400 flex items-center gap-1.5 border-b border-white/10 pb-2.5">
              <PhoneCall className="w-4 h-4" />
              <span>Soporte al Ciudadano</span>
            </h4>
            
            <div className="space-y-3.5 text-xs text-blue-100">
              <p className="text-[11px] leading-relaxed font-medium">
                Si tiene dudas para resolver la operación de seguridad o necesita coordinar asistencia especial, contáctenos:
              </p>
              
              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-blue-200">Atención Telefónica:</span>
                  <a href="tel:+5075078000" className="font-extrabold text-white hover:underline">
                    +507 507-8000
                  </a>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-blue-200">Línea Gratuita Directa:</span>
                  <a href="tel:311" className="font-extrabold text-amber-400 hover:underline">
                    311 (Panamá Gob)
                  </a>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-blue-200">Correo de Apoyo:</span>
                  <a href="mailto:consultas@tribunal-electoral.gob.pa" className="font-extrabold text-white hover:underline">
                    info@te.gob.pa
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Constitutional banner of Electoral Integrity */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-[11px] text-slate-500 leading-normal">
            <Scale className="w-5 h-5 text-slate-400 shrink-0 select-none mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700 mb-0.5">Tribunal Electoral de Panamá</p>
              Garantizamos la libertad, honradez y eficacia del sufragio libre de Panamá. Regulamos el estado civil de las personas naturales.
            </div>
          </div>

        </div>
          </>
        )}

      </main>

      {/* Corporate Institutional Footer */}
      <footer className="bg-slate-800 text-slate-400 text-xs py-6 mt-12 border-t border-slate-900 print:hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left space-y-1">
            <span className="font-bold text-white block">Tribunal Electoral de Panamá</span>
            <p className="text-[11px]">
              © {new Date().getFullYear()} – Portal oficial institucional de Citas Tecnológicas. Todos los derechos reservados.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] justify-center">
            <span className="hover:text-white cursor-pointer transition">Términos de Uso</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer transition">Políticas de Privacidad</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer transition">Presidencia de la República</span>
          </div>
        </div>
      </footer>

      {/* Botón flotante de Panel Admin (Esquina inferior izquierda, solo escudo) */}
      <button
        type="button"
        id="admin-tab-button"
        onClick={() => {
          if (activeTab === 'admin') {
            setActiveTab('agendar');
          } else {
            setActiveTab('admin');
          }
        }}
        className={`fixed bottom-5 left-5 z-50 p-3 rounded-full shadow-lg border transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-pointer print:hidden flex items-center justify-center ${
          activeTab === 'admin'
            ? 'bg-amber-600 border-amber-500 text-white shadow-amber-900/20'
            : 'bg-white border-slate-200 text-blue-700 hover:text-blue-800 hover:bg-slate-50 shadow-slate-900/10'
        }`}
        title="Panel de Administración"
        aria-label="Panel de Administración"
      >
        <Shield className="w-5 h-5 shrink-0" />
      </button>
      
    </div>
  );
}
