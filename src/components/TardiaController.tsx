import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, 
  Download, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertCircle, 
  Filter, 
  Check, 
  X, 
  Search, 
  FileText, 
  Clock,
  Plus,
  Copy,
  Link,
  Share2,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  Lock,
  ChevronUp
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Cita, AdminRole } from '../types';

interface TardiaControllerProps {
  citas: Cita[];
  onUpdateCitas: (updatedList: Cita[]) => void;
  currentRole: AdminRole;
  activeUsername: string;
}

export default function TardiaController({ 
  citas, 
  onUpdateCitas, 
  currentRole, 
  activeUsername 
}: TardiaControllerProps) {
  
  // Persona control (can switch between Supervisor and Operator if role is 'super' or for troubleshooting)
  const luser = activeUsername.toLowerCase();
  const isSuperAdmin = currentRole === 'super';
  
  const [activePersona, setActivePersona] = useState<'superit' | 'adminpedad'>(() => {
    if (currentRole === 'pasado_edad_supervisor') return 'superit';
    if (currentRole === 'pasado_edad_admin') return 'adminpedad';
    if (luser === 'superit') return 'superit';
    if (luser === 'adminpedad') return 'adminpedad';
    // Fallback or Super Admin select
    return 'superit';
  });

  // Sync activePersona in case activeUsername or currentRole changes
  useEffect(() => {
    if (currentRole === 'pasado_edad_supervisor') {
      setActivePersona('superit');
    } else if (currentRole === 'pasado_edad_admin') {
      setActivePersona('adminpedad');
    } else if (luser === 'superit') {
      setActivePersona('superit');
    } else if (luser === 'adminpedad') {
      setActivePersona('adminpedad');
    }
  }, [luser, currentRole]);

  // STATES FOR REGISTRATION FORM (adminpedad)
  const [expName, setExpName] = useState('');
  const [expIdentificacion, setExpIdentificacion] = useState('');
  const [expFechaNacimiento, setExpFechaNacimiento] = useState('');
  const [expCorreo, setExpCorreo] = useState('');
  const [expTelefono, setExpTelefono] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Default link base state
  const [pasadoEdadLinkBase, setPasadoEdadLinkBase] = useState(() => {
    const stored = localStorage.getItem('te_panama_pasado_edad_link_base');
    if (stored) return stored;
    return typeof window !== 'undefined' ? window.location.origin : 'https://citas.tribunal-electoral.gob.pa';
  });

  const [generatedExp, setGeneratedExp] = useState<{
    number: string;
    citizenName: string;
    textMessage: string;
    link: string;
  } | null>(null);

  const [historicalExp, setHistoricalExp] = useState<any[]>(() => {
    const stored = localStorage.getItem('te_panama_historical_expedientes');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { return []; }
    }
    return [];
  });

  // STATES FOR PLANNING OPERATION CONFIG (adminpedad)
  const [tardiaCapacidadTotal, setTardiaCapacidadTotal] = useState<number>(4);
  const [tardiaIntervalo, setTardiaIntervalo] = useState<number>(30);
  const [tardiaHoraInicio, setTardiaHoraInicio] = useState<string>('08:00 AM');
  const [tardiaHoraFin, setTardiaHoraFin] = useState<string>('11:30 AM');
  const [showConfirmTardiaSave, setShowConfirmTardiaSave] = useState(false);

  // STATES FOR FILTERING AND LISTING COMPLETED CITAS (superit)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'confirmada' | 'cancelada' | 'realizada'>('todos');
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // Sync configuration from server on mount
  useEffect(() => {
    const fetchTardiaConfig = async () => {
      try {
        const res = await fetch('/api/tardia/config');
        if (res.ok) {
          const data = await res.json();
          if (data && data.config) {
            setTardiaCapacidadTotal(data.config.capacidadTotalDia || 4);
            setTardiaIntervalo(data.config.intervalo || 30);
            setTardiaHoraInicio(data.config.horaInicio || '08:00 AM');
            setTardiaHoraFin(data.config.horaFin || '11:30 AM');
          }
        }
      } catch (err) {
        console.warn('Erro fetching server configurations, using local fallbacks.', err);
      }
    };
    fetchTardiaConfig();
  }, []);

  // Filter ONLY appointments corresponding to 'ced_pasados_edad'
  const allTardiaCitas = useMemo(() => {
    return citas.filter(cita => cita.subServicioId === 'ced_pasados_edad');
  }, [citas]);

  // Derived Supervisor Statistics
  const stats = useMemo(() => {
    const total = allTardiaCitas.length;
    const realizadas = allTardiaCitas.filter(c => c.estado === 'realizada').length;
    const confirmadas = allTardiaCitas.filter(c => c.estado === 'confirmada' || c.estado === 'asistire').length;
    const canceladas = allTardiaCitas.filter(c => c.estado === 'cancelada' || c.estado === 'no_asistire').length;
    return { total, realizadas, confirmadas, canceladas };
  }, [allTardiaCitas]);

  // Handle Generate Expedientes Followup code (adminpedad role)
  const handleGenerateExpediente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName.trim() || !expIdentificacion.trim() || !expCorreo.trim() || !expTelefono.trim()) {
      alert('Por favor complete todos los datos obligatorios del ciudadano.');
      return;
    }

    const uniqueNumber = `EXP-2026-TE-${Math.floor(100000 + Math.random() * 900000)}`;
    
    let base = pasadoEdadLinkBase.trim();
    if (base.endsWith('/')) {
      base = base.slice(0, -1);
    }
    const directLink = `${base}/?tramite=ced_pasados_edad&seguimiento=${uniqueNumber}`;

    const textMessage = `Estimado(a) ${expName.trim()}, el Tribunal Electoral le informa que su expediente de inscripción tardía (Pasado de Edad) ha sido procesado con éxito.

Su Número de Seguimiento Obligatorio es: *${uniqueNumber}*

Para agendar su cita de atención presencial en la sucursal de su preferencia, por favor ingrese al siguiente enlace oficial, donde sus datos estarán pre-cargados automáticamente:
${directLink}
  
Recuerde presentar los requisitos correspondientes el día de su cita.`;

    const newRecord = {
      id: uniqueNumber,
      number: uniqueNumber,
      citizenName: expName.trim(),
      identificacion: expIdentificacion.trim(),
      fechaNacimiento: expFechaNacimiento,
      correo: expCorreo.trim(),
      telefono: expTelefono.trim(),
      notes: expNotes.trim(),
      directLink,
      textMessage,
      fechaCreacion: new Date().toISOString()
    };

    const updated = [newRecord, ...historicalExp];
    setHistoricalExp(updated);
    try {
      localStorage.setItem('te_panama_historical_expedientes', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    setGeneratedExp({
      number: uniqueNumber,
      citizenName: expName.trim(),
      textMessage,
      link: directLink
    });

    // Reset inputs
    setExpName('');
    setExpIdentificacion('');
    setExpFechaNacimiento('');
    setExpCorreo('');
    setExpTelefono('');
    setExpNotes('');
  };

  // Safe tracking PDF downloader for single tracking records
  const handleDownloadTrackingPDF = (exp: any) => {
    if (!exp) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Dark slate band header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');

    // Accent line (Gold/Amber)
    doc.setFillColor(217, 119, 6);
    doc.rect(0, 40, 210, 2.5, 'F');

    // Title / Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TRIBUNAL ELECTORAL DE PANAMÁ', 20, 16);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text('DIRECCIÓN NACIONAL DE CEDULACIÓN / REGISTRO CIVIL', 20, 21);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CONSTANCIA DE EXPEDIENTE Y SEGUIMIENTO ACTIVO', 20, 31);

    let currentY = 55;
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CONSTANCIA OFICIAL PARA CITAS DE INSCRIPCIÓN TARDÍA (PASADO DE EDAD)', 20, currentY);
    
    currentY += 9;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Estimado(a) ciudadano(a), el Tribunal Electoral de Panamá hace constar que se ha registrado su expediente de filiación e inscripción tardía presencial bajo las siguientes credenciales autorizadas:', 20, currentY, { maxWidth: 170 });

    currentY += 15;

    // Info card box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(20, currentY, 170, 52, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DATOS DECLARADOS DEL SOLICITANTE', 26, currentY + 8);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    doc.setFont('Helvetica', 'bold'); doc.text('Nombre Completo:', 26, currentY + 17);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.citizenName || exp.nombreCompleto || 'N/A', 65, currentY + 17);

    doc.setFont('Helvetica', 'bold'); doc.text('Identificación / Cédula:', 26, currentY + 24);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.identificacion, 65, currentY + 24);

    doc.setFont('Helvetica', 'bold'); doc.text('Código de Seguimiento:', 26, currentY + 31);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(29, 78, 216); doc.text(exp.number || exp.id, 65, currentY + 31);
    doc.setTextColor(71, 85, 105);

    doc.setFont('Helvetica', 'bold'); doc.text('Contacto Registrado:', 26, currentY + 38);
    doc.setFont('Helvetica', 'normal'); doc.text(`${exp.correo} / ${exp.telefono}`, 65, currentY + 38);

    doc.setFont('Helvetica', 'bold'); doc.text('Fecha Creación:', 26, currentY + 45);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.fechaCreacion ? exp.fechaCreacion.substring(0, 10) : '2026-05-27', 65, currentY + 45);

    currentY += 62;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('PASO OBLIGATORIO DE AGENDAMIENTO', 20, currentY);

    currentY += 6;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Este documento le faculta para agendar de forma autónoma su cita en el sistema electoral. Ingrese al enlace provisto a continuación o escanee las credenciales correspondientes:', 20, currentY, { maxWidth: 170 });

    currentY += 12;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.rect(20, currentY, 170, 16, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(29, 78, 216);
    const linkToRender = exp.link || exp.directLink || '';
    doc.text(linkToRender, 24, currentY + 10, { maxWidth: 162 });

    currentY += 28;
    doc.setDrawColor(226, 232, 240);
    doc.line(20, currentY, 190, currentY);

    currentY += 10;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('TRIBUNAL ELECTORAL DE PANAMÁ - CONTROL TARDÍAS', 20, currentY);
    doc.text('SISTEMA DE ASIGNACIÓN Y SEGUIMIENTO AUTOMATIZADO - VIGENCIA 2026', 100, currentY);

    doc.save(`Tracking_${exp.number || exp.id}.pdf`);
  };

  // Save schedules config (adminpedad UI trigger)
  const promptSaveTardiaConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmTardiaSave(true);
  };

  const executeSaveTardiaConfig = async () => {
    setShowConfirmTardiaSave(false);
    
    localStorage.setItem('tardia_capacidad_total_dia', String(tardiaCapacidadTotal));
    localStorage.setItem('tardia_intervalo_minutos', String(tardiaIntervalo));
    localStorage.setItem('tardia_hora_inicio', tardiaHoraInicio);
    localStorage.setItem('tardia_hora_fin', tardiaHoraFin);
    
    try {
      const res = await fetch('/api/tardia/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capacidadTotalDia: tardiaCapacidadTotal,
          intervalo: tardiaIntervalo,
          horaInicio: tardiaHoraInicio,
          horaFin: tardiaHoraFin
        })
      });
      const data = await res.json();
      if (data && data.success) {
        alert('¡Éxito! Configuración de citas para Inscripción Tardía actualizada y sincronizada en el servidor.');
      } else {
        alert('Configuración guardada localmente, pero falló la sincronización con el servidor.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar configuración.');
    }
  };

  // Supervisor state updates for citations
  const handleUpdateCitaStatus = (citaId: string, newStatus: 'confirmada' | 'cancelada' | 'realizada') => {
    const updated = citas.map(c => {
      if (c.id === citaId) {
        return { ...c, estado: newStatus };
      }
      return c;
    });
    onUpdateCitas(updated);
  };

  // Dynamic filter lists for citations in Supervisor view based on search/filters
  const filteredTardiaCitas = useMemo(() => {
    return allTardiaCitas.filter(c => {
      // Search text match
      const query = searchQuery.trim().toLowerCase();
      const citizen = c.datosPersonales;
      const matchSearch = !query || 
        (citizen?.nombreCompleto || '').toLowerCase().includes(query) ||
        (citizen?.identificacion || '').toLowerCase().includes(query) ||
        (citizen?.correo || '').toLowerCase().includes(query) ||
        (citizen?.telefono || '').toLowerCase().includes(query) ||
        c.codigoTransaccion.toLowerCase().includes(query);

      // Status match
      const matchStatus = statusFilter === 'todos' || 
        (statusFilter === 'realizada' && c.estado === 'realizada') ||
        (statusFilter === 'confirmada' && (c.estado === 'confirmada' || c.estado === 'asistire')) ||
        (statusFilter === 'cancelada' && (c.estado === 'cancelada' || c.estado === 'no_asistire'));

      return matchSearch && matchStatus;
    });
  }, [allTardiaCitas, searchQuery, statusFilter]);

  // DATE PERIOD CONSOLDIATOR ROUTINES FOR DOWNLOADING "REALIZADAS"
  // Filter helper for exact period of "realizadas" appointments
  const getCompletedCitasForPeriod = (period: 'dia' | 'semana' | 'mes' | 'año') => {
    const now = new Date();
    // In our system base environment, let's treat the date 2026-05-27 as "today"
    const todayStr = '2026-05-27'; 
    const todayDate = new Date(todayStr + 'T12:00:00');

    return allTardiaCitas.filter(c => {
      // Must be marked as realized (completed)
      if (c.estado !== 'realizada') return false;

      try {
        const appointmentDate = new Date(c.fecha + 'T00:00:00');
        
        if (period === 'dia') {
          return c.fecha === todayStr;
        }
        
        if (period === 'semana') {
          // Current Week Range (Monday to Sunday) based on 2026-05-27 (Wednesday)
          // Mon: 2026-05-25, Sun: 2026-05-31
          const startOfWeek = new Date('2026-05-25T00:00:00');
          const endOfWeek = new Date('2026-05-31T23:59:59');
          return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
        }
        
        if (period === 'mes') {
          // May 2026
          return appointmentDate.getMonth() === 4 && appointmentDate.getFullYear() === 2026;
        }
        
        if (period === 'año') {
          return appointmentDate.getFullYear() === 2026;
        }
      } catch (err) {
        return false;
      }
      return false;
    });
  };

  // TRIGGER PDF GENERATION REPORT FOR PERIOD
  const handleDownloadReportPDF = (period: 'dia' | 'semana' | 'mes' | 'año') => {
    setExportLoading(period);

    setTimeout(() => {
      const records = getCompletedCitasForPeriod(period);
      const periodLabel = period === 'dia' ? 'HOY (27 de Mayo, 2026)' 
                        : period === 'semana' ? 'ESTA SEMANA (25 - 31 Mayo)' 
                        : period === 'mes' ? 'ESTE MES (Mayo 2026)' 
                        : 'ESTE AÑO (2026)';

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Dark slate band header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 45, 'F');

      // Accent border line (Emerald green representing realized/completed successfully)
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 45, 210, 2.5, 'F');

      // Title & Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('TRIBUNAL ELECTORAL DE PANAMÁ', 20, 16);
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text('DIRECCIÓN DE CEDULACIÓN — OFICIALÍA ESPECIALIZADA EN INSCRIPCIONES TARDÍAS', 20, 22);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('REPORTE OFICIAL DE CITAS REALIZADAS', 20, 34);

      let currentY = 58;

      // Meta text
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(`PERIODO CONSOLIDADO: ${periodLabel.toUpperCase()}`, 20, currentY);
      
      currentY += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Constancia firmada para auditar las citas presenciales de inscripción tardía (Pasados de Edad) que han sido marcadas como "Realizadas" con atención cumplida.`, 20, currentY, { maxWidth: 170 });

      currentY += 12;

      // Overview Score Card
      doc.setFillColor(240, 253, 250); // emerald-50
      doc.setDrawColor(110, 231, 183); // emerald-300
      doc.setLineWidth(0.3);
      doc.rect(20, currentY, 170, 16, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`CANTIDAD TOTAL DE CITAS REALIZADAS ENCONTRADAS: `, 26, currentY + 10);
      doc.setFontSize(11);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text(`${records.length} Citas`, 160, currentY + 10);

      currentY += 26;

      // Table Header
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(20, currentY, 170, 7.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      
      doc.text('FECHA/HORA', 22, currentY + 5);
      doc.text('CIUDADANO SOLICITANTE', 48, currentY + 5);
      doc.text('CÉDULA / ID', 105, currentY + 5);
      doc.text('SUCURSAL', 135, currentY + 5);
      doc.text('ESTADO', 172, currentY + 5);

      currentY += 7.5;

      // Draw table rows
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      if (records.length === 0) {
        doc.setDrawColor(226, 232, 240);
        doc.rect(20, currentY, 170, 12, 'D');
        doc.text('No se encontraron registros de citas realizadas dentro de este lapso temporal.', 25, currentY + 8);
        currentY += 15;
      } else {
        records.forEach((rec, idx) => {
          doc.setDrawColor(241, 245, 249);
          doc.rect(20, currentY, 170, 9, 'D');
          
          doc.setFont('Helvetica', 'bold');
          doc.text(`${rec.fecha} ${rec.hora}`, 22, currentY + 6);
          doc.setFont('Helvetica', 'normal');
          
          const fullName = rec.datosPersonales.nombreCompleto || 'Desconocido';
          const truncatedName = fullName.length > 25 ? fullName.substring(0, 22) + '...' : fullName;
          doc.text(truncatedName, 48, currentY + 6);
          doc.text(rec.datosPersonales.identificacion, 110, currentY + 6);
          
          const sName = rec.sucursalId ? rec.sucursalId.replace(/_/g, ' ').toUpperCase() : 'CENTRAL';
          const sTruncated = sName.length > 15 ? sName.substring(0, 13) + '.' : sName;
          doc.text(sTruncated, 137, currentY + 6);
          
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(5, 150, 105);
          doc.text('REALIZADA', 172, currentY + 6);
          doc.setTextColor(51, 65, 85);
          
          currentY += 9;
        });
      }

      currentY += 15;
      // Signature Section
      doc.setDrawColor(203, 213, 225);
      doc.line(20, currentY, 90, currentY);
      doc.line(120, currentY, 190, currentY);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('FIRMA RESPONSABLE OFICIALÍA', 22, currentY + 5);
      doc.text('SUPERIT - FIRMA DE SUPERVISIÓN', 122, currentY + 5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Id Auditoría: SEGUIMIENTO-PE-2026`, 22, currentY + 9);
      doc.text(`Fecha Impresión: ${new Date().toISOString()}`, 122, currentY + 9);

      doc.save(`Citas_Realizadas_Tardia_${period}.pdf`);
      setExportLoading(null);
    }, 600);
  };

  // TRIGGER CSV GENERATION REPORT FOR PERIOD
  const handleDownloadReportCSV = (period: 'dia' | 'semana' | 'mes' | 'año') => {
    const records = getCompletedCitasForPeriod(period);
    const headers = ['ID Cita', 'Fecha', 'Hora', 'Nombre Ciudadano', 'Identificacion', 'Correo', 'Telefono', 'Sucursal', 'Estado'];
    
    const rows = records.map(rec => [
      rec.id,
      rec.fecha,
      rec.hora,
      rec.datosPersonales.nombreCompleto || '',
      rec.datosPersonales.identificacion || '',
      rec.datosPersonales.correo || '',
      rec.datosPersonales.telefono || '',
      rec.sucursalId || '',
      rec.estado
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      const escapedRow = row.map(val => `"${val.replace(/"/g, '""')}"`);
      csvContent += escapedRow.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Citas_Realizadas_Tardia_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* SIMULATOR SWITCH / ROLE BAR */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-550/15 rounded-lg border border-blue-500/30 text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <span>Módulo Inscripción Tardía</span>
              <span className="bg-blue-600/20 text-blue-300 border border-blue-700 text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase">
                Pasados De Edad
              </span>
            </h3>
            <p className="text-[11.5px] text-slate-400 font-medium">
              Gestor institucional de asignaciones de seguimientos y constataciones de agendas de trámites.
            </p>
          </div>
        </div>

        {/* Dynamic simulator trigger for testing and admin users */}
        {(currentRole === 'super' || currentRole === 'pasado_edad') ? (
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 self-stretch sm:self-auto justify-between shadow">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-2 block">
              Persona Activa:
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActivePersona('superit')}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                  activePersona === 'superit'
                    ? 'bg-emerald-600 text-white font-extrabold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>SuperIT (Supervisor)</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePersona('adminpedad')}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                  activePersona === 'adminpedad'
                    ? 'bg-blue-600 text-white font-extrabold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>adminpedad (Usuario)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-950/40 px-3.5 py-2 border border-blue-900/50 rounded-lg flex items-center gap-2 text-xs text-blue-400 self-stretch sm:self-auto font-medium select-none shadow">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>
              Estación Activa: 
              <strong className="font-extrabold text-blue-300 uppercase tracking-wide ml-1">
                {currentRole === 'pasado_edad_supervisor' ? '👑 Supervisor General' : currentRole === 'pasado_edad_admin' ? '📋 Operador Seguimiento IT' : '🛡️ Administrador IT'}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* VISTA 1: SUPERVISOR (SuperIT) */}
      {activePersona === 'superit' && (
        <div className="space-y-6 animate-fade-in text-slate-100">
          
          {/* STATS COUNT */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-slate-950/80 p-5 rounded-lg border border-slate-850 shadow-lg flex flex-col justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 block">Inscritos Totales</span>
              <div className="flex items-end justify-between mt-2.5">
                <span className="text-2xl font-black font-mono tracking-tight text-white">{stats.total}</span>
                <span className="text-[9px] text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-900/40">Citas</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-lg border border-slate-850 shadow-lg flex flex-col justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 block">Citas Realizadas</span>
              <div className="flex items-end justify-between mt-2.5">
                <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">{stats.realizadas}</span>
                <span className="text-[9px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/40 font-bold">Completadas</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-lg border border-slate-850 shadow-lg flex flex-col justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 block">Citas Confirmadas</span>
              <div className="flex items-end justify-between mt-2.5">
                <span className="text-2xl font-black font-mono tracking-tight text-blue-450">{stats.confirmadas}</span>
                <span className="text-[9px] text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-900/40 font-bold">Pendientes</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-lg border border-slate-850 shadow-lg flex flex-col justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 block">Citas Canceladas</span>
              <div className="flex items-end justify-between mt-2.5">
                <span className="text-2xl font-black font-mono tracking-tight text-red-400">{stats.canceladas}</span>
                <span className="text-[9px] text-red-500 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-900/40 font-bold">Cancelada</span>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: DOWNLOAD REPORTS FOR COMPLETED CITAS BY PERIOD */}
            <div className="xl:col-span-5 bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-xl space-y-4">
              <div className="border-b border-slate-900 pb-3">
                <h4 className="text-xs font-black uppercase text-slate-350 tracking-wider flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-500" />
                  Consolidado de Descargas (Citas Realizadas)
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Consulte y descargue instantáneamente las citas de Inscripción Tardía realizadas. Los reportes están disponibles en formato PDF oficial firmado o CSV estructurado.
                </p>
              </div>

              {/* REPORT CARDS */}
              <div className="space-y-3.5 pt-1">
                
                {/* Period 1: Día */}
                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-205 block">Citas de Hoy (Día)</span>
                    <span className="text-[10px] text-slate-500 block font-mono">Filtradas al 27 de Mayo, 2026</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadReportPDF('dia')}
                      disabled={exportLoading !== null}
                      className="bg-emerald-950 border border-emerald-900/80 hover:bg-emerald-900 hover:border-emerald-700/80 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      {exportLoading === 'dia' ? (
                        <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReportCSV('dia')}
                      className="bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* Period 2: Semana */}
                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-205 block">Esta Semana</span>
                    <span className="text-[10px] text-slate-500 block font-mono">Del 25 al 31 de Mayo, 2026</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadReportPDF('semana')}
                      disabled={exportLoading !== null}
                      className="bg-emerald-950 border border-emerald-900/80 hover:bg-emerald-900 hover:border-emerald-700/80 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      {exportLoading === 'semana' ? (
                        <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReportCSV('semana')}
                      className="bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* Period 3: Mes */}
                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-205 block">Este Mes</span>
                    <span className="text-[10px] text-slate-500 block font-mono">Mes Completo: Mayo 2026</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadReportPDF('mes')}
                      disabled={exportLoading !== null}
                      className="bg-emerald-950 border border-emerald-900/80 hover:bg-emerald-900 hover:border-emerald-700/80 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      {exportLoading === 'mes' ? (
                        <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReportCSV('mes')}
                      className="bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* Period 4: Año */}
                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-205 block">Este Año</span>
                    <span className="text-[10px] text-slate-500 block font-mono">Ejercicio Fiscal: Año 2026</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadReportPDF('año')}
                      disabled={exportLoading !== null}
                      className="bg-emerald-950 border border-emerald-900/80 hover:bg-emerald-900 hover:border-emerald-700/80 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      {exportLoading === 'año' ? (
                        <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReportCSV('año')}
                      className="bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT: COMPREHENSIVE VIEW & SUPERVISORY LIST SEARCH */}
            <div className="xl:col-span-7 bg-slate-950 rounded-xl border border-slate-850 overflow-hidden shadow-xl space-y-4 p-5">
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4.5 h-4.5 text-blue-500" />
                    Listado de Citas (Inscripción Tardía)
                  </h4>
                  <span className="text-[10.5px] text-slate-500 block leading-none font-medium">
                    Gestione estados presenciales de solicitantes Pasados de Edad.
                  </span>
                </div>

                {/* Filters */}
                <div className="flex gap-2 items-center">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-900 border border-slate-750 text-slate-300 text-[11px] p-1.5 px-3 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold uppercase cursor-pointer"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Live Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por Nombre, ID, Cédula, Correo o Código Transacción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 pl-10 text-xs text-white focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-blue-600 font-medium placeholder-slate-600"
                />
              </div>

              {/* RESULT TABLE CITAS */}
              {filteredTardiaCitas.length === 0 ? (
                <div className="bg-slate-900/30 border border-dashed border-slate-800 p-16 rounded-lg text-center text-[11px] text-slate-500">
                  <Calendar className="w-10 h-10 text-slate-800 mx-auto mb-2" />
                  <span>No se encontraron citas de Inscripción Tardía con los criterios seleccionados.</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-900 rounded-lg">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900/60 text-[9px] font-black uppercase tracking-widest text-slate-450 border-b border-slate-800">
                        <th className="p-3">Cita / Fecha</th>
                        <th className="p-3">Solicitante</th>
                        <th className="p-3">Datos Contacto</th>
                        <th className="p-3 text-center">Estado actual</th>
                        <th className="p-3 text-right">Acciones Supervisor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-xs text-slate-350">
                      {filteredTardiaCitas.map(cita => {
                        const citizen = cita.datosPersonales;
                        const isRealizada = cita.estado === 'realizada';
                        const isCancelada = cita.estado === 'cancelada' || cita.estado === 'no_asistire';
                        const isConfirmada = !isRealizada && !isCancelada;

                        return (
                          <tr key={cita.id} className="hover:bg-slate-900/20 transition">
                            <td className="p-3 font-mono space-y-0.5">
                              <div className="text-[10px] text-slate-500">{cita.id}</div>
                              <div className="text-white font-bold">{cita.fecha}</div>
                              <div className="text-[10.5px] text-slate-400 font-extrabold">{cita.hora}</div>
                            </td>
                            <td className="p-3 font-semibold space-y-0.5">
                              <div className="text-white text-xs">{citizen.nombreCompleto || 'N/A'}</div>
                              <div className="text-slate-450 text-[10.5px] font-mono">{citizen.identificacion}</div>
                            </td>
                            <td className="p-3 font-mono text-[10px] space-y-0.5">
                              <div className="text-slate-400">{citizen.correo}</div>
                              <div className="text-slate-500">{citizen.telefono}</div>
                            </td>
                            <td className="p-3 text-center">
                              {isRealizada ? (
                                <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-900/50 text-[9px] font-black uppercase px-2.5 py-1 rounded">
                                  ✓ Realizada
                                </span>
                              ) : isCancelada ? (
                                <span className="bg-red-950/80 text-red-400 border border-red-900/50 text-[9px] font-black uppercase px-2.5 py-1 rounded">
                                  ✗ Cancelada
                                </span>
                              ) : (
                                <span className="bg-blue-950/80 text-blue-400 border border-blue-900/50 text-[9px] font-black uppercase px-2.5 py-1 rounded">
                                  Confirmada
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isRealizada && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCitaStatus(cita.id, 'realizada')}
                                    className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/20 hover:border-transparent transition flex items-center gap-0.5 cursor-pointer"
                                    title="Marcar Cita como Realizada"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Completar</span>
                                  </button>
                                )}
                                {!isCancelada && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`¿Está seguro de cancelar la cita del ciudadano ${citizen.nombreCompleto}?`)) {
                                        handleUpdateCitaStatus(cita.id, 'cancelada');
                                      }
                                    }}
                                    className="bg-red-650/10 hover:bg-red-650 text-red-505 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-red-550/20 hover:border-transparent transition flex items-center gap-0.5 cursor-pointer"
                                    title="Cancelar Cita"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Cancelar</span>
                                  </button>
                                )}
                                {(isRealizada || isCancelada) && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCitaStatus(cita.id, 'confirmada')}
                                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded text-[10px] font-bold border border-slate-750 transition flex items-center gap-0.5 cursor-pointer"
                                    title="Reestablecer a Confirmada (Reservada)"
                                  >
                                    <span>Reestablecer</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* VISTA 2: OPERATOR (adminpedad) */}
      {activePersona === 'adminpedad' && (
        <div className="space-y-6 animate-fade-in text-slate-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Create Tracking form */}
            <form onSubmit={handleGenerateExpediente} className="lg:col-span-5 bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 shadow-xl">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider border-b border-slate-900 pb-2 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                Nuevo Expediente Tardío
              </h4>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Nombre del Solicitante <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Aurelio Ismael Montenegro"
                    value={expName}
                    onChange={(e) => setExpName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Documento / ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 8-223-4556"
                      value={expIdentificacion}
                      onChange={(e) => setExpIdentificacion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      F. Nacimiento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={expFechaNacimiento}
                      onChange={(e) => setExpFechaNacimiento(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-1.5 rounded text-xs px-2 focus:outline-none focus:ring-1 focus:ring-blue-650 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Correo Electrónico <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={expCorreo}
                      onChange={(e) => setExpCorreo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Teléfono Móvil <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: 6605-4422"
                      value={expTelefono}
                      onChange={(e) => setExpTelefono(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Observaciones / Notas Internas
                  </label>
                  <textarea
                    placeholder="Notas opcionales del expediente tardío..."
                    value={expNotes}
                    rows={2}
                    onChange={(e) => setExpNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650 resize-none font-medium text-slate-300"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  Generar Expediente y Enlace
                </button>
              </div>
            </form>

            {/* Results feedback panel */}
            <div className="lg:col-span-7 space-y-4">
              {generatedExp ? (
                <div className="bg-slate-950 p-5 rounded-lg border border-blue-900/60 shadow-2xl relative overflow-hidden space-y-4 animate-fade-in">
                  <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
                    <Shield className="w-40 h-40 text-blue-500" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-900/30 pb-3 gap-2">
                    <span className="text-xs font-black uppercase text-slate-205 tracking-wider flex items-center gap-2">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                      Expediente Creado Exitosamente
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadTrackingPDF(generatedExp)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[10.5px] font-black uppercase tracking-wider px-3.5 py-1 py-1 rounded transition flex items-center gap-1.5 shadow-md cursor-pointer border border-amber-500"
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span>Descargar PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeneratedExp(null)}
                        className="text-slate-400 hover:text-white text-[10.5px] font-black uppercase px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 relative z-10">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-450 block">Código de Seguimiento Generado</span>
                      <div className="flex items-center gap-3 mt-1 bg-slate-900 p-2.5 rounded border border-slate-800">
                        <span className="text-base font-black text-blue-450 font-mono tracking-widest leading-none">
                          {generatedExp.number}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedExp.number);
                            setCopiedId(generatedExp.number);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="ml-auto bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white text-[10px] font-extrabold px-3 py-1 rounded transition flex items-center gap-1 border border-slate-700"
                        >
                          {copiedId === generatedExp.number ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar Código</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-450 block">Enlace Personalizado de Agendamiento</span>
                      <div className="flex items-center gap-3 mt-1 bg-slate-900 p-2.5 rounded border border-slate-800">
                        <span className="text-[11px] font-mono text-slate-300 truncate tracking-tight">
                          {generatedExp.link}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedExp.link);
                            setCopiedId(generatedExp.link);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="ml-auto bg-slate-800 hover:bg-slate-755 text-slate-355 hover:text-white text-[10px] font-extrabold px-3 py-1 rounded transition flex items-center gap-1 border border-slate-700 max-w-[120px] shrink-0"
                        >
                          {copiedId === generatedExp.link ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Link className="w-3 h-3" />
                              <span>Copiar Enlace</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-455 block mb-1">Kit de Mensajería para Remitir</span>
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-850 space-y-2 relative">
                        <pre className="text-[10.5px] font-sans text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {generatedExp.textMessage}
                        </pre>
                        <div className="border-t border-slate-800 pt-2.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedExp.textMessage);
                              setCopiedId('kit-' + generatedExp.number);
                              setTimeout(() => setCopiedId(null), 2050);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold uppercase tracking-wider px-4 py-1.5 rounded transition flex items-center gap-1.5 shadow"
                          >
                            {copiedId === 'kit-' + generatedExp.number ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                                <span>Kit Copiado</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Copiar Kit Completo</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-850 shadow-inner flex flex-col items-center justify-center text-center py-16 h-full min-h-[300px] text-slate-500">
                  <Shield className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">A la espera de generación</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Complete el formulario de la izquierda con los de su ciudadano e inicie la asignación de su número de filiación.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* SCHEDULE MANAGEMENT FORM */}
          {currentRole === 'super' && (
            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 shadow-xl">
              <div className="border-b border-slate-900 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                    Control de Horarios y Cupos (Inscripción Tardía)
                  </h4>
                </div>
                <span className="text-[9px] bg-blue-950 text-blue-400 border border-blue-900/60 px-2 py-0.5 rounded font-bold uppercase">
                  Planificación Activa: {tardiaCapacidadTotal} Citas por día
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed font-sans">
                Personalice los límites operativos, intervalos de reunión, hora de apertura, hora de cierre de la agenda para trámites de cédulas para ciudadanos Pasados de Edad. Standard: 4 citas por día de 8:00 AM a 11:30 AM con lapso de 30 min.
              </p>

              <form onSubmit={promptSaveTardiaConfig} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end pt-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Cupo Máximo Diario (Citas/Día)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={tardiaCapacidadTotal}
                    onChange={(e) => setTardiaCapacidadTotal(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Intervalo de Cita (Minutos)</label>
                  <select
                    value={tardiaIntervalo}
                    onChange={(e) => setTardiaIntervalo(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-semibold"
                  >
                    <option value="10">10 minutos</option>
                    <option value="15">15 minutos</option>
                    <option value="20">20 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">60 minutos</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Hora Apertura (Inicio)</label>
                  <select
                    value={tardiaHoraInicio}
                    onChange={(e) => setTardiaHoraInicio(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-medium text-slate-200 font-mono"
                  >
                    {['07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM'].map(time => (
                      <option key={`tardia-start-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-455 block">Hora Cierre (Límite)</label>
                  <select
                    value={tardiaHoraFin}
                    onChange={(e) => setTardiaHoraFin(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-medium text-slate-201 font-mono"
                  >
                    {['11:00 AM', '11:15 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'].map(time => (
                      <option key={`tardia-end-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2 py-5 px-6 rounded transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Guardar Planificación Tardía</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CONFIRMATION TIMING MODAL */}
          {showConfirmTardiaSave && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in font-sans">
              <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-100">
                <div className="flex items-center gap-3 border-b border-blue-500/20 pb-3 text-blue-400">
                  <AlertCircle className="w-6 h-6 shrink-0 text-blue-400" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-100">Confirmar Planificación Tardía</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                  ¿Está seguro de que desea aplicar estos cambos a la planificación de Inscripción Tardía? 
                  Los nuevos cupos diarios de **{tardiaCapacidadTotal} citas**, un intervalo de **{tardiaIntervalo} minutos** y el horario laborable regulado de **{tardiaHoraInicio} a {tardiaHoraFin}** se guardarán y entrarán en vigencia inmediatamente.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2 font-black">
                  <button
                    type="button"
                    onClick={() => setShowConfirmTardiaSave(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 border border-slate-700 rounded text-xs uppercase tracking-wide cursor-pointer transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={executeSaveTardiaConfig}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs uppercase tracking-wider shadow-md cursor-pointer transition"
                  >
                    Sí, Confirmar Planificación
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table history log of trackers */}
          <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shadow-xl">
            <div className="bg-slate-900/50 p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-350 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Historial de Seguimientos Autorizados ({historicalExp.length})
              </h4>
              {historicalExp.length > 0 && isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Está seguro de limpiar todo el historial local de expedientes autorizados? Esto no borrará las citas registradas.')) {
                      setHistoricalExp([]);
                      localStorage.removeItem('te_panama_historical_expedientes');
                    }
                  }}
                  className="text-red-450 hover:text-red-350 text-[10px] font-black uppercase tracking-wider hover:underline cursor-pointer"
                >
                  Limpiar Historial
                </button>
              )}
            </div>

            {historicalExp.length === 0 ? (
              <div className="p-10 text-center text-[11px] text-slate-500 font-medium">
                No se han generado expedientes tardíos en esta sesión local de oficialía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-450 border-b border-slate-800">
                      <th className="p-3 w-16 border-b border-slate-800">Fecha</th>
                      <th className="p-3 w-40 border-b border-slate-800">N° Seguimiento</th>
                      <th className="p-3 w-44 border-b border-slate-800">Solicitante</th>
                      <th className="p-3 w-28 border-b border-slate-800">Documento / ID</th>
                      <th className="p-3 w-32 border-b border-slate-800">Contacto</th>
                      <th className="p-3 text-right border-b border-slate-800">Acciones de Remisión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs text-slate-330">
                    {historicalExp.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/40 border-b border-slate-850/50">
                        <td className="p-3 text-[10px] font-mono text-slate-450">
                          {rec.fechaCreacion ? rec.fechaCreacion.substring(0, 10) : '2026-05-27'}
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-black text-blue-450 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/30">
                            {rec.number}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-200">
                          {rec.citizenName}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {rec.identificacion}
                        </td>
                        <td className="p-3 font-mono text-[10px] space-y-0.5">
                          <div className="text-slate-350">{rec.correo}</div>
                          <div className="text-slate-450">{rec.telefono}</div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadTrackingPDF(rec)}
                              className="bg-amber-955/40 hover:bg-amber-900/50 text-[10px] font-bold px-2 py-1 rounded transition text-amber-500 hover:text-amber-400 border border-amber-900/40 flex items-center gap-1 cursor-pointer"
                              title="Descargar Constancia Oficial en PDF"
                            >
                              <Download className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(rec.directLink);
                                setCopiedId('link-' + rec.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-[10px] font-bold px-2 py-1 rounded transition text-slate-300 border border-slate-750 flex items-center gap-1 cursor-pointer"
                              title="Copiar solo el enlace de cita"
                            >
                              {copiedId === 'link-' + rec.id ? (
                                <span className="text-emerald-500 font-extrabold flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Enlace!</span>
                              ) : (
                                <><Link className="w-3 h-3 text-slate-450" /> Enlace</>
                              )}
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(rec.textMessage);
                                setCopiedId('kit-' + rec.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="bg-blue-955/40 hover:bg-blue-900/50 text-[10px] font-bold px-2 py-1 rounded transition text-blue-300 border border-blue-900/40 flex items-center gap-1 cursor-pointer"
                              title="Copiar kit de mensaje completo para enviar"
                            >
                              {copiedId === 'kit-' + rec.id ? (
                                <span className="text-emerald-450 font-extrabold flex items-center gap-0.5"><CheckCircle className="w-3 h-3 text-emerald-500" /> Kit!</span>
                              ) : (
                                <><Share2 className="w-3 h-3 text-blue-400" /> Kit</>
                              )}
                            </button>

                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('¿Está seguro de eliminar este registro del historial local de seguimientos?')) {
                                    const filtered = historicalExp.filter((e: any) => e.id !== rec.id);
                                    setHistoricalExp(filtered);
                                    localStorage.setItem('te_panama_historical_expedientes', JSON.stringify(filtered));
                                  }
                                }}
                                className="bg-red-950/40 hover:bg-red-900/50 text-red-500 hover:text-red-400 border border-red-900/40 p-1 rounded transition cursor-pointer"
                                title="Eliminar del Historial"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
