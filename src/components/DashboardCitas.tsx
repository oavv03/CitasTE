import React, { useState } from 'react';
import { Cita } from '../types';
import { SERVICIOS_TRIBUNAL, SUCURSALES_TE } from '../data';
import { Calendar, Clock, MapPin, Eye, FileText, XCircle, Search, AlertCircle, Sparkles, AlertTriangle, Trash2 } from 'lucide-react';

interface DashboardCitasProps {
  citas: Cita[];
  onSelectCita: (cita: Cita) => void;
  onCancelCita: (citaId: string) => void;
  onDeleteCita: (citaId: string) => void;
  onNavigateToBooking: () => void;
}

export default function DashboardCitas({
  citas,
  onSelectCita,
  onCancelCita,
  onDeleteCita,
  onNavigateToBooking,
}: DashboardCitasProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'confirmada' | 'asistire' | 'cancelada'>('todos');
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const filteredCitas = citas.filter((cita) => {
    const matchesSearch =
      cita.codigoTransaccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cita.datosPersonales.identificacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cita.datosPersonales.correo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || 
      (statusFilter === 'confirmada' && cita.estado === 'confirmada') ||
      (statusFilter === 'asistire' && cita.estado === 'asistire') ||
      (statusFilter === 'cancelada' && (cita.estado === 'cancelada' || cita.estado === 'no_asistire'));

    return matchesSearch && matchesStatus;
  });

  const getCategorioNombre = (id: string) => {
    return SERVICIOS_TRIBUNAL.find((c) => c.id === id)?.nombre || id;
  };

  const getSubServicioNombre = (catId: string, subId: string) => {
    const cat = SERVICIOS_TRIBUNAL.find((c) => c.id === catId);
    return cat?.subServicios.find((s) => s.id === subId)?.nombre || subId;
  };

  const getSucursalNombre = (id: string) => {
    return SUCURSALES_TE.find((s) => s.id === id)?.nombre || id;
  };

  const decodeDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]}, ${parts[0]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Mis Citas Agendadas</h3>
          <p className="text-xs text-slate-500">
            Consulte, imprima o gestione los turnos programados ante el Tribunal Electoral.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToBooking}
          className="bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-2 px-5 rounded text-xs tracking-wider uppercase shadow-sm transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 font-bold" />
          <span>Solicitar Cita Nueva</span>
        </button>
      </div>

      {citas.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-50 border border-slate-200/75 rounded p-8 md:p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-8 h-8 stroke-1" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">No Registra Citas en este Dispositivo</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Actualmente no tiene citas agendadas guardadas en la memoria local de su navegador. ¿Desea iniciar un trámite nuevo?
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToBooking}
            className="inline-flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-2.5 px-6 rounded text-xs uppercase tracking-wider shadow-sm transition duration-150 cursor-pointer"
          >
            Comenzar Solicitud de Cita
          </button>
        </div>
      ) : (
        /* Dashboard view with listing */
        <div className="space-y-4">
          
          {/* Filters & search bars */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por código de cita o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 font-medium"
              />
            </div>
            
            <div className="flex flex-wrap bg-slate-100 p-1 rounded border border-slate-200 self-start sm:self-auto gap-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter('todos')}
                className={`px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded transition duration-150 cursor-pointer ${
                  statusFilter === 'todos' ? 'bg-white shadow-sm text-blue-900 border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('confirmada')}
                className={`px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded transition duration-150 cursor-pointer ${
                  statusFilter === 'confirmada' ? 'bg-white shadow-sm text-emerald-800 border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Reservadas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('asistire')}
                className={`px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded transition duration-150 cursor-pointer ${
                  statusFilter === 'asistire' ? 'bg-white shadow-sm text-blue-800 border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Asistiré (Confirmado)
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('cancelada')}
                className={`px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded transition duration-150 cursor-pointer ${
                  statusFilter === 'cancelada' ? 'bg-white shadow-sm text-red-805 border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Canceladas
              </button>
            </div>
          </div>

          {/* Table or Cards List */}
          {filteredCitas.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded p-6 text-center text-slate-500 text-xs font-medium">
              <AlertCircle className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              Ninguna cita coincide con los términos de búsqueda o filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCitas.map((cita) => {
                const isCanceled = cita.estado === 'cancelada';
                return (
                  <div
                    key={cita.id}
                    className={`bg-white border rounded overflow-hidden shadow-sm hover:shadow transition duration-150 flex flex-col justify-between ${
                      isCanceled ? 'border-red-200 bg-red-50/10' : 'border-slate-200'
                    }`}
                  >
                    
                    {/* Card Header information */}
                    <div className="p-4 space-y-3">
                      
                      {/* Top status indicator & code */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-extrabold text-blue-800 bg-slate-100 p-1 px-2 rounded border border-slate-200">
                          {cita.codigoTransaccion}
                        </span>
                        
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded select-none border ${
                            cita.estado === 'cancelada' || cita.estado === 'no_asistire'
                              ? 'bg-red-50 text-red-755 border-red-200'
                              : cita.estado === 'asistire'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {cita.estado === 'cancelada' 
                            ? 'Cancelada' 
                            : cita.estado === 'asistire' 
                              ? 'Asistiré (Confirmada)' 
                              : cita.estado === 'no_asistire' 
                                ? 'No Asistirá' 
                                : 'Confirmada'}
                        </span>
                      </div>

                      {/* Service name & Citizen profile info */}
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">
                          {getCategorioNombre(cita.servicioCategoria)}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-800 mt-0.5 leading-snug uppercase tracking-tight">
                          {getSubServicioNombre(cita.servicioCategoria, cita.subServicioId)}
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-1.5 font-medium">
                          Identificación: <strong className="font-bold text-slate-800">{cita.datosPersonales.identificacion}</strong>
                        </p>
                        {cita.datosPersonales.numeroSeguimiento && (
                          <p className="text-[11px] text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded inline-block mt-1 font-mono uppercase tracking-wider text-[9px] border border-blue-100">
                            Seguimiento: {cita.datosPersonales.numeroSeguimiento}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {cita.datosPersonales.correo}
                        </p>
                      </div>

                      {/* Date & Location schedule */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-dashed border-slate-100 pt-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-semibold text-slate-800">{decodeDate(cita.fecha)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-semibold text-slate-800">{cita.hora}</span>
                        </div>
                        <div className="flex items-start gap-1 col-span-2 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-1 font-semibold text-slate-800">{getSucursalNombre(cita.sucursalId)}</span>
                        </div>
                      </div>

                    </div>

                    {/* Actions bar bottom */}
                    <div className="bg-slate-50 border-t border-slate-100 p-3.5 space-y-3">
                      <button
                        type="button"
                        onClick={() => onSelectCita(cita)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-800 hover:bg-blue-100 active:bg-blue-200 border border-blue-200/50 rounded-lg text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-750" />
                        <span>Ver Comprobante</span>
                      </button>

                      {/* Right actions or inline confirmations */}
                      <div className="pt-2 border-t border-slate-150 flex items-center justify-between gap-3 text-xs w-full select-none">
                        
                        {confirmingCancelId === cita.id ? (
                          <div className="w-full bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center justify-between gap-2 animate-fadeIn text-[11px] font-semibold text-amber-950">
                            <span>¿Cancelar turno?</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onCancelCita(cita.id);
                                  setConfirmingCancelId(null);
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] uppercase font-black rounded transition cursor-pointer"
                              >
                                Sí, Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingCancelId(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 text-[10px] uppercase font-black rounded transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        ) : confirmingDeleteId === cita.id ? (
                          <div className="w-full bg-red-50 border border-red-200 p-2 rounded-lg flex items-center justify-between gap-4 animate-fadeIn text-[11px] font-semibold text-red-950">
                            <span>¿Eliminar de su historial?</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteCita(cita.id);
                                  setConfirmingDeleteId(null);
                                }}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase font-black rounded transition cursor-pointer"
                              >
                                Sí, Borrar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingDeleteId(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 text-[10px] uppercase font-black rounded transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 text-xs w-full select-none">
                            {!isCanceled ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmingCancelId(cita.id);
                                  setConfirmingDeleteId(null);
                                }}
                                className="font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition animate-fadeIn"
                              >
                                <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Cancelar Turno</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-red-600 font-extrabold uppercase tracking-wider flex items-center gap-1 animate-fadeIn">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                Cancelada / Liberada
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingDeleteId(cita.id);
                                setConfirmingCancelId(null);
                              }}
                              className="font-bold text-red-650 hover:text-red-800 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition animate-fadeIn"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                        
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
