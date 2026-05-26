import React, { useState, useEffect } from 'react';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  Clock,
  Printer,
  Calendar,
  Sliders,
  TrendingUp
} from 'lucide-react';
import { AdminRole } from '../types';

const SELECT_TIMES_OPTIONS = [
  '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM', '03:00 AM', '03:30 AM',
  '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

interface ExtranjeriaControllerProps {
  currentRole: AdminRole;
}

export default function ExtranjeriaController({ currentRole }: ExtranjeriaControllerProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  // Configuration states for dynamic schedule parameters of extranjeria
  const [capacidad, setCapacidad] = useState<number>(() => {
    return parseInt(localStorage.getItem('extranjeria_capacidad_usuarios') || '2', 10);
  });
  const [intervalo, setIntervalo] = useState<number>(() => {
    return parseInt(localStorage.getItem('extranjeria_intervalo_minutos') || '15', 10);
  });
  const [horaInicio, setHoraInicio] = useState<string>(() => {
    return localStorage.getItem('extranjeria_hora_inicio') || '07:00 AM';
  });
  const [horaFin, setHoraFin] = useState<string>(() => {
    return localStorage.getItem('extranjeria_hora_fin') || '02:00 AM';
  });

  const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(prev => prev.text === text ? { text: '', type: null } : prev);
    }, 5000);
  };

  const promptSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole === 'sencillo') {
      showStatus('Operación denegada. Solo personal de Inmigración/Admin puede configurar la capacidad.', 'error');
      return;
    }
    setShowConfirmSave(true);
  };

  const executeSaveConfig = async () => {
    setShowConfirmSave(false);
    
    // Save locally
    localStorage.setItem('extranjeria_capacidad_usuarios', String(capacidad));
    localStorage.setItem('extranjeria_intervalo_minutos', String(intervalo));
    localStorage.setItem('extranjeria_hora_inicio', horaInicio);
    localStorage.setItem('extranjeria_hora_fin', horaFin);
    
    // Save to server
    try {
      const res = await fetch('/api/extranjeria/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capacidad,
          intervalo,
          horaInicio,
          horaFin
        })
      });
      const data = await res.json();
      if (data && data.success) {
        showStatus('¡Éxito! Configuración de citas para Extranjería actualizada y sincronizada en el servidor.', 'success');
      } else {
        showStatus('Configuración guardada localmente, pero falló la sincronización con el servidor.', 'info');
      }
    } catch (err) {
      console.error(err);
      showStatus('Configuración guardada localmente, pero falló la sincronización con el servidor.', 'info');
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.appointments)) {
        // Filter extranjeria appointments only
        const filtered = data.appointments.filter((app: any) => {
          const cat = (app.servicioCategoria || '').toLowerCase();
          const catName = (app.categoriaNombre || '').toLowerCase();
          const sub = (app.subServicioNombre || '').toLowerCase();
          const subId = (app.subServicioId || '').toLowerCase();
          return (
            cat === 'extranjeria' ||
            catName.includes('extranj') ||
            sub.includes('extranj') ||
            subId.includes('extranj')
          );
        });
        setAppointments(filtered);
      } else {
        showStatus('Error al recibir listado de citas.', 'error');
      }
    } catch (err) {
      console.error(err);
      showStatus('Fallo de red al conectar con el servidor de citas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();

    // Load config from server
    fetch('/api/extranjeria/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.config) {
          const { capacidad: cap, intervalo: inter, horaInicio: hIni, horaFin: hFin } = data.config;
          setCapacidad(cap);
          setIntervalo(inter);
          setHoraInicio(hIni);
          setHoraFin(hFin);
          
          localStorage.setItem('extranjeria_capacidad_usuarios', String(cap));
          localStorage.setItem('extranjeria_intervalo_minutos', String(inter));
          localStorage.setItem('extranjeria_hora_inicio', hIni);
          localStorage.setItem('extranjeria_hora_fin', hFin);
        }
      })
      .catch(err => console.warn("Failed to load extranjeria config from server:", err));
  }, []);

  const handlePrintPDF = () => {
    window.print();
  };

  // Filter actual displayed appointments
  const filteredAppointments = appointments.filter((app: any) => {
    // 1. Search Query filter (matches Name, Passport, ID, Tracking Code, Email, or Transaction code)
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || (
      (app.datosPersonales?.nombreCompleto || app.nombre || '').toLowerCase().includes(query) ||
      (app.datosPersonales?.primerNombre || '').toLowerCase().includes(query) ||
      (app.datosPersonales?.primerApellido || '').toLowerCase().includes(query) ||
      (app.datosPersonales?.pasaporte || app.identificacion || '').toLowerCase().includes(query) ||
      (app.correo || app.datosPersonales?.correo || '').toLowerCase().includes(query) ||
      (app.codigoTransaccion || '').toLowerCase().includes(query) ||
      (app.id || '').toLowerCase().includes(query)
    );

    // 2. Status Filter
    const matchesStatus = statusFilter === 'todos' || app.estado === statusFilter;

    // 3. Date Filter
    const matchesDate = !dateFilter || app.fecha === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div id="extranjeria-controller-root" className="space-y-6 text-slate-100 font-sans">
      
      {/* STYLE OVERRIDES INYECTADO PARA IMPRESIÓN LIMPIA DE ARCHIVO PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Ocultar toda la interfaz de la app */
          body * {
            visibility: hidden;
            background: transparent !important;
          }
          /* Mostrar únicamente el contenedor de impresión especificado */
          #print-area-extranjeria, #print-area-extranjeria * {
            visibility: visible;
          }
          #print-area-extranjeria {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 1.5in !important;
          }
          /* Quitar márgenes de cabecera y pie de página del navegador standard */
          @page {
            margin: 1cm;
          }
        }
      `}} />

      {/* STATUS BANNER */}
      {statusMessage.text && (
        <div className={`p-3.5 rounded border text-xs font-semibold flex items-center gap-2.5 animate-fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800' 
            : statusMessage.type === 'error'
              ? 'bg-red-950/90 text-red-300 border-red-900'
              : 'bg-slate-900 text-slate-300 border-slate-755'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : statusMessage.type === 'error' ? (
            <XCircle className="w-4 h-4 shrink-0 text-red-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* MAIN LAYOUT: SPLIT IN TWO SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CONTROL OPERATIVO */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Control Horarios & Cupos</span>
            </h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Modifique los niveles de capacidad por slot, duración en minutos y el horario hábil oficial para trámites migratorios.
            </p>

            <form onSubmit={promptSaveConfig} className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Capacidad (Cupos por Slot)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={capacidad}
                  onChange={(e) => setCapacidad(parseInt(e.target.value, 10) || 1)}
                  disabled={currentRole === 'sencillo'}
                  className="w-full bg-slate-900 border border-slate-750 text-white p-2.5 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase text-slate-440 block">Intervalo de Atención</label>
                <select
                  value={intervalo}
                  onChange={(e) => setIntervalo(parseInt(e.target.value, 10))}
                  disabled={currentRole === 'sencillo'}
                  className="w-full bg-slate-900 border border-slate-755 text-white p-2.5 rounded text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                >
                  <option value="10">10 minutos</option>
                  <option value="15">15 minutos</option>
                  <option value="20">20 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-440 block">Apertura</label>
                  <select
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    disabled={currentRole === 'sencillo'}
                    className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-medium"
                  >
                    {SELECT_TIMES_OPTIONS.map(time => (
                      <option key={`start-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-440 block">Cierre</label>
                  <select
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    disabled={currentRole === 'sencillo'}
                    className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-medium"
                  >
                    {SELECT_TIMES_OPTIONS.map(time => (
                      <option key={`end-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={currentRole === 'sencillo'}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Aplicar Programación</span>
              </button>
            </form>
          </div>

          {/* QUICK STATISTICS CARDS */}
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Resumen de Demanda</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 p-3 rounded border border-slate-800 text-center">
                <span className="text-[8px] text-slate-450 uppercase font-black block">Total Citas</span>
                <span className="text-xl font-mono font-black text-white">{filteredAppointments.length}</span>
              </div>
              <div className="bg-slate-900 p-3 rounded border border-slate-800 text-center">
                <span className="text-[8px] text-slate-450 uppercase font-black block">Confirmadas</span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  {filteredAppointments.filter(a => a.estado === 'confirmada' || a.estado === 'asistire').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SEARCHABLE AND FILTERABLE APPOINTMENTS VIEWER */}
        <div className="lg:col-span-8 bg-slate-950 rounded-lg border border-slate-805 p-5 flex flex-col space-y-4 shadow-xl">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span>Citas de Extranjería Registradas</span>
                <span className="bg-slate-900 border border-slate-750 text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                  {filteredAppointments.length}
                </span>
              </h4>
              <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">Mostrando únicamente reservas activas para el servicio de Extranjería</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* REFRESH */}
              <button
                type="button"
                onClick={fetchAppointments}
                disabled={loading}
                className="text-slate-400 hover:text-white transition bg-slate-900 hover:bg-slate-850 p-2.5 rounded border border-slate-800 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide cursor-pointer disabled:opacity-40"
                title="Refrescar listado"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sincronizar</span>
              </button>

              {/* DOWNLOAD REPORT PDF / PRINT */}
              <button
                type="button"
                onClick={handlePrintPDF}
                disabled={filteredAppointments.length === 0}
                className="text-white bg-blue-600 hover:bg-blue-700 transition p-2.5 rounded border border-blue-700 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider cursor-pointer font-sans shadow-md shadow-blue-900/30 disabled:opacity-55 disabled:cursor-not-allowed"
                title="Exportar listado a documento PDF"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          {/* SEARCH AND FILTERS TOOLBAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Buscar ciudadano, pasaporte o tracking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded text-[11px] pl-8.5 pr-3 py-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded text-[11px] p-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer"
              >
                <option value="todos">≡ Todos los Estados</option>
                <option value="confirmada">✓ Citas Confirmadas</option>
                <option value="asistire">✓ Asistencia Confirmada</option>
                <option value="no_asistire">✗ No Asistirá</option>
                <option value="cancelada">✗ Citas Canceladas</option>
              </select>
            </div>

            {/* Date Picker */}
            <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded px-3">
              <Calendar className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-slate-200 w-full text-[11px] py-2.5 focus:outline-none font-semibold cursor-pointer scheme-dark"
              />
              {dateFilter && (
                <button 
                  type="button" 
                  onClick={() => setDateFilter('')}
                  className="text-slate-450 hover:text-white transition ml-1.5 font-bold text-xs"
                  title="Limpiar fecha"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="flex-1 overflow-x-auto min-h-[350px] border border-slate-850 rounded bg-slate-950">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-2 text-slate-400">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <span className="text-xs font-semibold uppercase tracking-wider">Cargando citas...</span>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-2 text-slate-400 px-4 text-center">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-1" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">No se localizaron citas</span>
                <p className="text-[10px] text-slate-450 max-w-sm leading-relaxed">
                  No hay reservas cargadas para el servicio de Extranjería que coincidan con los filtros y barras de búsqueda ingresados.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-[11px] leading-relaxed">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-450 font-mono">
                    <th className="p-3">Código / Seguimiento</th>
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Ciudadano Extranjero</th>
                    <th className="p-3 text-center">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredAppointments.map((app: any) => {
                    const statusConfig = {
                      confirmada: { label: 'CONFIRMADA', bg: 'bg-emerald-950/80 border-emerald-900/50 text-emerald-300' },
                      asistire: { label: 'CONFIRMADA', bg: 'bg-emerald-950/80 border-emerald-900/50 text-emerald-300' },
                      no_asistire: { label: 'NO ASISTIRÁ', bg: 'bg-amber-950/80 border-amber-900/50 text-amber-400' },
                      cancelada: { label: 'REMOVIDA/CANCELADA', bg: 'bg-red-950/80 border-red-900/50 text-red-400' }
                    }[app.estado as 'confirmada' | 'asistire' | 'no_asistire' | 'cancelada'] || { label: 'INDEFINIDO', bg: 'bg-slate-800 border-slate-700 text-slate-400' };

                    // Extract identity or passport
                    const displayName = app.datosPersonales?.nombreCompleto || app.nombre || 'Ciudadano No Identificado';
                    const passportNum = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                    const emailAddress = app.datosPersonales?.correo || app.correo || 'N/D';
                    
                    return (
                      <tr key={app.id} className="hover:bg-slate-900/40 transition duration-150">
                        <td className="p-3 space-y-0.5">
                          <span className="font-mono font-extrabold tracking-wider text-amber-400 block">{app.id}</span>
                          <span className="text-[9px] text-slate-500 font-mono block">Tx: {app.codigoTransaccion}</span>
                        </td>
                        <td className="p-3 space-y-0.5 font-medium">
                          <span className="text-slate-100 font-bold block">{app.fecha}</span>
                          <span className="text-[10px] text-slate-450 font-mono block uppercase">{app.hora}</span>
                        </td>
                        <td className="p-3 space-y-0.5">
                          <div className="font-bold text-slate-200 uppercase tracking-tight">{displayName}</div>
                          <div className="flex items-center gap-1.5 text-[9.5px] text-slate-450 leading-relaxed font-bold font-mono">
                            <span className="text-amber-500">PAS: {passportNum}</span>
                            <span className="text-slate-700">•</span>
                            <span className="text-slate-450 lowercase">{emailAddress}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusConfig.bg}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="text-[10px] text-slate-400 italic text-right">
            Sugerencia: Para descargar en PDF, presione el botón <strong>EXPORTAR PDF</strong> y elija "Guardar como PDF" en su navegador.
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* SECCIÓN IMPRIMIBLE OCULTA (OPTIMIZADA PARA PDF) */}
      {/* ========================================== */}
      <div id="print-area-extranjeria" className="hidden text-black bg-white p-12 max-w-4xl mx-auto border-4 border-double border-black">
        {/* Header de la Entidad */}
        <div className="text-center font-sans space-y-1 border-b-2 border-black pb-4">
          <h1 className="text-lg font-black tracking-widest uppercase m-0 leading-tight">REPÚBLICA DE PANAMÁ</h1>
          <h2 className="text-sm font-extrabold m-0 uppercase tracking-widest">TRIBUNAL ELECTORAL</h2>
          <h3 className="text-xs font-bold text-slate-700 m-0 uppercase tracking-wide">DIRECCIÓN NACIONAL DE CEDULACIÓN / REGISTRO CIVIL</h3>
          <p className="text-[10px] font-mono m-0 text-slate-600 mt-1">SISTEMA INTEGRAL DE RESERVA DE CITAS PRESENCIALES</p>
        </div>

        {/* Datos Corporativos de Reporte */}
        <div className="grid grid-cols-2 gap-4 my-6 text-[11px] leading-relaxed">
          <div>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">DEPARTAMENTO:</strong> Unidad de Extranjería / Trámites de Naturalización</p>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">DIRECCIÓN SEDE:</strong> Sede Principal de Ancón, Ciudad de Panamá</p>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">REPORTE GENERADO POR:</strong> {currentRole.toUpperCase()} (MÓDULO INTERNO)</p>
          </div>
          <div className="text-right">
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">FECHA DE EMISIÓN:</strong> {new Date().toLocaleString()}</p>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">TOTAL DE REGISTROS:</strong> {filteredAppointments.length} Cita(s)</p>
            {statusFilter !== 'todos' && (
              <p className="m-0 font-bold uppercase text-red-700"><strong className="text-slate-600">FILTRADO ESTADO:</strong> {statusFilter.toUpperCase()}</p>
            )}
          </div>
        </div>

        {/* TÍTULO DE REPORTE */}
        <h4 className="text-center text-sm font-black uppercase tracking-wider mb-4 border-2 border-slate-300 py-1.5 bg-slate-100">
          LISTADO OFICIAL DE CITACIONES AGENDADAS - EXTRANJERÍA
        </h4>

        {/* TABLA PRINCIPAL */}
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-8 font-extrabold italic text-slate-500 text-xs">
            No se encontraron citas programadas en los parámetros seleccionados.
          </div>
        ) : (
          <table className="w-full border-collapse border border-black text-[10px] mb-8">
            <thead>
              <tr className="bg-slate-200 border-b border-black text-left font-black uppercase text-slate-800">
                <th className="border border-black p-2 w-1/4">CÓDIGO DE CITA</th>
                <th className="border border-black p-2 w-1/5">FECHA Y HORA</th>
                <th className="border border-black p-2">NOMBRE DEL CIUDADANO</th>
                <th className="border border-black p-2 w-1/6 text-center">PASAPORTE</th>
                <th className="border border-black p-2 w-1/6 text-center">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((app: any) => (
                <tr key={app.id} className="border-b border-black">
                  <td className="border border-black p-2 font-mono font-bold">{app.id}</td>
                  <td className="border border-black p-2 uppercase">{app.fecha} - {app.hora}</td>
                  <td className="border border-black p-2 font-bold uppercase">{app.datosPersonales?.nombreCompleto || app.nombre}</td>
                  <td className="border border-black p-2 text-center font-mono font-bold uppercase">{app.datosPersonales?.pasaporte || app.identificacion}</td>
                  <td className="border border-black p-2 text-center font-bold uppercase">{app.estado === 'asistire' || app.estado === 'confirmada' ? 'CONFIRMADA' : app.estado.toUpperCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* PIE DE PÁGINA Y VALIDACIONES OFICIALES */}
        <div className="mt-16 text-[10.5px]">
          <div className="grid grid-cols-2 gap-12 text-center text-slate-600 pt-8 font-sans">
            <div className="space-y-1">
              <div className="border-t border-black w-2/3 mx-auto pt-1"></div>
              <p className="m-0 uppercase font-bold text-[9px] text-black">FIRMA DE AUTORIDAD DE CEDULACIÓN</p>
              <p className="m-0 text-[8px] tracking-wide uppercase">Tribunal Electoral de Panamá</p>
            </div>
            <div className="space-y-1">
              <div className="border-t border-black w-2/3 mx-auto pt-1"></div>
              <p className="m-0 uppercase font-bold text-[9px] text-black font-sans">JEFE DE SERVICIO DE MIGRACIÓN/REGISTRO</p>
              <p className="m-0 text-[8px] tracking-wide uppercase font-mono">ID Firma Electrónica: #TE-591244</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL FOR EXTRANJERÍA CONFIG SAVE */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-amber-550/20 pb-3 text-amber-500">
              <AlertCircle className="w-6 h-6 shrink-0 text-amber-500" />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-100 font-sans">Confirmar Cambios de Programación</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold font-sans">
              ¿Está seguro de que desea aplicar estos cambios a la planificación de citas de Extranjería? 
              Los nuevos cupos, intervalos de atención y horarios regirán de manera inmediata para todos los ciudadanos.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded text-xs font-black uppercase tracking-wide cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeSaveConfig}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-black uppercase tracking-wider shadow-md cursor-pointer transition flex items-center gap-1"
              >
                Sí, Estoy Seguro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
