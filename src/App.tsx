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
  Globe,
  MessageCircle
} from 'lucide-react';
import { DatosPersonales, ServicioCategoriaId, Cita } from './types';
import FormularioDatos from './components/FormularioDatos';
import SeleccionServicio from './components/SeleccionServicio';
import AgendamientoCita from './components/AgendamientoCita';
import CitaComprobante from './components/CitaComprobante';
import DashboardCitas from './components/DashboardCitas';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'agendar' | 'mis-citas' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/admin' || path === '/admin/') {
        return 'admin';
      }
      if (path === '/mis-citas' || path === '/mis-citas/') {
        return 'mis-citas';
      }
    }
    return 'agendar';
  });

  const setTabWithUrl = (tab: 'agendar' | 'mis-citas' | 'admin') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const newPath = tab === 'admin' ? '/admin' : tab === 'mis-citas' ? '/mis-citas' : '/';
      window.history.pushState(null, '', newPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin' || path === '/admin/') {
        setActiveTab('admin');
      } else if (path === '/mis-citas' || path === '/mis-citas/') {
        setActiveTab('mis-citas');
      } else {
        setActiveTab('agendar');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, []);

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

  // WhatsApp Configuration states
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('50766666666');
  const [whatsappMessage, setWhatsappMessage] = useState('Hola, me gustaría recibir más información sobre mi cita en el Tribunal Electoral.');
  const [cmsConfig, setCmsConfig] = useState<any>(null);

  const fetchWhatsappConfig = async () => {
    try {
      const res = await fetch('/api/whatsapp/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setWhatsappEnabled(data.config.habilitado ?? true);
          setWhatsappNumber(data.config.numero || '50766666666');
          setWhatsappMessage(data.config.mensaje || '');
        }
      }
    } catch (err) {
      console.error('Error fetching whatsapp config in App component:', err);
    }
  };

  const fetchCmsConfig = async () => {
    try {
      const res = await fetch('/api/cms/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setCmsConfig(data.config);
          
          // Also sync global custom layout styles if set
          if (data.config.primaryColor) {
            document.documentElement.style.setProperty('--primary-theme-color', data.config.primaryColor);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching CMS config:', err);
    }
  };

  useEffect(() => {
    fetchWhatsappConfig();
    fetchCmsConfig();

    const handleConfigChanged = () => {
      fetchWhatsappConfig();
    };

    const handleCmsChanged = () => {
      fetchCmsConfig();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('whatsapp_config_changed', handleConfigChanged);
      window.addEventListener('cms_config_changed', handleCmsChanged);
      return () => {
        window.removeEventListener('whatsapp_config_changed', handleConfigChanged);
        window.removeEventListener('cms_config_changed', handleCmsChanged);
      };
    }
  }, []);

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

  // Hook up deep-linking query parameters for pre-filling "Pasado de Edad" tracking numbers
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tracking = params.get('seguimiento');
      const tramite = params.get('tramite');
      if (tramite === 'ced_pasados_edad' || tracking) {
        setSelectedCategoria('cedulacion');
        setSelectedSubServicioId('ced_pasados_edad');
        if (tracking) {
          setDatosPersonales({
            tipoIdentificacion: 'Cedula',
            identificacion: '',
            fechaNacimiento: '',
            telefono: '',
            correo: '',
            numeroSeguimiento: tracking
          });
          // Redirect directly to step 2 to input the citizen's ID, email, telephone with tracking pre-filled!
          setCurrentStep(2);
        }
      }
    } catch (e) {
      console.warn("Could not parse search query parameters", e);
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

  // Step 1 Completed (Service Selection) - Now service is chosen first
  const handleStep2Success = (categoria: ServicioCategoriaId, subServicioId: string) => {
    setSelectedCategoria(categoria);
    setSelectedSubServicioId(subServicioId);
    setCurrentStep(2);
  };

  // Step 2 Completed (Personal Details + Math Captcha) - Form details are filled second
  const handleStep1Success = (data: DatosPersonales) => {
    setDatosPersonales(data);
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
    setTabWithUrl('agendar');
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
    setTabWithUrl('agendar');
  };

  // Skip step-by-step helper
  const handleNextStepBypass = () => {
    if (currentStep === 1) {
      setSelectedCategoria('cedulacion');
      setSelectedSubServicioId('ced_primera_vez');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setDatosPersonales({
        tipoIdentificacion: 'Cedula',
        identificacion: '8-945-904',
        fechaNacimiento: '1995-10-15',
        telefono: '6612-3456',
        correo: 'oscargave3003@gmail.com'
      });
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
    <div id="applet-root" className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased">
      
      {/* Decorative Superior Flags of Panama strip */}
      <div className="w-full h-1.5 flex" aria-hidden="true">
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-red-600"></div>
        <div className="flex-1 bg-blue-900"></div>
        <div className="flex-1 bg-white"></div>
      </div>



      {/* Hero Announcement (Brief Context Panel) */}
      {activeTab !== 'admin' && (
        <section className="bg-gradient-to-r from-blue-950 to-blue-900 text-white py-12 px-4 text-center space-y-4 print:hidden flex flex-col items-center justify-center transition-all duration-300">
          <img
            src={cmsConfig?.logoUrl || "https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/06/Logo-TE-aniversario-256x256px-blanco-02.png"}
            alt={cmsConfig?.siteTitle || "Tribunal Electoral de Panamá"}
            className="h-32 md:h-40 w-auto object-contain mx-auto"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            {cmsConfig?.customTexts?.welcomeTitle || "Bienvenido al portal de citas del Tribunal Electoral"}
          </h2>
          {(cmsConfig?.customTexts?.welcomeSubtitle || cmsConfig?.siteSubtitle) && (
            <p className="text-xs md:text-base text-slate-200 max-w-2xl mx-auto opacity-90 font-medium">
              {cmsConfig?.customTexts?.welcomeSubtitle || cmsConfig?.siteSubtitle || "Solicitud y agendamiento de citas en línea rápidos y seguros"}
            </p>
          )}
        </section>
      )}

      {/* Main content body with Side informational columns or Full-width Admin Panel */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 block">
        
        {activeTab === 'admin' ? (
          <div className="w-full">
            <AdminPanel 
              citas={citasList} 
              onUpdateCitas={saveCitas}
              onClose={() => setTabWithUrl('agendar')}
            />
          </div>
        ) : (
          <>
            {/* Left main area (wizard or dashboard) */}
            <div className="w-full space-y-6">
             {activeTab === 'agendar' ? (
            /* WIZARD CARD WRAPPER */
            <div className="bg-white border border-slate-200 rounded shadow-sm p-4 md:p-6 space-y-6">
               
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
                    <SeleccionServicio
                      selectedCategoria={selectedCategoria}
                      selectedSubServicioId={selectedSubServicioId}
                      onSelect={handleStep2Success}
                      cmsConfig={cmsConfig}
                    />
                  )}

                  {currentStep === 2 && (
                    <FormularioDatos 
                      initialData={datosPersonales || undefined}
                      onSuccess={handleStep1Success} 
                      onBack={() => setCurrentStep(1)}
                      selectedSubServicioId={selectedSubServicioId}
                      selectedCategoria={selectedCategoria}
                      cmsConfig={cmsConfig}
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
                        setTabWithUrl('mis-citas');
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
                  setTabWithUrl('agendar');
                }}
              />
            </div>
          )}

        </div>
          </>
        )}

      </main>

      {/* Corporate Institutional Footer */}
      <footer className="bg-slate-800 text-slate-400 text-xs py-6 mt-12 border-t border-slate-900 print:hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left space-y-1">
            <span className="font-bold text-white block">{cmsConfig?.siteTitle || "Tribunal Electoral de Panamá"}</span>
            <p className="text-[11px]">
              {cmsConfig?.customTexts?.footerText || `© ${new Date().getFullYear()} – Portal oficial institucional de Citas Tecnológicas. Todos los derechos reservados.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] justify-center items-center">
            <button 
              type="button" 
              onClick={() => setTabWithUrl('admin')}
              className="hover:text-white font-semibold cursor-pointer transition flex items-center gap-1 text-slate-300"
            >
              <span>Acceso Administrativo</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp (Esquina inferior derecha) */}
      {whatsappEnabled && (
        <a
          href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-50 bg-green-600 hover:bg-green-500 text-white p-3.5 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-pointer print:hidden flex items-center justify-center border border-green-500 shadow-green-950/20"
          title="Contacto Directo WhatsApp"
          aria-label="Contacto Directo WhatsApp"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
        </a>
      )}
      
    </div>
  );
}
