import React, { useState, useMemo } from 'react';
import { Sucursal } from '../types';
import { SUCURSALES_TE, HORAS_DISPONIBLES } from '../data';
import { ArrowLeft, ArrowRight, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';

interface AgendamientoCitaProps {
  selectedSucursalId: string | null;
  selectedFecha: string | null;
  selectedHora: string | null;
  onBack: () => void;
  onSubmit: (sucursalId: string, fecha: string, hora: string) => void;
  selectedCategoria?: string | null;
  selectedSubServicioId?: string | null;
}

function timeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes: number): string {
  const norm = totalMinutes % 1440;
  let hours24 = Math.floor(norm / 60);
  const minutes = norm % 65; // supports modulo correctly for minutes
  const trueMin = norm % 60;
  
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  
  const hh = String(hours12).padStart(2, '0');
  const mm = String(trueMin).padStart(2, '0');
  return `${hh}:${mm} ${ampm}`;
}

function generateExtranjeriaSlots(inicio: string, fin: string, intervaloMinutos: number): string[] {
  const startMin = timeToMinutes(inicio);
  let endMin = timeToMinutes(fin);
  
  if (endMin <= startMin) {
    endMin += 1440; // wrap around midnight
  }
  
  const slots: string[] = [];
  for (let min = startMin; min <= endMin; min += intervaloMinutos) {
    slots.push(formatMinutes(min));
  }
  return slots;
}

