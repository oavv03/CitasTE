import React, { useState, useEffect, useMemo } from 'react';
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
  TrendingUp,
  Users,
  CheckSquare,
  FileText,
  ExternalLink,
  Play,
  Power,
  UserCheck,
  CreditCard,
  Building2,
  Download,
  Send,
  Boxes,
  HelpCircle,
  FileSpreadsheet,
  Inbox
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AdminRole } from '../types';

const SELECT_TIMES_OPTIONS = [
  '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM', '03:00 AM', '03:30 AM',
  '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

// Extranjeria Mandatory Documents Checklists
const REQUISITOS_EXTRANJERIA = [
  { id: 'pasaporte', name: 'Pasaporte Vigente con Sello de Entrada Reciente' },
  { id: 'resolucion', name: 'Resolución SNM (Servicio Nacional de Migración) Aprobada' },
  { id: 'carnet', name: 'Original y Copia del Carné de Trámite Temporal' },
  { id: 'formulario', name: 'Formulario Oficial de Solicitud de Cédula de Extranjero' }
];

interface ExtranjeriaControllerProps {
  currentRole: AdminRole;
}

// Extranjeria specific sub-profiles within Extranjeria view
type ExtranjeriaSubRole = 'supervisor' | 'atencion' | 'cubiculo';

interface Booth {
  id: number;
  name: string;
  active: boolean; // Enables cubicle attention
  staff: string;
  empty: boolean; // True for the 4 reserve booths initially empty
}

interface AppointmentMetadata {
  hasDocuments: boolean;
  checkedDocs: string[];
  passedToSupervisor: boolean;
  assignedCubiculo: number | null; // Booth ID from 1 to 8
  estadoTicket: 'ninguno' | 'en_proceso' | 'pagado_en_caja' | 'realizada';
  timestampCompletado?: string;
  staffResponsable?: string;
}

export default function ExtranjeriaController({ currentRole }: ExtranjeriaControllerProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  // Profile Simulator selection
  const [subRole, setSubRole] = useState<ExtranjeriaSubRole>(() => {
    return (localStorage.getItem('extranjeria_sub_role') as ExtranjeriaSubRole) || 'supervisor';
  });

  // Synchronize subRole dynamically if a specific Extranjería user logs in
  React.useEffect(() => {
    if (currentRole === 'extranjeria_supervisor') {
      setSubRole('supervisor');
    } else if (currentRole === 'extranjeria_atencion') {
      setSubRole('atencion');
    } else if (currentRole === 'extranjeria_cubiculo') {
      setSubRole('cubiculo');
    }
  }, [currentRole]);

  // Selected Cubicle in the "Cubículo" view
  const [selectedCubiculo, setSelectedCubiculo] = useState<number>(() => {
    return parseInt(localStorage.getItem('extranjeria_selected_cubiculo') || '1', 10);
  });

  // Selected appointment for details check-in
  const [selectedAppForCheck, setSelectedAppForCheck] = useState<any | null>(null);

  // Document checklist in the "Atención" verification
  const [tempCheckedDocs, setTempCheckedDocs] = useState<string[]>([]);

  // Capacity / Schedule setups
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

  // Booth / Cubiculos state (4 enabled with staff, 4 reserve empty)
  const [booths, setBooths] = useState<Booth[]>(() => {
    const raw = localStorage.getItem('extranjeria_booths');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      { id: 1, name: "Cubículo 1", active: true, staff: "Lic. Ana Pérez", empty: false },
      { id: 2, name: "Cubículo 2", active: true, staff: "Lic. Carlos Gómez", empty: false },
      { id: 3, name: "Cubículo 3", active: true, staff: "Lic. María Rodríguez", empty: false },
      { id: 4, name: "Cubículo 4", active: true, staff: "Lic. Juan Martínez", empty: false },
      { id: 5, name: "Cubículo 5", active: false, staff: "Turno de Reserva", empty: true },
      { id: 6, name: "Cubículo 6", active: false, staff: "Turno de Reserva", empty: true },
      { id: 7, name: "Cubículo 7", active: false, staff: "Turno de Reserva", empty: true },
      { id: 8, name: "Cubículo 8", active: false, staff: "Turno de Reserva", empty: true }
    ];
  });

  // Extranjería custom metadata tracking (document checks, supervisor forwarding, booth assignments, ticketing)
  const [appMetadata, setAppMetadata] = useState<Record<string, AppointmentMetadata>>(() => {
    const raw = localStorage.getItem('extranjeria_appointment_metadata');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  // Keep localStorage up-to-date
  useEffect(() => {
    localStorage.setItem('extranjeria_sub_role', subRole);
  }, [subRole]);

  useEffect(() => {
    localStorage.setItem('extranjeria_selected_cubiculo', String(selectedCubiculo));
  }, [selectedCubiculo]);

  useEffect(() => {
    localStorage.setItem('extranjeria_booths', JSON.stringify(booths));
  }, [booths]);

  useEffect(() => {
    localStorage.setItem('extranjeria_appointment_metadata', JSON.stringify(appMetadata));
  }, [appMetadata]);

  // Helper helper to fetch appointments from server and filter extranjería
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.appointments)) {
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

    // Load schedule config from server
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

  const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(prev => prev.text === text ? { text: '', type: null } : prev);
    }, 5000);
  };

  // Save timing config handler
  const promptSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'super') {
      showStatus('Operación denegada. Solo el Super Administrador puede configurar la capacidad y horarios.', 'error');
      return;
    }
    setShowConfirmSave(true);
  };

  const executeSaveConfig = async () => {
    setShowConfirmSave(false);
    localStorage.setItem('extranjeria_capacidad_usuarios', String(capacidad));
    localStorage.setItem('extranjeria_intervalo_minutos', String(intervalo));
    localStorage.setItem('extranjeria_hora_inicio', horaInicio);
    localStorage.setItem('extranjeria_hora_fin', horaFin);
    
    try {
      const res = await fetch('/api/extranjeria/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capacidad, intervalo, horaInicio, horaFin })
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

  // Activate/deactivate a reserve booth (casillero de atención)
  const toggleBoothActive = (boothId: number) => {
    setBooths(prev => prev.map(b => {
      if (b.id === boothId) {
        const nextActive = !b.active;
        let staffName = b.staff;
        if (nextActive && b.empty) {
          staffName = `Lic. Auxiliar (Casillero ${b.id})`;
        } else if (!nextActive && b.empty) {
          staffName = "Turno de Reserva";
        }
        return { ...b, active: nextActive, staff: staffName };
      }
      return b;
    }));
    showStatus(`Casillero ${boothId} actualizado con éxito.`, 'success');
  };

  // Get active booths count
  const activeBoothsCount = useMemo(() => {
    return booths.filter(b => b.active).length;
  }, [booths]);

  // Handle checking of single document
  const handleToggleDocCheck = (docId: string) => {
    setTempCheckedDocs(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Submit verified documents and forward to supervisor
  const handleSubmitVerification = (appId: string) => {
    const meta = appMetadata[appId] || {
      hasDocuments: false,
      checkedDocs: [],
      passedToSupervisor: false,
      assignedCubiculo: null,
      estadoTicket: 'ninguno'
    };

    const hasAll = tempCheckedDocs.length === REQUISITOS_EXTRANJERIA.length;

    setAppMetadata(prev => ({
      ...prev,
      [appId]: {
        ...meta,
        hasDocuments: hasAll,
        checkedDocs: tempCheckedDocs,
        passedToSupervisor: true
      }
    }));

    showStatus(`Expediente de cita ${appId} verificado y enviado al Supervisor para asignación de cubículo.`, 'success');
    setSelectedAppForCheck(null);
  };

  // Assign appointment to cubicle (by supervisor)
  const handleAssignToCubiculo = (appId: string, cubiculoId: number) => {
    const meta = appMetadata[appId] || {
      hasDocuments: true,
      checkedDocs: REQUISITOS_EXTRANJERIA.map(r => r.id),
      passedToSupervisor: true,
      assignedCubiculo: null,
      estadoTicket: 'ninguno'
    };

    setAppMetadata(prev => ({
      ...prev,
      [appId]: {
        ...meta,
        assignedCubiculo: cubiculoId,
        estadoTicket: 'en_proceso'
      }
    }));

    const boothName = booths.find(b => b.id === cubiculoId)?.name || `Cubículo ${cubiculoId}`;
    showStatus(`Cita asignada exitosamente al ${boothName}. El operador a cargo ya puede atender al ciudadano.`, 'success');
  };

  // Trigger Ticket Call and Send to Cashier (Caja) for Payment
  const handleSendToCaja = (appId: string) => {
    const meta = appMetadata[appId];
    if (!meta) return;

    setAppMetadata(prev => ({
      ...prev,
      [appId]: {
        ...meta,
        estadoTicket: 'pagado_en_caja'
      }
    }));

    showStatus(`Llamada de ticket generada. Ciudadano enviado a la Caja de Pago (https://sistema-de-ticket.vercel.app/).`, 'info');
  };

  // Complete Payment/Appointment and save to Completed (Realizadas) Report
  const handleCompleteAppointment = (appId: string) => {
    const meta = appMetadata[appId];
    if (!meta) return;

    const rightNow = new Date();
    const timestampFormatted = `${rightNow.toLocaleDateString('es-ES')} ${rightNow.toLocaleTimeString('es-ES')}`;

    setAppMetadata(prev => ({
      ...prev,
      [appId]: {
        ...meta,
        estadoTicket: 'realizada',
        timestampCompletado: timestampFormatted,
        staffResponsable: booths.find(b => b.id === meta.assignedCubiculo)?.staff || 'Atención Extranjería'
      }
    }));

    showStatus(`Trámite finalizado con éxito para la cita ${appId}. Registro guardado para auditoría en el reporte diario.`, 'success');
  };

  // Filter appointments for the general table filter (matches query and filters)
  const filteredGeneralAppointments = useMemo(() => {
    return appointments.filter((app: any) => {
      // Search
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || (
        (app.datosPersonales?.nombreCompleto || app.nombre || '').toLowerCase().includes(query) ||
        (app.datosPersonales?.primerNombre || '').toLowerCase().includes(query) ||
        (app.datosPersonales?.pasaporte || app.identificacion || '').toLowerCase().includes(query) ||
        (app.correo || app.datosPersonales?.correo || '').toLowerCase().includes(query) ||
        (app.codigoTransaccion || '').toLowerCase().includes(query) ||
        (app.id || '').toLowerCase().includes(query)
      );

      // Status
      const matchesStatus = statusFilter === 'todos' || app.estado === statusFilter;

      // Date
      const matchesDate = !dateFilter || app.fecha === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, searchQuery, statusFilter, dateFilter]);

  // Appointments grouped by dynamic workflow queues:
  // 1. Atención View queue: Extranjería appointments that are NOT yet passed to supervisor
  const queueAtencionIn = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id];
      return !meta || !meta.passedToSupervisor;
    });
  }, [appointments, appMetadata]);

  // 2. Atención View processed history (already sent to supervisor)
  const queueAtencionOut = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id];
      return meta && meta.passedToSupervisor;
    });
  }, [appointments, appMetadata]);

  // 3. Supervisor Queue: passed from atencion but NOT yet assigned a cubicle
  const queueSupervisorPending = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id];
      return meta && meta.passedToSupervisor && meta.assignedCubiculo === null;
    });
  }, [appointments, appMetadata]);

  // 4. Cubículo View: appointments assigned to the currently selected cubicle
  const queueCubiculoAssigned = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id];
      return meta && meta.assignedCubiculo === selectedCubiculo && meta.estadoTicket !== 'realizada';
    });
  }, [appointments, appMetadata, selectedCubiculo]);

  // 5. Supervisor Analytics / Reports: appointments marked as 'realizada'
  const filterRealizadasByPeriod = (periodToCheck: 'dia' | 'semana' | 'mes' | 'año') => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id];
      if (!meta || meta.estadoTicket !== 'realizada') return false;

      try {
        const now = new Date();
        const refDate = new Date(app.fecha + 'T00:00:00');

        if (periodToCheck === 'dia') {
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          return app.fecha === `${year}-${month}-${day}`;
        }

        if (periodToCheck === 'semana') {
          const currentDay = now.getDay();
          const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
          const monday = new Date(now);
          monday.setDate(now.getDate() - distanceToMonday);
          monday.setHours(0, 0, 0, 0);

          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);

          return refDate >= monday && refDate <= sunday;
        }

        if (periodToCheck === 'mes') {
          return refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear();
        }

        if (periodToCheck === 'año') {
          return refDate.getFullYear() === now.getFullYear();
        }
      } catch (e) {
        return false;
      }
      return false;
    });
  };

  // Download performed (realized) appointments report - CSV Format
  const handleDownloadRealizadasCSV = (period: 'dia' | 'semana' | 'mes' | 'año') => {
    const list = filterRealizadasByPeriod(period);
    if (list.length === 0) {
      alert('No se encontraron citas completadas (realizadas) en el periodo seleccionado para generar el reporte.');
      return;
    }

    const headers = ['ID de Cita', 'Ciudadano', 'Pasaporte/ID', 'Fecha Cita', 'Hora', 'Operador Responsable', 'Cubículo', 'Hora Completado'];
    const rows = list.map(app => {
      const meta = appMetadata[app.id];
      const name = app.datosPersonales?.nombreCompleto || app.nombre || 'N/D';
      const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
      const cubiculoName = booths.find(b => b.id === meta?.assignedCubiculo)?.name || `Cubículo ${meta?.assignedCubiculo}`;
      return [
        app.id,
        name,
        passport,
        app.fecha,
        app.hora,
        meta?.staffResponsable || 'N/D',
        cubiculoName,
        meta?.timestampCompletado || 'N/D'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Extranjeria_Completadas_${period.toUpperCase()}_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download performed (realized) appointments report - PDF Format using jsPDF helper
  const handleDownloadRealizadasPDF = (period: 'dia' | 'semana' | 'mes' | 'año') => {
    const list = filterRealizadasByPeriod(period);
    if (list.length === 0) {
      alert('No se encontraron citas completadas (realizadas) en el periodo seleccionado para generar el reporte PDF.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [217, 119, 6];  // Amber 600

    let currentY = 15;

    const drawHeader = () => {
      // Top accent bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, currentY, 190, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TRIBUNAL ELECTORAL DE PANAMÁ', 15, currentY + 6.5);

      // Report Header Section
      currentY += 16;
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('AUDITORÍA DE GESTIÓN: TRÁMITES DE EXTRANJERÍA COMPLETADOS', 10, currentY);

      currentY += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Control Operativo de Supervisor de Extranjería - Toma de Fotografía y Biometría', 10, currentY);

      currentY += 5;
      const periodLabel = period === 'dia' ? 'HOY (DIARIO)' : period === 'semana' ? 'ESTA SEMANA' : period === 'mes' ? 'ESTE MES' : 'ESTE AÑO';
      doc.text(`Período analizado: ${periodLabel}  |  Fecha de emisión: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 10, currentY);

      currentY += 4;
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.8);
      doc.line(10, currentY, 200, currentY);
      currentY += 8;
    };

    drawHeader();

    // Summary Statistics box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.rect(10, currentY, 190, 20, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RESUMEN ESTADÍSTICO DE OPERACIÓN', 15, currentY + 5.5);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`• Total de Trámites Completados con Pago Realizado: ${list.length} ciudadanos atendidos`, 15, currentY + 11);
    doc.text(`• Capacidad Máxima del Periodo: Regulada por intervalores de ${intervalo} min con promedio de ${capacidad} slots`, 15, currentY + 15);
    doc.text(`• Casilleros Activos totales: ${activeBoothsCount} puestos`, 110, currentY + 11);
    doc.text(`• Reporte Oficial Generado por el Supervisor de Extranjería`, 110, currentY + 15);
    
    currentY += 26;

    // Table Headers
    const drawTableHead = (y: number) => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, y, 190, 7, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      
      doc.text('ID CITA', 12, y + 4.8);
      doc.text('CIUDADANO EXTRANJERO', 40, y + 4.8);
      doc.text('PASAPORTE', 90, y + 4.8);
      doc.text('CUBÍCULO', 115, y + 4.8);
      doc.text('OPERADOR EN ENTRADA', 142, y + 4.8);
      doc.text('COMPLETADO EL', 170, y + 4.8);
    };

    drawTableHead(currentY);
    currentY += 7;

    // Render Completed Appointments
    list.forEach((app, index) => {
      const meta = appMetadata[app.id];
      if (currentY > 270) {
        doc.addPage();
        currentY = 15;
        drawHeader();
        drawTableHead(currentY);
        currentY += 7;
      }

      // Zebra rows striped
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, currentY, 190, 8, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);

      const name = app.datosPersonales?.nombreCompleto || app.nombre || 'N/D';
      const nameShort = name.length > 28 ? name.slice(0, 26) + '...' : name;
      const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
      const cubiculoName = booths.find(b => b.id === meta?.assignedCubiculo)?.name || `Cubículo ${meta?.assignedCubiculo}`;
      const staffName = meta?.staffResponsable || 'Oficial General';
      const staffShort = staffName.length > 18 ? staffName.slice(0, 16) + '...' : staffName;
      const tCompleted = meta?.timestampCompletado || 'N/D';

      doc.text(app.id, 12, currentY + 5);
      doc.text(nameShort.toUpperCase(), 40, currentY + 5);
      doc.text(passport, 90, currentY + 5);
      doc.text(cubiculoName, 115, currentY + 5);
      doc.text(staffShort, 142, currentY + 5);
      doc.setFont('Helvetica', 'bold');
      doc.text(tCompleted, 170, currentY + 5);
      doc.setFont('Helvetica', 'normal');

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.1);
      doc.line(10, currentY + 8, 200, currentY + 8);

      currentY += 8;
    });

    // Signature Area
    if (currentY > 230) {
      doc.addPage();
      currentY = 15;
      drawHeader();
    }

    currentY += 15;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(70, currentY, 140, currentY);
    
    currentY += 4;
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(' FIRMA DEL SUPERVISOR GENERAL DE EXTRANJERÍA', 72, currentY);
    currentY += 4;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Departamento de Cedulación y Naturalización - Sede Ancón', 73, currentY);

    doc.save(`reporte_extranjeria_atendidos_${period}.pdf`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div id="extranjeria-controller-root" className="space-y-6 text-slate-100 font-sans">
      
      {/* Dynamic Print Styles for PDF Export */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
            background: transparent !important;
          }
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
            padding: 1.25in !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}} />

      {/* Profile simulation switcher at the top */}
      {(currentRole === 'super' || currentRole === 'extranjeria') ? (
        <div className="bg-slate-900 border border-slate-850 p-1.5 rounded-xl flex flex-wrap gap-2 items-center justify-between shadow-xl">
          <div className="flex items-center gap-2.5 px-3 py-1.5">
            <Boxes className="w-5 h-5 text-amber-500" />
            <div className="text-left">
              <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">Simulador de Roles de Extranjería</span>
              <span className="text-xs font-bold text-slate-200">Haga clic abajo para intercambiar el perfil activo:</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => { setSubRole('supervisor'); setSelectedAppForCheck(null); }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subRole === 'supervisor'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Supervisor 👑</span>
            </button>

            <button
              type="button"
              onClick={() => { setSubRole('atencion'); setSelectedAppForCheck(null); }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subRole === 'atencion'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Atención (Entrada) 📋</span>
            </button>

            <button
              type="button"
              onClick={() => { setSubRole('cubiculo'); setSelectedAppForCheck(null); }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subRole === 'cubiculo'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Cubículo (Ticket) 🖥️</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-600/10 via-amber-700/10 to-amber-900/10 border border-amber-500/20 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg">
              {currentRole === 'extranjeria_supervisor' ? (
                <Users className="w-5 h-5 text-amber-400" />
              ) : currentRole === 'extranjeria_atencion' ? (
                <CheckSquare className="w-5 h-5 text-amber-400" />
              ) : (
                <Building2 className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black leading-none text-white uppercase tracking-wider select-none">
                {currentRole === 'extranjeria_supervisor' ? 'SALA DE SUPERVISIÓN DE EXTRANJERÍA (FIJO)' : currentRole === 'extranjeria_atencion' ? 'ESTACIÓN DE ATENCIÓN DE EXTRANJERÍA - ENTRADA (FIJO)' : 'MÓDULO DE ATENCIÓN EN CUBÍCULO - EMISIÓN DE TICKETS (FIJO)'}
              </p>
              <p className="text-xs text-slate-405 leading-normal max-w-xl mt-1 text-slate-400">
                Su usuario ha sido configurado con permisos estrictos de acceso. Toda la actividad de emisión, registros de firmas, habilitación de casilleros y descargas de reportes se asocia con su clave de estación de forma segura.
              </p>
            </div>
          </div>
          <div className="bg-amber-500/20 px-3 py-1.5 border border-amber-500/30 rounded-lg text-amber-400 font-mono text-[10px] uppercase font-bold tracking-wider select-none shrink-0 self-start md:self-auto">
            🔴 Estación Activa
          </div>
        </div>
      )}

      {/* Banner de Estado de Procedimientos */}
      {statusMessage.text && (
        <div className={`p-4 rounded-xl border text-xs font-bold leading-relaxed flex items-center gap-3 animate-fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800' 
            : statusMessage.type === 'error'
              ? 'bg-red-950/90 text-red-300 border-red-900'
              : 'bg-slate-900 text-slate-300 border-slate-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : statusMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 shrink-0 text-red-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-blue-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* CORE INTERFACES PER SUBROLE */}
      {/* ======================================================== */}
      
      {/* PROFILE 1: SUPERVISOR DE EXTRANJERÍA */}
      {subRole === 'supervisor' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Quick Header instructions for supervisor */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Consola General del Supervisor</span>
              <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                Como Supervisor tiene control total de los flujos de cita. Puede: <strong className="text-white">1) Activar/desactivar casilleros de atención</strong> (4 asignados + 4 de reserva), <strong className="text-white">2) Asignar citas</strong> pre-verificadas a los cubículos, <strong className="text-white">3) Descargar informes de auditoría</strong> de los trámites finalizados en distintos periodos (día, semana, mes, año), y <strong className="text-white">4) Modificar parámetros</strong> de slots.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Casilleros and Controls */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* CASILLEROS DE ATENCIÓN (CUBÍCULOS MANAGER) */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-500" />
                      <span>Casilleros de Atención</span>
                    </h4>
                    <p className="text-[9.5px] text-slate-450 font-bold uppercase">4 Operativos fijos  |  4 Puestos de reserva</p>
                  </div>
                  <span className="text-xs font-mono font-black px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-400">
                    {activeBoothsCount} Abiertos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  {booths.map(b => (
                    <div 
                      key={b.id} 
                      className={`p-3.5 rounded-lg border transition flex flex-col justify-between gap-3 ${
                        b.active 
                          ? 'bg-slate-900/90 border-emerald-500/40 shadow-inner' 
                          : 'bg-slate-950 border-slate-850 opacity-60'
                      }`}
                    >
                      <div className="space-y-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-slate-250 uppercase">{b.name}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${b.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                        </div>
                        <span className="text-[9.5px] font-bold text-slate-400 font-mono block">Personal: {b.staff}</span>
                        <div className="pt-1.5">
                          {b.empty ? (
                            <span className="text-[8px] bg-slate-900/50 text-slate-450 border border-slate-800 font-black uppercase px-2 py-0.5 rounded">
                              Reserva Vacía
                            </span>
                          ) : (
                            <span className="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-900 font-black uppercase px-2 py-0.5 rounded">
                              Fijo Habilitado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Enable/Disable dynamic switch button */}
                      <button
                        type="button"
                        onClick={() => toggleBoothActive(b.id)}
                        className={`w-full py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition ${
                          b.active 
                            ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800' 
                            : 'bg-amber-600/90 hover:bg-amber-700 text-white shadow-md'
                        }`}
                      >
                        {b.active ? 'Desactivar' : b.empty ? 'Activar Reserva' : 'Activar Casillero'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIMING CONFIGURATOR */}
              {currentRole === 'super' && (
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Control Horarios & Cupos</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    Modifique los cupos por slot y el intervalo hábil oficial para trámites migratorios.
                  </p>

                  <form onSubmit={promptSaveConfig} className="space-y-4 pt-1">
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Capacidad por Intervalo (Slots)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={capacidad}
                        onChange={(e) => setCapacidad(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-slate-900 border border-slate-750 text-white p-2.5 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-extrabold uppercase text-slate-440 block">Intervalo de Duración</label>
                      <select
                        value={intervalo}
                        onChange={(e) => setIntervalo(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-900 border border-slate-755 text-white p-2.5 rounded text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      >
                        <option value="10">10 minutos</option>
                        <option value="15">15 minutos</option>
                        <option value="20">20 minutos</option>
                        <option value="30">30 minutos</option>
                        <option value="60">60 minutos</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-extrabold uppercase text-slate-440 block">Apertura</label>
                        <select
                          value={horaInicio}
                          onChange={(e) => setHoraInicio(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-medium"
                        >
                          {SELECT_TIMES_OPTIONS.map(time => (
                            <option key={`start-${time}`} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-extrabold uppercase text-slate-440 block">Cierre</label>
                        <select
                          value={horaFin}
                          onChange={(e) => setHoraFin(e.target.value)}
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
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Aplicar Programación</span>
                    </button>
                  </form>
                </div>
              )}

            </div>

            {/* Right side: Waiting List for Assignments and Management Reports */}
            <div className="lg:col-span-7 space-y-6">

              {/* OUTSTANDING CITATIONS FOR CUBICLE ASSIGNMENT */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                  <div className="space-y-0.5 text-left">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      <span>Bandeja de Asignación por Supervisor</span>
                    </h4>
                    <p className="text-[9.5px] text-slate-450 font-bold uppercase">Citas verificadas por Atención en espera de cubículo habilitado</p>
                  </div>
                  <span className="text-xs font-mono font-black px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-400">
                    {queueSupervisorPending.length} Pendiente(s)
                  </span>
                </div>

                {queueSupervisorPending.length === 0 ? (
                  <div className="p-10 border border-dashed border-slate-850 rounded-lg text-center space-y-2 text-slate-450">
                    <Inbox className="w-8 h-8 mx-auto text-slate-600" />
                    <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-350">Bandeja Vacía</span>
                    <p className="text-[10px] max-w-sm mx-auto leading-relaxed">
                      No hay citas pendientes de asignación por el momento. Cuando el <strong className="text-slate-300">Usuario de Atención</strong> verifique la documentación, las solicitudes aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-850 max-h-[400px] overflow-y-auto pr-1">
                    {queueSupervisorPending.map(app => {
                      const meta = appMetadata[app.id];
                      const name = app.datosPersonales?.nombreCompleto || app.nombre || 'N/D';
                      const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                      
                      return (
                        <div key={app.id} className="py-3 px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-mono text-amber-400">{app.id}</span>
                              <span className="text-[9.5px] bg-slate-900 border border-slate-800 text-emerald-400 uppercase font-black px-2 py-0.2 rounded">
                                Docs Ok ✓
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-200 block uppercase">{name}</span>
                            <span className="text-[10px] font-mono text-slate-450 block font-semibold">PAS: {passport} | Fecha: {app.fecha} ({app.hora})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Fast select of active booths only */}
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignToCubiculo(app.id, parseInt(e.target.value, 10));
                                  e.target.value = ''; // Reset
                                }
                              }}
                              className="bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-200 py-2 px-3 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                            >
                              <option value="">-- Seleccionar Cubículo Activo --</option>
                              {booths.filter(b => b.active).map(b => (
                                <option key={`booth-select-${b.id}`} value={b.id}>
                                  {b.name} - {b.staff}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AUDIT & PERFORMANCE REPORTS (REALIZED CITATIONS DOWNLOAD) */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-5 shadow-xl">
                <div className="border-b border-slate-900 pb-3 text-left">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span>Reportes de Auditoría de Citas Realizadas</span>
                  </h4>
                  <p className="text-[10px] text-slate-405 font-bold uppercase">Descargue reportes con las citas completadas de Extranjería efectivamente atendidas</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(['dia', 'semana', 'mes', 'año'] as const).map(period => {
                    const cnt = filterRealizadasByPeriod(period).length;
                    const periodLabel = period === 'dia' ? 'De Hoy (Diario)' : period === 'semana' ? 'Semana Actual' : period === 'mes' ? 'Mensual (Mes en Curso)' : 'Anual (Año en Curso)';
                    
                    return (
                      <div key={`report-block-${period}`} className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex flex-col justify-between gap-3 text-left">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 block">Período {period.toUpperCase()}</span>
                          <span className="text-2xl font-mono font-black text-white">{cnt}</span>
                          <span className="text-[10.5px] font-bold text-slate-400 block">{periodLabel}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadRealizadasCSV(period)}
                            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded text-[10px] font-black uppercase text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                            <span>CSV</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDownloadRealizadasPDF(period)}
                            className="bg-slate-950 hover:bg-slate-850 border border-slate-800 p-2 rounded text-[10px] font-black uppercase text-amber-500 flex items-center justify-center gap-1 cursor-pointer transition"
                          >
                            <Download className="w-3.5 h-3.5 text-amber-500" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* PROFILE 2: USUARIO EXTRANJERÍA ATENCIÓN (SALA DE ENTRADA) */}
      {subRole === 'atencion' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Left panel: general citations */}
          <div className="lg:col-span-7 bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-900">
              <div className="space-y-0.5 text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <span>Ciudadanos en Entrada de Extranjería</span>
                  <span className="bg-slate-900 border border-slate-750 text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                    {queueAtencionIn.length}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-455 font-bold uppercase leading-relaxed text-left">Seleccione el ciudadano para verificar documentos y pasarlo al Supervisor</p>
              </div>

              <button
                type="button"
                onClick={fetchAppointments}
                disabled={loading}
                className="text-slate-400 hover:text-white transition bg-slate-900 p-2 rounded border border-slate-800 flex items-center gap-1 text-[10px] font-extrabold uppercase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* List */}
            {queueAtencionIn.length === 0 ? (
              <div className="py-20 text-center space-y-2 text-slate-450 border border-dashed border-slate-850 rounded">
                <CheckCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-350">Sin citas en espera</span>
                <p className="text-[10px] max-w-xs mx-auto leading-relaxed">Todos los ciudadanos registrados de Extranjería ya han sido procesados por la Unidad de Entrada.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {queueAtencionIn.map(app => {
                  const name = app.datosPersonales?.nombreCompleto || app.nombre || 'N/D';
                  const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                  const isSelected = selectedAppForCheck?.id === app.id;

                  return (
                    <button
                      key={`atencion-list-${app.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedAppForCheck(app);
                        const meta = appMetadata[app.id];
                        setTempCheckedDocs(meta?.checkedDocs || []);
                      }}
                      className={`w-full p-4 rounded-lg border text-left flex items-start justify-between gap-4 transition cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-950/45 border-blue-500 shadow-md shadow-blue-950/25'
                          : 'bg-slate-900/60 border-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-amber-500">{app.id}</span>
                          <span className="text-[8.5px] bg-slate-950 border border-slate-800 text-slate-400 font-extrabold px-1.5 py-0.2 rounded font-mono">
                            Código Tx: {app.codigoTransaccion}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-100 block uppercase">{name}</span>
                        <span className="text-[9.5px] font-bold text-slate-450 block font-mono">PAS: {passport}  |  Fecha: {app.fecha} ({app.hora})</span>
                      </div>

                      <div className="py-1">
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-900 bg-blue-950/30 text-blue-400">
                          Sala de Entrada
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: checklist */}
          <div className="lg:col-span-5 bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-900">
              <CheckSquare className="w-4 h-4 text-blue-500" />
              <span>Verificación de Documentos</span>
            </h4>

            {!selectedAppForCheck ? (
              <div className="py-24 text-center space-y-3 text-slate-500">
                <FileText className="w-9 h-9 text-slate-700 mx-auto" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ningún ciudadano seleccionado</p>
                <p className="text-[9.5px] max-w-[200px] mx-auto leading-relaxed">
                  Haga clic en una de las tarjetas de ciudadano de la izquierda para comenzar la validación de sus requisitos de nacionalidad y cedulación.
                </p>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in text-left">
                
                {/* Details snapshot */}
                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-850 space-y-1.5">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block font-mono">Cita para Validación</span>
                  <div className="text-xs font-mono font-black text-white">{selectedAppForCheck.id}</div>
                  <div className="text-sm font-bold text-slate-100 uppercase">{selectedAppForCheck.datosPersonales?.nombreCompleto || selectedAppForCheck.nombre}</div>
                  <div className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                    Pasaporte: {selectedAppForCheck.datosPersonales?.pasaporte || selectedAppForCheck.identificacion} <br />
                    Trámite: {selectedAppForCheck.subServicioNombre || 'Servicio de Cedulación Extranjera'}
                  </div>
                </div>

                {/* Checklist form */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Requisitos Obligatorios</span>
                  
                  {REQUISITOS_EXTRANJERIA.map(req => {
                    const isChecked = tempCheckedDocs.includes(req.id);
                    return (
                      <button
                        key={`doc-check-${req.id}`}
                        type="button"
                        onClick={() => handleToggleDocCheck(req.id)}
                        className={`w-full p-3 rounded-lg border text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                          isChecked 
                            ? 'bg-blue-950/20 border-blue-500/50 text-blue-300' 
                            : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        <span className="text-[10.5px] font-semibold leading-relaxed">{req.name}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Summary checklist alert */}
                <div className="bg-slate-900/50 p-3 rounded border border-slate-900 text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Tenga en cuenta que el ciudadano debe presentar <strong className="text-white">todo el listado original</strong>. En caso de cumplir con los requisitos, se habilitará para su envío con el Supervisor de Extranjería.
                </div>

                {/* Actions */}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSubmitVerification(selectedAppForCheck.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] tracking-wider uppercase py-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmar Docs & Enviar a Supervisor</span>
                  </button>
                </div>

              </div>
            )}

            {/* List of already processed by Atencion (Forwarded tracker) */}
            {queueAtencionOut.length > 0 && (
              <div className="pt-4 border-t border-slate-900 text-left space-y-2.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Registro de Tramitados de Entrada</span>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {queueAtencionOut.map(app => {
                    const meta = appMetadata[app.id];
                    const name = app.datosPersonales?.nombreCompleto || app.nombre || 'N/D';
                    const nameShort = name.length > 25 ? name.slice(0, 23) + '...' : name;
                    
                    const boothObj = meta?.assignedCubiculo ? booths.find(b => b.id === meta.assignedCubiculo) : null;

                    return (
                      <div key={`atencion-done-${app.id}`} className="bg-slate-900/40 border border-slate-900/80 px-3 py-2 rounded flex items-center justify-between gap-3 text-[10.5px]">
                        <div>
                          <strong className="text-slate-350 font-mono">{app.id}</strong>
                          <span className="text-slate-500 font-bold uppercase ml-2 select-none">-</span>
                          <span className="text-slate-400 uppercase font-semibold ml-2">{nameShort}</span>
                        </div>
                        {boothObj ? (
                          <span className="text-[8px] font-black uppercase bg-indigo-950/60 text-indigo-400 border border-indigo-900/50 px-2 py-0.2 rounded">
                            Asignado: {boothObj.name}
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase bg-slate-900 text-amber-500 border border-slate-800 px-2 py-0.2 rounded animate-pulse">
                            Espera Supervisor
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* PROFILE 3: USUARIO EXTRANJERÍA CUBÍCULO (TICKET PROCESS SYSTEM) */}
      {subRole === 'cubiculo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-left">
          
          {/* Left panel: Cubicle selection and status indicator */}
          {currentRole !== 'extranjeria_cubiculo' && (
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <span>Puesto de Trabajo</span>
                </h4>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Seleccione el Cubículo a Operar:</label>
                  <select
                    value={selectedCubiculo}
                    onChange={(e) => setSelectedCubiculo(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-black cursor-pointer"
                  >
                    {booths.map(b => (
                      <option key={`cubiculo-view-opt-${b.id}`} value={b.id}>
                        {b.name} {b.active ? ' (ACTIVO)' : ' (INACTIVO)'} - {b.staff}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status display for booth */}
                {(() => {
                  const b = booths.find(x => x.id === selectedCubiculo);
                  return (
                    <div className="bg-slate-900 p-3.5 rounded border border-slate-850 space-y-2.5">
                      <span className="text-[9.5px] font-black text-slate-450 uppercase block tracking-widest font-mono">Estado del Casillero</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white uppercase">{b?.name}</span>
                        <span className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          b?.active 
                            ? 'bg-emerald-950/80 border-emerald-900 text-emerald-400' 
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}>
                          {b?.active ? 'Estación Activa' : 'Estación Cerrada'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                        Operador asignado: <strong className="text-slate-200">{b?.staff}</strong>
                        {!b?.active && (
                          <p className="text-[9px] text-amber-500 mt-2 font-bold leading-normal">
                            ⚠️ ATENCIÓN: Este casillero figura desactivado por el Supervisor. Cámbiese de cubículo o pida al Supervisor que lo active.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* QUICK STATS FOR ACTIVE CUBICLE */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-3.5 shadow-xl">
                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Eficiencia del Operador</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded border border-slate-850 text-center">
                    <span className="text-[8px] text-slate-450 uppercase font-black block">Atendidos Hoy</span>
                    <span className="text-xl font-mono font-black text-indigo-400">
                      {appointments.filter(app => {
                        const meta = appMetadata[app.id];
                        return meta && meta.assignedCubiculo === selectedCubiculo && meta.estadoTicket === 'realizada';
                      }).length}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-850 text-center">
                    <span className="text-[8px] text-slate-450 uppercase font-black block">Tránsito</span>
                    <span className="text-xl font-mono font-black text-white">Normal</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right panel: queuing and ticket execution */}
          <div className={`${
            currentRole === 'extranjeria_cubiculo' ? 'lg:col-span-12' : 'lg:col-span-8'
          } bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-5 shadow-xl`}>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-900">
              <span>Ciudadanos Asignados - Cola de Atención de {booths.find(b => b.id === selectedCubiculo)?.name}</span>
              <span className="bg-slate-900 border border-slate-750 text-slate-450 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                {queueCubiculoAssigned.length} En Espera
              </span>
            </h4>

            {queueCubiculoAssigned.length === 0 ? (
              <div className="py-24 text-center space-y-2 text-slate-500 border border-dashed border-slate-850 rounded">
                <UserCheck className="w-9 h-9 text-slate-700 mx-auto" />
                <span className="text-[11.5px] font-bold uppercase tracking-wider block text-slate-300">Cola Vacía</span>
                <p className="text-[10px] max-w-sm mx-auto leading-relaxed text-slate-450">
                  No tiene ciudadanos asignados en su cubículo por el momento. Avise al <strong className="text-slate-350">Supervisor de Extranjería</strong> para que le asigne algún expediente de la cola general.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {queueCubiculoAssigned.map(app => {
                  const meta = appMetadata[app.id];
                  const name = app.datosPersonales?.nombreCompleto || app.nombre || 'N/D';
                  const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                  const needsCashierPay = meta?.estadoTicket === 'ninguno' || meta?.estadoTicket === 'en_proceso';
                  const isPaid = meta?.estadoTicket === 'pagado_en_caja';

                  return (
                    <div key={`cubiculo-row-${app.id}`} className="bg-slate-900/60 border border-slate-850 p-5 rounded-lg space-y-4 shadow-md text-left">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-amber-500">{app.id}</span>
                            <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 font-black px-1.5 py-0.2 rounded font-mono">
                              Tx: {app.codigoTransaccion}
                            </span>
                          </div>
                          <h5 className="text-sm font-black text-slate-100 uppercase leading-snug">{name}</h5>
                          <span className="text-[10px] text-slate-450 font-bold block">Nacionalidad: {app.datosPersonales?.nacionalidad || 'N/D'}  |  Pasaporte: {passport}</span>
                        </div>

                        <div>
                          {isPaid ? (
                            <span className="text-[9px] font-black uppercase bg-emerald-950 border border-emerald-800 text-emerald-400 px-3 py-1 rounded">
                              Pago Registrado Ok ✓
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase bg-amber-950 border border-amber-800 text-amber-400 px-3 py-1 rounded animate-pulse">
                              Pendiente Pago de Caja
                            </span>
                          )}
                        </div>
                      </div>

                      {/* TICKET SYSTEM SIMULATION PANEL BLOCK */}
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wide">Módulo de Sistema de Tickets Oficial</span>
                          </div>
                          <a 
                            href="https://sistema-de-ticket.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-white px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition select-none"
                            referrerPolicy="no-referrer"
                          >
                            <span>Abrir Ticket App</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <p className="text-[10.5px] text-slate-400 leading-relaxed leading-normal font-semibold">
                          Por normativas, todo trámite migratorio presencial en el Tribunal Electoral requiere emitirse primero con el número oficial de ticket de caja en <strong className="text-slate-200 font-mono">https://sistema-de-ticket.vercel.app/</strong> para la recaudación tributaria.
                        </p>

                        <div className="bg-slate-900 border border-slate-850 px-3 py-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-left">
                            <span className="text-[8px] text-slate-500 uppercase font-black block">Detalles de Emisión de Ticket de Cobro:</span>
                            <span className="text-[11px] font-bold text-slate-300">
                              Llamar Turno: <strong className="text-yellow-500 font-mono font-bold">EXT-{app.id.slice(-4)}</strong> en Cubículo {selectedCubiculo}
                            </span>
                          </div>

                          {needsCashierPay ? (
                            <button
                              type="button"
                              onClick={() => handleSendToCaja(app.id)}
                              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Llamar y Enviar a Caja de Pago</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-black flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Enviado a Caja Correctamente</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Final closure button */}
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={needsCashierPay}
                          onClick={() => handleCompleteAppointment(app.id)}
                          className={`px-5 py-2.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider shadow flex items-center gap-1.5 transition ${
                            needsCashierPay 
                              ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 cursor-pointer'
                          }`}
                          title="Finalizar el trámite únicamente después de registrar el pago de caja"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Confirmar Pago & Finalizar Cita</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN IMPRIMIBLE OCULTA (OPTIMIZADA PARA PDF DE CITAS) */}
      {/* ======================================================== */}
      <div id="print-area-extranjeria" className="hidden text-black bg-white p-12 max-w-4xl mx-auto border-4 border-double border-black font-sans">
        <div className="text-center space-y-1 border-b-2 border-black pb-4">
          <h1 className="text-lg font-black tracking-widest uppercase m-0 leading-tight">REPÚBLICA DE PANAMÁ</h1>
          <h2 className="text-sm font-extrabold m-0 uppercase tracking-widest">TRIBUNAL ELECTORAL</h2>
          <h3 className="text-xs font-bold text-slate-700 m-0 uppercase tracking-wide">DIRECCIÓN NACIONAL DE CEDULACIÓN / REGISTRO CIVIL</h3>
          <p className="text-[10px] font-mono m-0 text-slate-600 mt-1">SISTEMA INTEGRAL DE RESERVA DE CITAS PRESENCIALES - EXTRANJERÍA</p>
        </div>

        <div className="grid grid-cols-2 gap-4 my-6 text-[11px] leading-relaxed">
          <div className="text-left">
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">DEPARTAMENTO:</strong> Unidad de Extranjería / Trámites de Naturalización</p>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">DIRECCIÓN SEDE:</strong> Sede Principal de Ancón, Ciudad de Panamá</p>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">REPORTE GENERADO POR:</strong> {currentRole.toUpperCase()} (MÓDULO INTERNO)</p>
          </div>
          <div className="text-right">
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">FECHA DE EMISIÓN:</strong> {new Date().toLocaleString()}</p>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">TOTAL DE CITAS EN BASE Extranjería:</strong> {appointments.length} Cita(s)</p>
          </div>
        </div>

        <h4 className="text-center text-sm font-black uppercase tracking-wider mb-4 border-2 border-slate-300 py-1.5 bg-slate-100">
          LISTADO OFICIAL DE CITACIONES REGISTRADAS - EXTRANJERÍA
        </h4>

        {filteredGeneralAppointments.length === 0 ? (
          <div className="text-center py-8 font-extrabold italic text-slate-500 text-xs">
            No se encontraron citas programadas en los parámetros seleccionados.
          </div>
        ) : (
          <table className="w-full border-collapse border border-black text-[10px] mb-8">
            <thead>
              <tr className="bg-slate-200 border-b border-black text-left font-black uppercase text-slate-800">
                <th className="border border-black p-2 w-1/4">CÓDIGO DE CITA</th>
                <th className="border border-black p-2 w-1/5">FECHA Y HORA</th>
                <th className="border border-black p-2">CIUDADANO</th>
                <th className="border border-black p-2 w-1/6 text-center">PASAPORTE</th>
                <th className="border border-black p-2 w-1/6 text-center">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {filteredGeneralAppointments.map((app: any) => (
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

        <div className="mt-16 text-[10.5px]">
          <div className="grid grid-cols-2 gap-12 text-center text-slate-600 pt-8 font-sans">
            <div className="space-y-1">
              <div className="border-t border-black w-2/3 mx-auto pt-1"></div>
              <p className="m-0 uppercase font-bold text-[9px] text-black">FIRMA DE AUTORIDAD DE CEDULACIÓN</p>
              <p className="m-0 text-[8px] tracking-wide uppercase">Tribunal Electoral de Panamá</p>
            </div>
            <div className="space-y-1">
              <div className="border-t border-black w-2/3 mx-auto pt-1"></div>
              <p className="m-0 uppercase font-bold text-[9px] text-black">JEFE DE SERVICIO DE MIGRACIÓN/REGISTRO</p>
              <p className="m-0 text-[8px] tracking-wide uppercase font-mono">ID Firma Electrónica: #TE-591244</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-amber-550/20 pb-3 text-amber-500">
              <AlertCircle className="w-6 h-6 shrink-0 text-amber-500" />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-100 font-sans">Confirmar Cambios de Programación</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              ¿Está seguro de que desea aplicar estos cambios a la planificación de citas de Extranjería? 
              Los nuevos cupos, de atención y horarios regirán de manera inmediata para todos los ciudadanos.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded text-xs font-black uppercase cursor-pointer transition font-sans"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeSaveConfig}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-black uppercase shadow-md cursor-pointer transition flex items-center gap-1 font-sans"
              >
                Sí, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
