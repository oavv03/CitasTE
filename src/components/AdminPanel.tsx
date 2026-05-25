import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Users, 
  CheckSquare, 
  Trash2, 
  Edit3, 
  Filter, 
  Search, 
  Download, 
  BarChart3, 
  Settings, 
  Key, 
  Briefcase, 
  Calendar, 
  Clock, 
  ClipboardList, 
  RefreshCw, 
  Sliders, 
  X,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Building,
  Info,
  Plus
} from 'lucide-react';
import { Cita, DatosPersonales, ServicioCategoriaId, TipoIdentificacion, Sucursal, CategoriaServicio, SubServicio, ExtranjeriaRecord, AdminRole } from '../types';
import { SUCURSALES_TE, SERVICIOS_TRIBUNAL, saveTramiteMutation, saveSucursalMutation } from '../data';
import ExtranjeriaController from './ExtranjeriaController';

interface AdminPanelProps {
  citas: Cita[];
  onUpdateCitas: (updatedList: Cita[]) => void;
  onClose: () => void;
}

export default function AdminPanel({ citas, onUpdateCitas, onClose }: AdminPanelProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [currentRole, setCurrentRole] = useState<AdminRole>('sencillo');
  const [activeSubTab, setActiveSubTab] = useState<'tabla' | 'stats' | 'config' | 'horarios' | 'tramites' | 'extranjeria'>('tabla');

  // Search and Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('Todos');
  const [filterSucursal, setFilterSucursal] = useState<string>('Todos');
  const [filterEstado, setFilterEstado] = useState<string>('Todos');

  // Selected item to edit details
  const [editingCita, setEditingCita] = useState<Cita | null>(null);
  
  // Custom states for editing
  const [editFecha, setEditFecha] = useState('');
  const [editHora, setEditHora] = useState('');
  const [editEstado, setEditEstado] = useState<'confirmada' | 'cancelada' | 'asistire' | 'no_asistire'>('confirmada');
  const [editTipoIdentificacion, setEditTipoIdentificacion] = useState<TipoIdentificacion>('Cedula');
  const [editIdentificacion, setEditIdentificacion] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editCorreo, setEditCorreo] = useState('');

  // Bulk operation checks
  const [selectedCitaIds, setSelectedCitaIds] = useState<string[]>([]);

  // Simulated config capacity state
  const [maxSlotsPerHour, setMaxSlotsPerHour] = useState(15);
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(true);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [isAlertActive, setIsAlertActive] = useState(false);

  // Reactive list states for offices and procedures (available to both Admin Sencillo and Super Admin)
  const [mutableSucursales, setMutableSucursales] = useState<Sucursal[]>([...SUCURSALES_TE]);
  const [mutableServicios, setMutableServicios] = useState<CategoriaServicio[]>([...SERVICIOS_TRIBUNAL]);

  // Editing states for branches/offices
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [editSucHorario, setEditSucHorario] = useState('');
  const [editSucNombre, setEditSucNombre] = useState('');
  const [editSucDireccion, setEditSucDireccion] = useState('');
  const [editSucTelefono, setEditSucTelefono] = useState('');

  // Editing and creation states for Categories and Procedures (Trámites)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaServicio | null>(null);
  const [isCreatingCategoria, setIsCreatingCategoria] = useState(false);
  const [catFormId, setCatFormId] = useState<ServicioCategoriaId>('cedulacion');
  const [catFormNombre, setCatFormNombre] = useState('');
  const [catFormDescripcion, setCatFormDescripcion] = useState('');
  const [catFormIcono, setCatFormIcono] = useState('IdCard');

  const [editingSubServicio, setEditingSubServicio] = useState<SubServicio | null>(null);
  const [editingSubServicioCatId, setEditingSubServicioCatId] = useState<ServicioCategoriaId | null>(null);
  const [isCreatingSubServicio, setIsCreatingSubServicio] = useState(false);
  const [subFormId, setSubFormId] = useState('');
  const [subFormNombre, setSubFormNombre] = useState('');
  const [subFormDescripcion, setSubFormDescripcion] = useState('');
  const [subFormRequisitos, setSubFormRequisitos] = useState<string[]>([]);
  const [newRequisitoText, setNewRequisitoText] = useState('');

  // Quick Demo Credentials info
  const handleQuickLogin = (role: AdminRole) => {
    setCurrentRole(role);
    setIsAdminLoggedIn(true);
    setLoginError('');
    if (role === 'extranjeria') {
      setActiveSubTab('extranjeria');
    } else {
      setActiveSubTab('tabla');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lcUser = username.trim().toLowerCase();
    if (lcUser === 'adminmini' && password === 'admin1234') {
      setCurrentRole('sencillo');
      setIsAdminLoggedIn(true);
      setActiveSubTab('tabla');
      setLoginError('');
    } else if (lcUser === 'adminte' && password === 'Value1234') { 
      setCurrentRole('super');
      setIsAdminLoggedIn(true);
      setActiveSubTab('tabla');
      setLoginError('');
    } else if (lcUser === 'migra26' && password === '12345678') {
      setCurrentRole('extranjeria');
      setIsAdminLoggedIn(true);
      setActiveSubTab('extranjeria');
      setLoginError('');
    } else {
      setLoginError('Credenciales incorrectas. Para pruebas rápidas use los botones de acceso directo o ingrese las credenciales asignadas.');
    }
  };

  // Human Readable helpers
  const getSucursalName = (id: string) => {
    return mutableSucursales.find(s => s.id === id)?.nombre || id;
  };

  const getCategoriaName = (id: string) => {
    return mutableServicios.find(k => k.id === id)?.nombre || id;
  };

  const getSubServicioName = (id: string) => {
    for (const cat of mutableServicios) {
      const sub = cat.subServicios.find(s => s.id === id);
      if (sub) return sub.nombre;
    }
    return id;
  };

  // Dynamic calculations for Stats dashboard
  const stats = useMemo(() => {
    const total = citas.length;
    const confirmadas = citas.filter(c => c.estado === 'confirmada' || c.estado === 'asistire').length;
    const canceladas = citas.filter(c => c.estado === 'cancelada' || c.estado === 'no_asistire').length;

    // By Category
    const porCategoria: Record<string, number> = {};
    // By Branch
    const porSucursal: Record<string, number> = {};

    citas.forEach(c => {
      porCategoria[c.servicioCategoria] = (porCategoria[c.servicioCategoria] || 0) + 1;
      porSucursal[c.sucursalId] = (porSucursal[c.sucursalId] || 0) + 1;
    });

    return {
      total,
      confirmadas,
      canceladas,
      porCategoria,
      porSucursal
    };
  }, [citas]);

  // Filtering filter logic
  const filteredCitas = useMemo(() => {
    return citas.filter(cita => {
      // Search
      const text = `${cita.codigoTransaccion} ${cita.datosPersonales.identificacion} ${cita.datosPersonales.correo} ${cita.datosPersonales.telefono}`.toLowerCase();
      const matchesSearch = text.includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = filterCategoria === 'Todos' || cita.servicioCategoria === filterCategoria;

      // Sucursal filter
      const matchesSucursal = filterSucursal === 'Todos' || cita.sucursalId === filterSucursal;

      // Status filter
      const matchesEstado = filterEstado === 'Todos' || cita.estado === filterEstado;

      return matchesSearch && matchesCategory && matchesSucursal && matchesEstado;
    });
  }, [citas, searchQuery, filterCategoria, filterSucursal, filterEstado, mutableSucursales, mutableServicios]);

  // Select all checkboxes toggle
  const toggleSelectAll = () => {
    if (selectedCitaIds.length === filteredCitas.length) {
      setSelectedCitaIds([]);
    } else {
      setSelectedCitaIds(filteredCitas.map(c => c.id));
    }
  };

  const toggleSelectCita = (id: string) => {
    if (selectedCitaIds.includes(id)) {
      setSelectedCitaIds(selectedCitaIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedCitaIds([...selectedCitaIds, id]);
    }
  };

  // Save edits of standard or super admin
  const handleSaveEdit = () => {
    if (!editingCita) return;

    const updated = citas.map((c) => {
      if (c.id === editingCita.id) {
        return {
          ...c,
          fecha: editFecha,
          hora: editHora,
          estado: editEstado,
          // Only if super admin allows editing personal data
          datosPersonales: currentRole === 'super' ? {
            tipoIdentificacion: editTipoIdentificacion,
            identificacion: editIdentificacion,
            fechaNacimiento: c.datosPersonales.fechaNacimiento, // preserve
            telefono: editTelefono,
            correo: editCorreo
          } : c.datosPersonales
        };
      }
      return c;
    });

    onUpdateCitas(updated);
    setEditingCita(null);
  };

  // Action: Single Delete (Super Admin only)
  const handleDeleteCita = (id: string) => {
    if (window.confirm('¿Está completamente seguro de eliminar este registro permanentemente de la base de datos?')) {
      const updated = citas.filter(c => c.id !== id);
      onUpdateCitas(updated);
      setSelectedCitaIds(selectedCitaIds.filter(selectedId => selectedId !== id));
      if (editingCita?.id === id) {
        setEditingCita(null);
      }
    }
  };

  // Action: Bulk state cancel
  const handleBulkCancel = () => {
    if (selectedCitaIds.length === 0) return;
    const updated = citas.map(c => {
      if (selectedCitaIds.includes(c.id)) {
        return { ...c, estado: 'cancelada' as const };
      }
      return c;
    });
    onUpdateCitas(updated);
    setSelectedCitaIds([]);
  };

  // Action: Bulk state confirm
  const handleBulkConfirm = () => {
    if (selectedCitaIds.length === 0) return;
    const updated = citas.map(c => {
      if (selectedCitaIds.includes(c.id)) {
        return { ...c, estado: 'confirmada' as const };
      }
      return c;
    });
    onUpdateCitas(updated);
    setSelectedCitaIds([]);
  };

  // Action: Export Simulated CSV
  const handleExportCSV = () => {
    const headers = ['Código', 'Identificación', 'Tipo ID', 'Correo', 'Teléfono', 'Categoría', 'Trámite', 'Sede', 'Fecha', 'Hora', 'Estado'];
    const rows = filteredCitas.map(c => [
      c.codigoTransaccion,
      c.datosPersonales.identificacion,
      c.datosPersonales.tipoIdentificacion,
      c.datosPersonales.correo,
      c.datosPersonales.telefono,
      getCategoriaName(c.servicioCategoria),
      getSubServicioName(c.subServicioId),
      getSucursalName(c.sucursalId),
      c.fecha,
      c.hora,
      c.estado === 'confirmada' ? 'CONFIRMADA' : 'CANCELADA'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Citas_TE_Export_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Edit Dialog
  const openEditDialog = (cita: Cita) => {
    setEditingCita(cita);
    setEditFecha(cita.fecha);
    setEditHora(cita.hora);
    setEditEstado(cita.estado);
    setEditTipoIdentificacion(cita.datosPersonales.tipoIdentificacion);
    setEditIdentificacion(cita.datosPersonales.identificacion);
    setEditTelefono(cita.datosPersonales.telefono);
    setEditCorreo(cita.datosPersonales.correo);
  };

  // --- OPERATIONS FOR REGIONAL BRANCHES (AVAILABLE FOR ALL ADMINS) ---
  const handleOpenEditSucursal = (suc: Sucursal) => {
    setEditingSucursal(suc);
    setEditSucHorario(suc.horario);
    setEditSucNombre(suc.nombre);
    setEditSucDireccion(suc.direccion);
    setEditSucTelefono(suc.telefono);
  };

  const handleSaveSucursal = () => {
    if (!editingSucursal) return;
    const updated = mutableSucursales.map(s => {
      if (s.id === editingSucursal.id) {
        return {
          ...s,
          nombre: editSucNombre,
          direccion: editSucDireccion,
          telefono: editSucTelefono,
          horario: editSucHorario
        };
      }
      return s;
    });
    setMutableSucursales(updated);
    saveSucursalMutation(updated);
    setEditingSucursal(null);
  };

  const handleResetBranches = () => {
    if (window.confirm("¿Desea restablecer todas las sedes y horarios a los valores iniciales de fábrica?")) {
      localStorage.removeItem('TE_SUCURSALES');
      window.location.reload();
    }
  };

  // --- OPERATIONS FOR PROCEDURES/TRÁMITES (AVAILABLE FOR ALL ADMINS) ---
  const handleOpenCreateCategoria = () => {
    setIsCreatingCategoria(true);
    setEditingCategoria(null);
    setCatFormId('cedulacion');
    setCatFormNombre('');
    setCatFormDescripcion('');
    setCatFormIcono('IdCard');
  };

  const handleOpenEditCategoria = (cat: CategoriaServicio) => {
    setIsCreatingCategoria(false);
    setEditingCategoria(cat);
    setCatFormId(cat.id);
    setCatFormNombre(cat.nombre);
    setCatFormDescripcion(cat.descripcion);
    setCatFormIcono(cat.icono);
  };

  const handleSaveCategoria = () => {
    if (isCreatingCategoria) {
      const newCat: CategoriaServicio = {
        id: catFormId,
        nombre: catFormNombre,
        descripcion: catFormDescripcion,
        icono: catFormIcono,
        subServicios: []
      };
      
      if (mutableServicios.some(c => c.id === catFormId)) {
        alert("El ID único de la categoría ya existe.");
        return;
      }

      const updated = [...mutableServicios, newCat];
      setMutableServicios(updated);
      saveTramiteMutation(updated);
      setIsCreatingCategoria(false);
    } else if (editingCategoria) {
      const updated = mutableServicios.map(c => {
        if (c.id === editingCategoria.id) {
          return {
            ...c,
            nombre: catFormNombre,
            descripcion: catFormDescripcion,
            icono: catFormIcono
          };
        }
        return c;
      });
      setMutableServicios(updated);
      saveTramiteMutation(updated);
      setEditingCategoria(null);
    }
    setCatFormNombre('');
    setCatFormDescripcion('');
  };

  const handleDeleteCategoria = (id: ServicioCategoriaId) => {
    if (window.confirm("¿Está completamente seguro de eliminar esta categoría y todos sus trámites?")) {
      const updated = mutableServicios.filter(c => c.id !== id);
      setMutableServicios(updated);
      saveTramiteMutation(updated);
    }
  };

  const handleOpenCreateSubServicio = (catId: ServicioCategoriaId) => {
    setEditingSubServicioCatId(catId);
    setIsCreatingSubServicio(true);
    setEditingSubServicio(null);
    setSubFormId(`sub_${Date.now()}`);
    setSubFormNombre('');
    setSubFormDescripcion('');
    setSubFormRequisitos([]);
    setNewRequisitoText('');
  };

  const handleOpenEditSubServicio = (catId: ServicioCategoriaId, sub: SubServicio) => {
    setEditingSubServicioCatId(catId);
    setIsCreatingSubServicio(false);
    setEditingSubServicio(sub);
    setSubFormId(sub.id);
    setSubFormNombre(sub.nombre);
    setSubFormDescripcion(sub.descripcion);
    setSubFormRequisitos([...sub.requisitos]);
    setNewRequisitoText('');
  };

  const handleAddRequisito = () => {
    if (newRequisitoText.trim()) {
      setSubFormRequisitos([...subFormRequisitos, newRequisitoText.trim()]);
      setNewRequisitoText('');
    }
  };

  const handleRemoveRequisito = (index: number) => {
    setSubFormRequisitos(subFormRequisitos.filter((_, i) => i !== index));
  };

  const handleSaveSubServicio = () => {
    if (!editingSubServicioCatId) return;

    if (isCreatingSubServicio) {
      const newSub: SubServicio = {
        id: subFormId || `sub_${Date.now()}`,
        nombre: subFormNombre,
        descripcion: subFormDescripcion,
        requisitos: subFormRequisitos
      };

      const updated = mutableServicios.map(c => {
        if (c.id === editingSubServicioCatId) {
          if (c.subServicios.some(s => s.id === newSub.id)) {
            alert("El ID del trámite ya existe en esta categoría.");
            return c;
          }
          return {
            ...c,
            subServicios: [...c.subServicios, newSub]
          };
        }
        return c;
      });

      setMutableServicios(updated);
      saveTramiteMutation(updated);
      setIsCreatingSubServicio(false);
    } else if (editingSubServicio) {
      const updated = mutableServicios.map(c => {
        if (c.id === editingSubServicioCatId) {
          const updatedSubs = c.subServicios.map(s => {
            if (s.id === editingSubServicio.id) {
              return {
                ...s,
                nombre: subFormNombre,
                descripcion: subFormDescripcion,
                requisitos: subFormRequisitos
              };
            }
            return s;
          });
          return {
            ...c,
            subServicios: updatedSubs
          };
        }
        return c;
      });

      setMutableServicios(updated);
      saveTramiteMutation(updated);
      setEditingSubServicio(null);
    }

    setSubFormId('');
    setSubFormNombre('');
    setSubFormDescripcion('');
    setSubFormRequisitos([]);
    setNewRequisitoText('');
    setEditingSubServicioCatId(null);
  };

  const handleDeleteSubServicio = (catId: ServicioCategoriaId, subId: string) => {
    if (window.confirm("¿Está completamente seguro de eliminar este trámite del catálogo oficial? En adelante no se podrán agendar citas para el mismo.")) {
      const updated = mutableServicios.map(c => {
        if (c.id === catId) {
          return {
            ...c,
            subServicios: c.subServicios.filter(s => s.id !== subId)
          };
        }
        return c;
      });
      setMutableServicios(updated);
      saveTramiteMutation(updated);
    }
  };

  const handleResetTramites = () => {
    if (window.confirm("¿Desea restablecer todos los trámites y requisitos del sistema a los valores institucionales iniciales?")) {
      localStorage.removeItem('TE_SERVICIOS');
      window.location.reload();
    }
  };

  return (
    <div id="admin-panel-container" className="bg-slate-900 text-slate-100 min-h-[600px] rounded-lg border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-900/50 p-2 rounded-lg border border-blue-500/30">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-wider text-white">Panel de Administración de Citas</h1>
            <p className="text-[10px] text-slate-400 font-medium">Control de agendas, validaciones y reportería del Tribunal Electoral</p>
          </div>
        </div>

        {isAdminLoggedIn && (
          <div className="flex flex-wrap items-center gap-2">
             {/* Role indicator label */}
             <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border shadow-sm ${
               currentRole === 'super' 
                 ? 'bg-red-950 text-red-400 border-red-800' 
                 : currentRole === 'extranjeria'
                   ? 'bg-amber-950 text-amber-400 border-amber-800'
                   : 'bg-blue-950 text-blue-400 border-blue-800'
             }`}>
               Perfil: {currentRole === 'super' ? '⚡ SUPER ADMIN' : currentRole === 'extranjeria' ? '🛂 ADMIN EXTRANJERÍA' : '👤 ADMIN SENCILLO'}
             </span>
 
             {/* Quick switcher during simulation */}
             <button
               onClick={() => {
                 const roles: AdminRole[] = ['sencillo', 'super', 'extranjeria'];
                 const nextRole = roles[(roles.indexOf(currentRole) + 1) % roles.length];
                 setCurrentRole(nextRole);
                 setEditingCita(null); // Clear editing to prevent profile mismatch
                 if (nextRole === 'extranjeria') {
                   setActiveSubTab('extranjeria');
                 } else {
                   setActiveSubTab('tabla');
                 }
               }}
               className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded tracking-wide transition"
               title="Alternar perfiles para validar restricciones fácilmente"
             >
               Cambiar Perfil (Switch)
             </button>

            <button
              type="button"
              onClick={() => setIsAdminLoggedIn(false)}
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded transition"
            >
              Cerrar Sesión
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1.5 rounded transition absolute right-4 top-4 md:static"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {!isAdminLoggedIn ? (
        /* LOGIN OR PROFILE SELECT PANEL */
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-lg mx-auto w-full space-y-8">
          <div className="text-center space-y-2">
            <ShieldAlert className="w-14 h-14 text-blue-500 mx-auto" />
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-100">Acceso Restringido y Seguro</h2>
            <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto">
              Ingrese credenciales o use los accesos directos de prueba provistos a continuación.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="w-full bg-slate-950 p-6 rounded-lg border border-slate-800 space-y-4 shadow-xl">
            {loginError && (
              <div className="bg-red-950/80 border border-red-900 text-red-200 p-2.5 rounded text-[11px] font-semibold">
                ⚠ {loginError}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Usuario</label>
              <input
                type="text"
                placeholder="Ejemplo: AdminTE / AdminMini / Migra26"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Contraseña</label>
              <input
                type="password"
                placeholder="Contraseña institucional segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider py-2 rounded transition shadow-md cursor-pointer"
            >
              Iniciar sesión institucional
            </button>
          </form>
        </div>
      ) : (
        /* MAIN ADMIN INTERFACE */
        <div className="flex-1 flex flex-col md:flex-row h-full">
          
          {/* SIDEBAR TABS */}
          <div className="w-full md:w-52 bg-slate-950 border-r border-slate-800 p-3 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible">
            {currentRole !== 'extranjeria' && (
              <>
                <button
                  onClick={() => setActiveSubTab('tabla')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'tabla'
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span>Gestión de Citas</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('horarios')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'horarios'
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Horarios Regionales</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('tramites')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'tramites'
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span>Gestión de Trámites</span>
                </button>
              </>
            )}

            <button
              onClick={() => setActiveSubTab('extranjeria')}
              className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                activeSubTab === 'extranjeria'
                  ? 'bg-amber-600/15 text-amber-400 border border-amber-500/30 shadow-inner'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-amber-500" />
              <span className="flex items-center gap-1">
                <span>Carga Extranjería</span>
                <span className="bg-amber-500/20 text-amber-300 px-1 rounded text-[9px] font-black border border-amber-500/30">CSV</span>
              </span>
            </button>

            {currentRole !== 'extranjeria' && (
              <>
                <button
                  onClick={() => setActiveSubTab('stats')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'stats'
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>Estadísticas</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('config')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'config'
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Configuración</span>
                </button>
              </>
            )}
            
            {currentRole !== 'extranjeria' && (
              <div className="hidden md:block mt-auto border-t border-slate-800 pt-3">
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded text-[10px] text-slate-400 font-mono leading-relaxed space-y-1">
                  <div role="presentation" className="text-slate-350 font-bold border-b border-slate-850 pb-1 flex items-center gap-1.5 uppercase">
                    <Sliders className="w-3 h-3 text-blue-500" />
                    <span>Configuración TE</span>
                  </div>
                  <div>Línea de Servicio: 311</div>
                  <div>Cupo Hora: {maxSlotsPerHour}</div>
                  <div>Regulación: PE 2026</div>
                </div>
              </div>
            )}
          </div>

          {/* MAIN PAGE AREA */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">

            {/* TAB CONTENT: TABLA (Gestión de Citas) */}
            {activeSubTab === 'tabla' && (
              <div className="space-y-4">
                
                {/* ADVANCED FILTERING SECTION */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 shadow">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs font-extrabold uppercase text-slate-350 tracking-wider flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-blue-400" />
                      Filtros de Búsqueda
                    </span>
                    <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">
                      {filteredCitas.length} Registros Encontrados
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* Live search input */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider block">Búsqueda rápida</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Buscar cédula, código, correo..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-755 text-slate-200 pl-8 pr-3 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder-slate-500 font-medium"
                        />
                      </div>
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider block">Categoría de trámite</label>
                      <select
                        value={filterCategoria}
                        onChange={(e) => setFilterCategoria(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-755 text-slate-200 py-1.5 px-2 rounded text-xs focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="Todos">Todos los Trámites</option>
                        {mutableServicios.map(col => (
                          <option key={col.id} value={col.id}>{col.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sucursal Selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider block">Sede Regional / Local</label>
                      <select
                        value={filterSucursal}
                        onChange={(e) => setFilterSucursal(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-755 text-slate-200 py-1.5 px-2 rounded text-xs focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="Todos">Todas las Sedes</option>
                        {mutableSucursales.map(s => (
                          <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider block">Estado de la Cita</label>
                      <select
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-755 text-slate-200 py-1.5 px-2 rounded text-xs focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="Todos">Todos los Estados</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* MASS ACTIONS & EXPORTS (Bulk operations) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400">Acciones en Lote:</span>
                    {selectedCitaIds.length === 0 ? (
                      <span className="text-[10px] text-slate-550 italic">Seleccione casillas abajo para aplicar</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-blue-900/40 text-blue-350 border border-blue-800/60 px-2 py-0.5 rounded font-black">
                          {selectedCitaIds.length} seleccionados
                        </span>
                        
                        <button
                          onClick={handleBulkConfirm}
                          className="bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition border border-emerald-700/45 shrink-0"
                          title="Confirmar citas seleccionadas"
                        >
                          Confirmar
                        </button>

                        <button
                          onClick={handleBulkCancel}
                          className="bg-amber-800/80 hover:bg-amber-700 text-amber-200 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition border border-amber-700/45 shrink-0"
                          title="Cancelar citas seleccionadas"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleExportCSV}
                    disabled={filteredCitas.length === 0}
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-750 text-slate-200 font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded transition flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Exportar Registros a CSV</span>
                  </button>
                </div>

                {/* MASTER EXCEL TABLE GRID */}
                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto shadow-md">
                  <table className="w-full text-left" role="grid">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredCitas.length > 0 && selectedCitaIds.length === filteredCitas.length}
                            onChange={toggleSelectAll}
                            className="rounded cursor-pointer accent-blue-600 focus:ring-0"
                            aria-label="Seleccionar todos los registros de la página"
                          />
                        </th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Identificación</th>
                        <th className="p-3">Trámite Técnico</th>
                        <th className="p-3">Sede Registrada</th>
                        <th className="p-3">Programación</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-xs font-semibold leading-relaxed">
                      {filteredCitas.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-450 italic font-medium">
                            No se encontraron citas bajo los parámetros especificados. Puede programar una nueva cita en el portal público.
                          </td>
                        </tr>
                      ) : (
                        filteredCitas.map((cit) => (
                          <tr key={cit.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedCitaIds.includes(cit.id)}
                                onChange={() => toggleSelectCita(cit.id)}
                                className="rounded cursor-pointer accent-blue-600"
                                aria-label={`Seleccionar cita ${cit.codigoTransaccion}`}
                              />
                            </td>
                            {/* CODE */}
                            <td className="p-3">
                              <span className="font-mono text-xs font-extrabold text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/30">
                                {cit.codigoTransaccion}
                              </span>
                            </td>
                            
                            {/* CITIZEN INFO */}
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-mono text-[11px] font-bold text-slate-200">
                                  {cit.datosPersonales.identificacion}
                                </span>
                                <span className="text-[10px] text-slate-450 leading-tight">
                                  {cit.datosPersonales.tipoIdentificacion} • {cit.datosPersonales.telefono}
                                </span>
                              </div>
                            </td>

                            {/* SERVICES info */}
                            <td className="p-3 max-w-[150px] truncate" title={getSubServicioName(cit.subServicioId)}>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-300">
                                  {getSubServicioName(cit.subServicioId)}
                                </span>
                                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">
                                  {getCategoriaName(cit.servicioCategoria)}
                                </span>
                              </div>
                            </td>

                            {/* LOCATION / SUCURSAL */}
                            <td className="p-3">
                              <span className="text-slate-350 text-[11px] font-medium block max-w-[120px] truncate" title={getSucursalName(cit.sucursalId)}>
                                {getSucursalName(cit.sucursalId)}
                              </span>
                            </td>

                            {/* DATE TIME STAMP */}
                            <td className="p-3">
                              <div className="flex flex-col text-[11px]">
                                <span className="font-mono text-slate-300 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-450" />
                                  {cit.fecha}
                                </span>
                                <span className="font-mono text-slate-400 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-450" />
                                  {cit.hora}
                                </span>
                              </div>
                            </td>

                            {/* STATUS BADGE */}
                            <td className="p-3 text-center">
                              <span className={`text-[10px] font-black uppercase inline-block px-2 py-0.5 rounded tracking-wider shadow-sm border ${
                                cit.estado === 'confirmada'
                                  ? 'bg-emerald-950/70 text-emerald-400 border-emerald-900/60'
                                  : cit.estado === 'asistire'
                                    ? 'bg-blue-950/80 text-blue-400 border-blue-900/60'
                                    : cit.estado === 'no_asistire'
                                      ? 'bg-orange-950/70 text-orange-400 border-orange-900/60'
                                      : 'bg-red-950/70 text-red-400 border-red-900/60'
                              }`}>
                                {cit.estado === 'confirmada' 
                                  ? 'Reservada' 
                                  : cit.estado === 'asistire' 
                                    ? '✓ Asistirá' 
                                    : cit.estado === 'no_asistire' 
                                      ? '✗ No Asistirá' 
                                      : 'Cancelada'}
                              </span>
                            </td>

                            {/* INDIVIDUAL ACTIONS BLOCK */}
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditDialog(cit)}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-1 rounded transition"
                                  title="Editar parámetros de la cita"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {currentRole === 'super' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCita(cit.id)}
                                    className="bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/60 p-1 rounded transition"
                                    title="Eliminar permanentemente del registro"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="bg-slate-850 text-slate-600 border border-slate-800 p-1 rounded cursor-not-allowed opacity-40"
                                    title="Requiere perfil SUPER ADMIN para borrar del historial"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* TAB CONTENT: STATS (Estadísticas y Métricas del sistema) */}
            {activeSubTab === 'stats' && (
              <div className="space-y-6">
                
                {/* METRICS ROW BENTO BOX - HIGHLY STYLISH */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* METRIC 1: TOTAL */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-md">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Citas Totales</span>
                      <span className="text-3xl font-black font-mono tracking-tight text-white">{stats.total}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <ClipboardList className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>

                  {/* METRIC 2: CONFIRMADAS */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-md">
                    <div className="space-y-1 block">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Activas Confirmadas</span>
                      <span className="text-3xl font-black font-mono tracking-tight text-emerald-400">{stats.confirmadas}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>

                  {/* METRIC 3: CANCELADAS */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-md">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">No Atendidas / Canceladas</span>
                      <span className="text-3xl font-black font-mono tracking-tight text-amber-500">{stats.canceladas}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                  </div>

                </div>

                {/* DISTRIBUTION CHARTS OR BARS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* CATEGORIES DEMAND PROGRESS BARS */}
                  <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 shadow space-y-4">
                    <div className="border-b border-slate-900 pb-2.5">
                      <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-blue-400" />
                        <span>Demanda de Trámites Públicos</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">Distribución porcentual por categorías del Registro del Estado Civil</p>
                    </div>

                    <div className="space-y-4">
                      {mutableServicios.map(cat => {
                        const count = stats.porCategoria[cat.id] || 0;
                        const percentage = stats.total > 0 ? Math.round((count / stats.total) * 105) / 1.05 : 0;
                        return (
                          <div key={cat.id} className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-300 font-extrabold uppercase tracking-wide">
                              <span>{cat.nombre}</span>
                              <span className="font-mono text-slate-400">{percentage}% ({count})</span>
                            </div>
                            <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {stats.total === 0 && (
                        <p className="text-xs italic text-slate-450 p-4 text-center">Sin datos de transacciones agendadas aún en el sistema.</p>
                      )}
                    </div>
                  </div>

                  {/* BRANCH OFFICES ACTIVITY PROGRESS BARS */}
                  <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 shadow space-y-4">
                    <div className="border-b border-slate-900 pb-2.5">
                      <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-blue-400" />
                        <span>Capacidad por Oficina y Provincia</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">Actividad registrada en las Direcciones Regionales activas</p>
                    </div>

                    <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                      {mutableSucursales.map(suc => {
                        const count = stats.porSucursal[suc.id] || 0;
                        const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                        if (count === 0) return null; // Only show active branches with data for layout hygiene
                        return (
                          <div key={suc.id} className="space-y-1 border-b border-slate-900 pb-2">
                            <div className="flex justify-between text-[11px] text-slate-200">
                              <span className="font-bold">{suc.nombre} ({suc.provincia})</span>
                              <span className="font-mono text-blue-400 font-extrabold">{percentage}% ({count} citas)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(stats.porSucursal).length === 0 && (
                        <p className="text-xs italic text-slate-450 p-4 text-center">Sin citas activas en ninguna dirección regional por el momento.</p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB CONTENT: CONFIG (Configuración del Sistema) */}
            {activeSubTab === 'config' && (
              <div className="space-y-6">
                
                {/* CORE SETTINGS BLOCK */}
                <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4 shadow-md max-w-2xl">
                  
                  <div className="border-b border-slate-900 pb-2.5 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <div>
                      <h3 className="text-xs font-black uppercase text-white tracking-wider">Parámetros Operativos del Sistema</h3>
                      <p className="text-[10px] text-slate-400">Control de alertas, cupos temporales y flujos biométricos</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    
                    {/* SLOTS CAPACITY CONTROL */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded border border-slate-800">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-slate-250 block">Capacidad de Atención Regular</span>
                        <span className="text-[10px] text-slate-450">Slots o turnos electrónicos disponibles por cada hora</span>
                      </div>
                      
                      {currentRole === 'super' ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setMaxSlotsPerHour(Math.max(1, maxSlotsPerHour - 1))}
                            className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700 hover:bg-slate-700 transition font-black"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs font-black w-10 text-center text-white">{maxSlotsPerHour}</span>
                          <button 
                            onClick={() => setMaxSlotsPerHour(maxSlotsPerHour + 1)}
                            className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700 hover:bg-slate-700 transition font-black"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-800" title="Requiere SUPER ADMIN para editar">
                          {maxSlotsPerHour} turnos (Bloqueado)
                        </div>
                      )}
                    </div>

                    {/* EMAIL OUTBOUND TOGGLE */}
                    <div className="flex items-center justify-between gap-3 bg-slate-900 p-3 rounded border border-slate-800">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-slate-250 block">Correos de Confirmación Automatizados</span>
                        <span className="text-[10px] text-slate-450">Envío masivo con el código de barra QR para verificación</span>
                      </div>
                      <input
                        type="checkbox"
                        disabled={currentRole !== 'super'}
                        checked={enableEmailAlerts}
                        onChange={(e) => setEnableEmailAlerts(e.target.checked)}
                        className="rounded cursor-pointer accent-blue-600 w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* SECURITY SYSTEM LOGO WARNING */}
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-xs space-y-2.5">
                      <span className="font-extrabold text-blue-400 uppercase tracking-widest text-[9px] block">Integración Proxy Institucional</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Este portal está conectado a la infraestructura proxy de desvío oficial del Tribunal Electoral, que sirve el escudo heráldico nacional de Panamá de forma segura mediante HTTPS con compresión PNG inteligente.
                      </p>
                    </div>

                  </div>
                </div>

                {/* BANNER SYSTEM ALERTS SIMULATOR (Super Admin special) */}
                <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4 shadow-md max-w-2xl">
                  <div className="border-b border-slate-900 pb-2.5 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-400" />
                    <div>
                      <h3 className="text-xs font-black uppercase text-white tracking-wider">Alertas y Mensajes del Sistema</h3>
                      <p className="text-[10px] text-slate-400">Publicación en la portada principal del portal de citas</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Mensaje de Aviso Temporal</label>
                      <textarea
                        disabled={currentRole !== 'super'}
                        placeholder="Ejemplo: Por motivos de fiestas patrias, las oficinas del Tribunal Electoral laborarán hasta las 12:00 PM este viernes."
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        className="w-full h-20 bg-slate-900 border border-slate-800 text-white p-2.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50 placeholder-slate-600 leading-normal"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-slate-900 p-3 rounded border border-slate-800">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-slate-250 block">Activar Alerta en Portada</span>
                        <span className="text-[10px] text-slate-450">Fuerza la visualización del aviso preventivo institucional</span>
                      </div>
                      <input
                        type="checkbox"
                        disabled={currentRole !== 'super'}
                        checked={isAlertActive}
                        onChange={(e) => setIsAlertActive(e.target.checked)}
                        className="rounded cursor-pointer accent-blue-600 w-4 h-4 disabled:slate-800"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}
            {/* TAB CONTENT: HORARIOS (Cambiar Horarios de Regionales) */}
            {activeSubTab === 'horarios' && (
              <div className="space-y-6">
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span>Sedes Regionales y Horarios Operativos</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Actualice la jornada y horas de atención de las Direcciones y Comarcas Oficiales.</p>
                  </div>
                  <button
                    onClick={handleResetBranches}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white text-[10px] font-bold uppercase tracking-wider py-2 px-3.5 rounded border border-slate-750 transition flex items-center gap-1.5"
                    title="Restaurar de fábrica"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resetear Sedes
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mutableSucursales.map((suc) => (
                    <div key={suc.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-between hover:border-slate-700 transition space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] bg-blue-950 text-blue-300 font-black px-2 py-0.5 rounded tracking-wider uppercase border border-blue-900/35">
                            {suc.provincia}
                          </span>
                          <span className="text-[10px] text-slate-550 font-mono font-bold">ID: {suc.id}</span>
                        </div>
                        <h4 className="text-xs font-black text-white hover:text-blue-400 transition">{suc.nombre}</h4>
                        <div className="text-[11px] text-slate-400 space-y-1 font-medium select-none">
                          <p className="leading-relaxed">📍 <span className="text-slate-300">{suc.direccion}</span></p>
                          <p>📞 <span className="text-slate-300">{suc.telefono}</span></p>
                        </div>
                      </div>

                      <div className="border-t border-slate-900 pt-3 flex flex-col gap-2.5">
                        <div className="bg-slate-900 p-2 rounded border border-slate-850/80">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Horario de Atención</span>
                          <span className="text-xs font-mono font-bold text-emerald-400 block mt-0.5">🕒 {suc.horario}</span>
                        </div>
                        <button
                          onClick={() => handleOpenEditSucursal(suc)}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] font-black uppercase tracking-wider py-1.5 rounded transition border border-slate-700"
                        >
                          Editar Horario de Atención
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* EDIT SUCURSAL MODAL OVERLAY */}
                {editingSucursal && (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-md space-y-4 shadow-2xl relative text-slate-100">
                      <button
                        onClick={() => setEditingSucursal(null)}
                        className="absolute right-4 top-4 text-slate-450 hover:text-white p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-blue-400" />
                          <span>Modificar Horario de Sede</span>
                        </h3>
                        <p className="text-[10px] text-slate-400">Configure las jornada operativa de {editingSucursal.nombre}</p>
                      </div>

                      <div className="space-y-3 py-1 text-xs">
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Nombre de Sede</label>
                          <input
                            type="text"
                            value={editSucNombre}
                            onChange={(e) => setEditSucNombre(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Dirección Física</label>
                          <textarea
                            value={editSucDireccion}
                            onChange={(e) => setEditSucDireccion(e.target.value)}
                            className="w-full h-14 bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Teléfono de Enlace</label>
                            <input
                              type="text"
                              value={editSucTelefono}
                              onChange={(e) => setEditSucTelefono(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase text-amber-400 block">Horario de Servicio</label>
                            <input
                              type="text"
                              placeholder="Ej: Lunes a Viernes 8:00 AM - 4:00 PM"
                              value={editSucHorario}
                              onChange={(e) => setEditSucHorario(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                        <button
                          type="button"
                          onClick={() => setEditingSucursal(null)}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSucursal}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-1.5 rounded transition shadow-md"
                        >
                          Guardar Horario
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: TRAMITES (Editar, Crear, Eliminar Trámites) */}
            {activeSubTab === 'tramites' && (
              <div className="space-y-6">
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      <span>Catálogo de Trámites, Requisitos y Servicios</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">Cree, edite, o elimine las categorías del Registro Civil y sus trámites relacionados.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleOpenCreateCategoria}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider py-2 px-3.5 rounded transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nueva Categoría
                    </button>
                    <button
                      onClick={handleResetTramites}
                      className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded border border-slate-755 transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3" />
                      Resetear Catálogo
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {mutableServicios.map((cat) => (
                    <div key={cat.id} className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4 shadow-lg">
                      {/* CATEGORY BLOCK HEADER */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-900 font-black px-2 py-0.5 rounded uppercase font-mono">
                              Cód: {cat.id}
                            </span>
                            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                              {cat.nombre}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-2xl">{cat.descripcion}</p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            onClick={() => handleOpenCreateSubServicio(cat.id)}
                            className="bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-350 hover:text-white border border-indigo-850 text-[9px] font-black uppercase px-2.5 py-1 rounded transition"
                            title="Agregar trámite bajo esta área"
                          >
                            + Agregar Trámite
                          </button>
                          <button
                            onClick={() => handleOpenEditCategoria(cat)}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 p-1 rounded transition"
                            title="Editar metadata de área"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategoria(cat.id)}
                            className="bg-red-955 hover:bg-red-900 text-red-400 hover:text-white border border-red-950 p-1 rounded transition"
                            title="Eliminar esta área y trámites"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* SUB-SERVICES (TRAMITES) INSIDE THE CATEGORY */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cat.subServicios.length === 0 ? (
                          <div className="col-span-full bg-slate-900/30 border border-dashed border-slate-850 p-6 text-center text-slate-500 text-xs italic">
                            No hay trámites definidos en esta área. Agregue uno e intente agendar de nuevo.
                          </div>
                        ) : (
                          cat.subServicios.map((sub) => (
                            <div key={sub.id} className="bg-slate-900/65 border border-slate-850/70 p-4 rounded-lg flex flex-col justify-between space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <h5 className="text-[11px] font-black text-white pr-2 leading-tight">{sub.nombre}</h5>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleOpenEditSubServicio(cat.id, sub)}
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-1 rounded transition"
                                      title="Editar trámite"
                                    >
                                      <Edit3 className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubServicio(cat.id, sub.id)}
                                      className="bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-900/40 p-1 rounded transition"
                                      title="Eliminar trámite"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-400 line-clamp-3 leading-normal">{sub.descripcion}</p>
                              </div>

                              {/* REQUISITOS LIST HIGHLIGHT */}
                              <div className="space-y-1 bg-slate-950/40 p-2 rounded border border-slate-850">
                                <span className="text-[8px] font-black uppercase text-indigo-400 tracking-wider block">Requisitos Obligatorios Civiles ({sub.requisitos.length})</span>
                                {sub.requisitos.length === 0 ? (
                                  <span className="text-[9px] text-slate-500 italic block">Sin requisitos especiales requeridos.</span>
                                ) : (
                                  <div className="max-h-20 overflow-y-auto space-y-1.5 pr-1 mt-1 scrollbar-thin">
                                    {sub.requisitos.map((req, rIdx) => (
                                      <div key={rIdx} className="flex items-start gap-1">
                                        <span className="text-emerald-400 text-[10px] shrink-0">✓</span>
                                        <span className="text-[9px] text-slate-350 leading-tight font-medium">{req}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CREATE/EDIT CATEGORY MODAL */}
                {(isCreatingCategoria || editingCategoria) && (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-md space-y-4 shadow-2xl relative text-slate-100">
                      <button
                        onClick={() => {
                          setIsCreatingCategoria(false);
                          setEditingCategoria(null);
                        }}
                        className="absolute right-4 top-4 text-slate-450 hover:text-white p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-blue-400" />
                          <span>{isCreatingCategoria ? 'Crear Nueva Categoría' : 'Editar Categoría de Trámites'}</span>
                        </h3>
                        <p className="text-[10px] text-slate-400">Administre el catálogo gubernamental de servicios del Tribunal Electoral.</p>
                      </div>

                      <div className="space-y-3 py-1 text-xs">
                        {isCreatingCategoria && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">ID del Servicio (ID Único)</label>
                            <select
                              value={catFormId}
                              onChange={(e) => setCatFormId(e.target.value as ServicioCategoriaId)}
                              className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                            >
                              <option value="cedulacion">Cedulación</option>
                              <option value="registro_civil">Registro Civil</option>
                              <option value="extranjeria">Trámites de Extranjería</option>
                              <option value="organizacion_electoral">Organización Electoral</option>
                            </select>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Nombre Público de Área</label>
                          <input
                            type="text"
                            placeholder="Ej: Registro Civil de Citas"
                            value={catFormNombre}
                            onChange={(e) => setCatFormNombre(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Descripción Oficial</label>
                          <textarea
                            placeholder="Breve reseña del alcance de este tipo de trámites públicos."
                            value={catFormDescripcion}
                            onChange={(e) => setCatFormDescripcion(e.target.value)}
                            className="w-full h-18 bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Icono de Identificación</label>
                          <select
                            value={catFormIcono}
                            onChange={(e) => setCatFormIcono(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                          >
                            <option value="IdCard">IdCard (Cédula de Identidad)</option>
                            <option value="FileText">FileText (Certificaciones)</option>
                            <option value="Globe">Globe (Extranjería)</option>
                            <option value="Vote">Vote (Organización Electoral)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingCategoria(false);
                            setEditingCategoria(null);
                          }}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCategoria}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-1.5 rounded transition shadow-md"
                        >
                          Guardar Categoría
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CREATE/EDIT SUB-SERVICE (TRÁMITE SPECIFIC) MODAL */}
                {(isCreatingSubServicio || editingSubServicio) && (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-lg space-y-4 shadow-2xl relative text-slate-100">
                      <button
                        onClick={() => {
                          setIsCreatingSubServicio(false);
                          setEditingSubServicio(null);
                          setEditingSubServicioCatId(null);
                        }}
                        className="absolute right-4 top-4 text-slate-450 hover:text-white p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-indigo-400" />
                          <span>{isCreatingSubServicio ? 'Agregar Nuevo Trámite Público' : 'Editar Parámetros de Trámite'}</span>
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Área seleccionada: <span className="font-bold text-slate-300 font-mono text-[10px] uppercase">{editingSubServicioCatId}</span>
                        </p>
                      </div>

                      <div className="space-y-3.5 py-1 text-xs">
                        {isCreatingSubServicio && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">ID Técnico (ID de Base de Datos)</label>
                            <input
                              type="text"
                              placeholder="Ej: ced_duplicado_urgente"
                              value={subFormId}
                              onChange={(e) => setSubFormId(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Nombre Comercial / Público</label>
                          <input
                            type="text"
                            placeholder="Ej: Duplicado Express de Cédula por Deterioro"
                            value={subFormNombre}
                            onChange={(e) => setSubFormNombre(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Descripción y Alcance</label>
                          <textarea
                            placeholder="Detalle de en qué consiste este trámite y quién debe realizarlo."
                            value={subFormDescripcion}
                            onChange={(e) => setSubFormDescripcion(e.target.value)}
                            className="w-full h-16 bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        {/* REQUISITOS LIST BUILDER PANEL */}
                        <div className="space-y-2 border-t border-slate-800 pt-3">
                          <span className="text-[10px] font-black uppercase text-indigo-400 block tracking-wider">Creador Dinámico de Requisitos Forzosos</span>
                          
                          {/* Current list */}
                          <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1 max-h-24 overflow-y-auto">
                            {subFormRequisitos.length === 0 ? (
                              <span className="text-[9px] text-slate-550 italic block p-1">No hay requisitos. Todos los ciudadanos califican sin papelería previa.</span>
                            ) : (
                              subFormRequisitos.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-900 px-2 py-1 rounded border border-slate-850 text-[9px] font-medium leading-none">
                                  <span className="text-slate-200 truncate pr-4">{idx + 1}. {item}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRequisito(idx)}
                                    className="text-red-400 hover:text-white font-extrabold shrink-0 px-1 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add input */}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Ej: Presentar Cédula Vencida o Pasaporte"
                              value={newRequisitoText}
                              onChange={(e) => setNewRequisitoText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddRequisito();
                                }
                              }}
                              className="flex-1 bg-slate-950 border border-slate-750 text-white p-2 text-xs rounded focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                            />
                            <button
                              type="button"
                              onClick={handleAddRequisito}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-3 rounded transition"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingSubServicio(false);
                            setEditingSubServicio(null);
                            setEditingSubServicioCatId(null);
                          }}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSubServicio}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-1.5 rounded transition shadow-md"
                        >
                          Guardar Trámite
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: EXTRANJERIA (Carga CSV y Control Estatus Migratorio) */}
            {activeSubTab === 'extranjeria' && (
              <div className="space-y-6 animate-fade-in font-sans">
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                      <span>Base de Elegibilidad Extranjería (Pasaportes)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Gestione la lista consolidada de pasaportes extranjeros elegibles para realizar trámites. Suba un archivo CSV o modifique registros de forma manual.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                      currentRole === 'sencillo' 
                        ? 'bg-red-950/80 text-red-400 border-red-900/50' 
                        : 'bg-emerald-950/80 text-emerald-400 border-emerald-900/50'
                    }`}>
                      {currentRole === 'sencillo' ? '🔒 Solo Lectura' : '✍ Permiso de Carga Activo'}
                    </span>
                  </div>
                </div>

                {/* API COMMUNICATOR HOOK-UP COMPONENT */}
                <ExtranjeriaController currentRole={currentRole} />

              </div>
            )}

          </div>

        </div>
      )}


      {/* FOOTER BAR FOR CREDIT/SPECS */}
      <div className="bg-slate-950 p-2.5 border-t border-slate-850 text-center text-[10px] text-slate-500 font-mono tracking-wide leading-none flex flex-wrap gap-2 justify-center">
        <span>ESTADO: SISTEMA EN LÍNEA</span>
        <span>|</span>
        <span>VERSION: PLATINUM MIGRATION 2.4.6</span>
        <span>|</span>
        <span>CERRADO CON LLAVE BIOMÉTRICA DE 256 BITS</span>
      </div>

      {/* EDIT MODAL OVERLAY */}
      {editingCita && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-lg space-y-4 shadow-2xl relative text-slate-100">
            
            <button
              onClick={() => setEditingCita(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white transition"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>Modificar Registros: {editingCita.codigoTransaccion}</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Actualice la fecha, hora, estado o información filiativa correspondiente.</p>
            </div>

            <div className="space-y-4 py-2">
              
              {/* SCHEDULE DETAIL FIELDS (Both simple and super admin can edit) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Fecha del Trámite</label>
                  <input
                    type="date"
                    value={editFecha}
                    onChange={(e) => setEditFecha(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Hora Asignada</label>
                  <input
                    type="text"
                    value={editHora}
                    onChange={(e) => setEditHora(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              {/* SERVICE READONLY METADATA */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-850 text-[11px] leading-relaxed space-y-1">
                <div>
                  <span className="text-slate-450 uppercase font-black tracking-wider text-[9px] block">Trámite Técnico Solicitado</span>
                  <span className="font-bold text-slate-200">{getSubServicioName(editingCita.subServicioId)}</span>
                </div>
                <div>
                  <span className="text-slate-450 uppercase font-black tracking-wider text-[9px] block">Sede Asignada</span>
                  <span className="font-bold text-slate-200">{getSucursalName(editingCita.sucursalId)}</span>
                </div>
              </div>

              {/* CITIZEN PROFILE DETAILS CARD (Editable only by Super Admin) */}
              <div className="border-t border-slate-800 pt-3.5 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-350 tracking-wider flex items-center justify-between">
                  <span>Datos de Identificación Personal</span>
                  {currentRole !== 'super' && (
                    <span className="text-[8px] tracking-normal bg-amber-950/80 text-amber-500 border border-amber-900/40 px-1.5 py-0.5 rounded font-black uppercase">
                      Edición Bloqueada (Solo Super Admin)
                    </span>
                  )}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Tipo Ciudadano</label>
                    <select
                      disabled={currentRole !== 'super'}
                      value={editTipoIdentificacion}
                      onChange={(e) => setEditTipoIdentificacion(e.target.value as TipoIdentificacion)}
                      className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none disabled:opacity-50"
                    >
                      <option value="Cedula">Cédula Nacional</option>
                      <option value="CedulaJuvenil">Cédula Juvenil</option>
                      <option value="Extranjero">Carnet PE (Extranjería)</option>
                      <option value="Pasaporte">Pasaporte Internacional</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Número de Cédula/id</label>
                    <input
                      type="text"
                      disabled={currentRole !== 'super'}
                      value={editIdentificacion}
                      onChange={(e) => setEditIdentificacion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Teléfono Móvil</label>
                    <input
                      type="text"
                      disabled={currentRole !== 'super'}
                      value={editTelefono}
                      onChange={(e) => setEditTelefono(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Correo Electrónico</label>
                    <input
                      type="email"
                      disabled={currentRole !== 'super'}
                      value={editCorreo}
                      onChange={(e) => setEditCorreo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* STATE STATUS CONTROL (Both can edit) */}
              <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded border border-slate-850">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-300 block">Estado de la Cita Presencial</span>
                  <span className="text-[9px] text-slate-500">¿Desea cambiar la confirmación al estado cancelado?</span>
                </div>
                <select
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value as 'confirmada' | 'cancelada' | 'asistire' | 'no_asistire')}
                  className="bg-slate-900 border border-slate-700 text-white p-1 text-xs px-2 rounded cursor-pointer focus:outline-none"
                >
                  <option value="confirmada">Confirmada (Reservada)</option>
                  <option value="asistire">✓ Asistencia Confirmada</option>
                  <option value="no_asistire">✗ No Asistirá</option>
                  <option value="cancelada">Cancelada / Liberada</option>
                </select>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setEditingCita(null)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-extrabold text-[11px] uppercase tracking-wider px-4 py-2 rounded transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2 rounded transition shadow-md"
              >
                Guardar Cambios
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