export default function AgendamientoCita({
  selectedSucursalId,
  selectedFecha,
  selectedHora,
  onBack,
  onSubmit,
  selectedCategoria,
  selectedSubServicioId,
}: AgendamientoCitaProps) {
  const isExtranjeria = useMemo(() => {
    return selectedCategoria === 'extranjeria' || 
      (selectedSubServicioId && (selectedSubServicioId.includes('extranjero') || selectedSubServicioId.startsWith('ext_')));
  }, [selectedCategoria, selectedSubServicioId]);

  // Load custom settings from localStorage or fallback to standard properties
  const [extranjeriaConfig, setExtranjeriaConfig] = useState(() => {
    const start = localStorage.getItem('extranjeria_hora_inicio') || '07:00 AM';
    const end = localStorage.getItem('extranjeria_hora_fin') || '02:00 AM';
    const interval = parseInt(localStorage.getItem('extranjeria_intervalo_minutos') || '15', 10);
    const capacity = parseInt(localStorage.getItem('extranjeria_capacidad_usuarios') || '2', 10);
    return { start, end, interval, capacity };
  });

  // Query server to keep setup perfectly in-sync
  React.useEffect(() => {
    if (isExtranjeria) {
      fetch('/api/extranjeria/config')
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.config) {
            const { capacidad, intervalo, horaInicio, horaFin } = data.config;
            setExtranjeriaConfig({
              start: horaInicio,
              end: horaFin,
              interval: intervalo,
              capacity: capacidad
            });
            // Also keep localstorage synced
            localStorage.setItem('extranjeria_capacidad_usuarios', String(capacidad));
            localStorage.setItem('extranjeria_intervalo_minutos', String(intervalo));
            localStorage.setItem('extranjeria_hora_inicio', horaInicio);
            localStorage.setItem('extranjeria_hora_fin', horaFin);
          }
        })
        .catch(err => console.warn("Failed to retrieve extranjeria remote configs:", err));
    }
  }, [isExtranjeria]);

  const availableSlots = useMemo(() => {
    if (isExtranjeria) {
      return generateExtranjeriaSlots(
        extranjeriaConfig.start,
        extranjeriaConfig.end,
        extranjeriaConfig.interval
      );
    }
    return HORAS_DISPONIBLES;
  }, [isExtranjeria, extranjeriaConfig]);

  // Load active bookings in order to enforce dynamic capacity constraints
  const activeBookings = useMemo(() => {
    try {
      const stored = localStorage.getItem('te_panama_citas');
      if (stored) {
        return JSON.parse(stored) as any[];
      }
    } catch (e) {
      console.error("Could not load te_panama_citas in AgendamientoCita", e);
    }
    return [];
  }, []);

  const [selectedProvincia, setSelectedProvincia] = useState<string>(isExtranjeria ? 'Panamá' : 'Todos');
  const [sucursalId, setSucursalId] = useState<string>(isExtranjeria ? 'anc_main' : (selectedSucursalId || ''));
  const [fecha, setFecha] = useState<string>(selectedFecha || '');
  const [hora, setHora] = useState<string>(selectedHora || '');

  // Automatically switch to Ancón and Panamá province when component is loaded or switching to Extranjería
  React.useEffect(() => {
    if (isExtranjeria) {
      setSucursalId('anc_main');
      setSelectedProvincia('Panamá');
    }
  }, [isExtranjeria]);

  // Extract unique provinces
  const provincias = useMemo(() => {
    if (isExtranjeria) {
      return ['Panamá'];
    }
    const list = SUCURSALES_TE.map((s) => s.provincia);
    return ['Todos', ...Array.from(new Set(list))];
  }, [isExtranjeria]);

  // Filter sucursales based on selected province
  const filteredSucursales = useMemo(() => {
    if (isExtranjeria) {
      return SUCURSALES_TE.filter((s) => s.id === 'anc_main');
    }
    if (selectedProvincia === 'Todos') {
      return SUCURSALES_TE;
    }
    return SUCURSALES_TE.filter((s) => s.provincia === selectedProvincia);
  }, [selectedProvincia, isExtranjeria]);

  const selectedSucursal = useMemo(() => {
    return SUCURSALES_TE.find((s) => s.id === sucursalId);
  }, [sucursalId]);

  // Determine valid days based on the selected sucursal's operational days
  const nextAvailableDates = useMemo(() => {
    if (!selectedSucursal) return [];

    const dates: { dateString: string; displayString: string; dayName: string }[] = [];
    const today = new Date();
    
    // Check if the sucursal works Tuesday to Saturday
    const isTuesdayToSaturday = selectedSucursal.horario.toLowerCase().includes('martes a sábado');
    
    let daysAdded = 0;
    let daysChecked = 0;

    // Look ahead 25 days to find 10 valid working days
    while (daysAdded < 10 && daysChecked < 25) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + daysChecked);
      
      const dayOfWeek = targetDate.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
      
      let isValidDay = false;
      if (isTuesdayToSaturday) {
        // Tuesday (2) to Saturday (6)
        if (dayOfWeek >= 2 && dayOfWeek <= 6) {
          isValidDay = true;
        }
      } else {
        // Monday (1) to Friday (5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          isValidDay = true;
        }
      }

      // Avoid booking for today if it is past 3 PM already
      const isToday = daysChecked === 0;
      if (isToday) {
        const currentHour = today.getHours();
        if (currentHour >= 15) {
          isValidDay = false;
        }
      }

      if (isValidDay) {
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;
        
        // Format display text in Spanish
        const dayNames = ['Domingo', 'Lunes', 'Martas', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        // Fix Tuesday accent display typo
        const correctedDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const monthNames = [
          'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
          'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];
        
        const dayName = correctedDayNames[dayOfWeek];
        const displayString = `${dayName}, ${targetDate.getDate()} de ${monthNames[targetDate.getMonth()]}`;

        dates.push({
          dateString,
          displayString,
          dayName
        });
        daysAdded++;
      }
      daysChecked++;
    }

    return dates;
  }, [selectedSucursal]);

  // Reset date and time if sucursal changes and the old date is no longer in the valid dates list
  React.useEffect(() => {
    if (selectedSucursal) {
      const isValid = nextAvailableDates.some((d) => d.dateString === fecha);
      if (!isValid) {
        setFecha('');
        setHora('');
      }
    } else {
      setFecha('');
      setHora('');
    }
  }, [sucursalId, nextAvailableDates, selectedSucursal]);

  const handleBookingSubmit = () => {
    if (sucursalId && fecha && hora) {
      onSubmit(sucursalId, fecha, hora);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer border border-slate-200"
          title="Regresar a selección de trámite"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Oficina, Fecha y Horario</h3>
          <p className="text-xs text-slate-500 font-medium">
            Seleccione la sucursal regional del Tribunal Electoral y asigne el día y la hora más convenientes para usted.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Choose office (sucursal) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Seleccione la Sede <span className="text-red-500">*</span>
            </label>
            
            <select
              value={selectedProvincia}
              aria-label="Filtrar por provincia"
              onChange={(e) => setSelectedProvincia(e.target.value)}
              className="bg-white border border-slate-300 rounded py-1 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-700 cursor-pointer font-semibold"
              disabled={isExtranjeria}
            >
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p === 'Todos' ? 'Todas las Provincias' : p}
                </option>
              ))}
            </select>
          </div>

          {isExtranjeria && (
            <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3 rounded text-xs font-semibold flex flex-col gap-1.5 leading-relaxed shadow-sm">
              <span className="text-amber-800 font-extrabold uppercase tracking-wide flex items-center gap-1">
                ⚠️ Trámite Exclusivo de Extranjería
              </span>
              <span>
                Por regulación institucional del Tribunal Electoral de Panamá, toda la atención presencial para trámites migratorios o de extranjería (PE) se gestiona de manera centralizada <strong>exclusivamente en la Sede Principal de Ancón</strong> (Tribunal Electoral de Panamá).
              </span>
            </div>
          )}

          {/* List of branch offices */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 border border-slate-200 rounded p-2 bg-slate-50">
            {filteredSucursales.map((suc) => {
              const isSelected = sucursalId === suc.id;
              return (
                <button
                  key={suc.id}
                  type="button"
                  onClick={() => setSucursalId(suc.id)}
                  className={`w-full text-left p-3 rounded border transition-all cursor-pointer flex items-start gap-2.5 bg-white ${
                    isSelected
                      ? 'border-blue-700 bg-blue-50/20 shadow-sm ring-1 ring-blue-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-blue-700' : 'text-slate-400'}`} />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-slate-800 leading-tight">{suc.nombre}</h5>
                    <p className="text-[11px] text-slate-500 leading-tight font-medium">{suc.direccion}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 leading-none font-bold">
                        {suc.horario}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Choose Date and Time Slot */}
        <div className="lg:col-span-7 space-y-5">
          {selectedSucursal ? (
            <div className="space-y-5">
              
              {/* DATE PICKING */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>2. Seleccione el Día Mandatorio</span>
                  <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 font-medium">Días laborables disponibles en base al calendario de la sede:</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {nextAvailableDates.map((item) => {
                    const isSelected = fecha === item.dateString;
                    return (
                      <button
                        key={item.dateString}
                        type="button"
                        onClick={() => {
                          setFecha(item.dateString);
                          setHora(''); // Reset time when date changes
                        }}
                        className={`p-2.5 rounded border-2 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'border-blue-700 bg-blue-50/25 text-slate-900 font-extrabold'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                          {item.dayName}
                        </span>
                        <span className="text-sm font-bold mt-0.5">
                          {item.dateString.split('-')[2]}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.displayString.split(' de ')[1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TIME PICKING */}
              {fecha ? (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>3. Seleccione el Intervalo de Hora</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 font-medium">
                    {isExtranjeria 
                      ? `Espacios de atención de ${extranjeriaConfig.interval} minutos disponibles (Capacidad: ${extranjeriaConfig.capacity} usuarios por intervalo):`
                      : 'Espacios de atención de 30 minutos disponibles:'
                    }
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = hora === slot;
                      
                      // Count current bookings in this slot to apply slot limitations
                      const bookedCount = activeBookings.filter(c => 
                        c.fecha === fecha && 
                        c.hora === slot && 
                        (c.servicioCategoria === 'extranjeria' || c.subServicioId?.includes('extranjero') || c.subServicioId?.startsWith('ext_')) &&
                        c.estado !== 'cancelada'
                      ).length;
                      
                      const isFull = isExtranjeria && bookedCount >= extranjeriaConfig.capacity;
                      
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isFull && !isSelected}
                          onClick={() => setHora(slot)}
                          className={`p-2.5 rounded border text-center text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'border-blue-700 bg-blue-700 text-white shadow-sm shadow-blue-100'
                              : isFull
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="tracking-tight text-[11px] font-bold">{slot}</span>
                          {isExtranjeria && (
                            <span className={`text-[9px] tracking-tight block ${
                              isSelected 
                                ? 'text-blue-200 font-medium' 
                                : isFull 
                                  ? 'text-red-500 font-bold' 
                                  : 'text-slate-400 font-normal'
                            }`}>
                              {isFull 
                                ? '⛔ Lleno' 
                                : `${bookedCount}/${extranjeriaConfig.capacity} ocupados`
                              }
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded p-6 text-center text-slate-400 mt-2 text-xs font-medium">
                  Por favor, elija un día del calendario para habilitar los intervalos de atención presencial.
                </div>
              )}

              {/* Show Selection Summary */}
              {fecha && hora && (
                <div className="bg-blue-50/50 border border-blue-100 rounded p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded bg-blue-700 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider">Turno Seleccionado</h5>
                    <p className="text-xs text-slate-700 font-medium leading-normal">
                      Asistencia en <strong className="text-slate-900">{selectedSucursal.nombre}</strong> el día{' '}
                      <strong className="text-slate-900">
                        {nextAvailableDates.find((d) => d.dateString === fecha)?.displayString}
                      </strong>{' '}
                      a las <strong className="text-slate-900">{hora}</strong>.
                    </p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full min-h-[220px] bg-slate-50 border border-slate-200 rounded flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <MapPin className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">Seleccione primero una sucursal del listado izquierdo</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs font-medium">
                Esto habilita las fechas operativas del calendario en base a los días válidos del Tribunal Electoral de Panamá.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto h-12 px-6 rounded border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-50 transition cursor-pointer text-center flex items-center justify-center"
        >
          Regresar a trámites
        </button>

        <button
          type="button"
          onClick={handleBookingSubmit}
          disabled={!sucursalId || !fecha || !hora}
          className={`w-full sm:w-auto h-12 font-bold px-8 rounded shadow-lg uppercase tracking-wider text-xs transition duration-150 flex items-center justify-center gap-2 ${
            sucursalId && fecha && hora
              ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer shadow-blue-100'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Agendar Cita Oficial</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
