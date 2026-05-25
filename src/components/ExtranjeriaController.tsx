import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Search, 
  Trash2, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  UserPlus, 
  Globe, 
  Clipboard, 
  Check, 
  FileText,
  Edit,
  Clock
} from 'lucide-react';
import { ExtranjeriaRecord, AdminRole } from '../types';

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
  const [records, setRecords] = useState<ExtranjeriaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });

  // Paste CSV textbox states
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedCSV, setPastedCSV] = useState('');

  // Drag and Drop State
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Creation form states
  const [showManualForm, setShowManualForm] = useState(false);
  const [formPasaporte, setFormPasaporte] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formNacionalidad, setFormNacionalidad] = useState('');
  const [formElegible, setFormElegible] = useState<boolean>(true);
  const [formMotivo, setFormMotivo] = useState('');
  const [editingRecordIdx, setEditingRecordIdx] = useState<number | null>(null);

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

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole === 'sencillo') {
      showStatus('Operación denegada. Solo personal de Inmigración/Admin puede configurar la capacidad.', 'error');
      return;
    }
    
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

  // Fetch listed passports
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/extranjeria/list');
      const data = await response.json();
      if (data && data.success) {
        setRecords(data.records);
      } else {
        showStatus('Error al cargar pasaportes del servidor.', 'error');
      }
    } catch (e) {
      console.error(e);
      showStatus('Error de conexión con el servicio de Extranjería.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();

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
          
          // Sync with localstorage too
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
    }, 6050);
  };

  // CSV parsing function
  const parseCSV = (text: string): ExtranjeriaRecord[] => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];

    // Analyze first line as headers
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';
    const parsed: ExtranjeriaRecord[] = [];
    const headers = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/["']/g, ''));

    // Check mapping index
    let pIdx = headers.findIndex(h => h.includes('pasaporte') || h.includes('passport') || h.includes('doc') || h.includes('id') || h.includes('numero'));
    let nIdx = headers.findIndex(h => h.includes('nombre') || h.includes('name') || h.includes('ciudadano'));
    let nacIdx = headers.findIndex(h => h.includes('nacion') || h.includes('country') || h.includes('pais'));
    let eIdx = headers.findIndex(h => h.includes('elegible') || h.includes('eligible') || h.includes('apto') || h.includes('pasa') || h.includes('estatus') || h.includes('verificacion'));
    let mIdx = headers.findIndex(h => h.includes('motivo') || h.includes('reason') || h.includes('coment') || h.includes('obs') || h.includes('detalle'));

    // Default column index mapping as fallback
    if (pIdx === -1) pIdx = 0;
    if (nIdx === -1) nIdx = 1;
    if (nacIdx === -1) nacIdx = 2;
    if (eIdx === -1) eIdx = 3;
    if (mIdx === -1) mIdx = 4;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple quoted CSV parser split
      const columns: string[] = [];
      let currentVal = '';
      let insideQuote = false;
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === separator && !insideQuote) {
          columns.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      columns.push(currentVal.trim());

      const pasaporte = columns[pIdx] ? columns[pIdx].toUpperCase() : '';
      const nombre = columns[nIdx] || 'No Registrado';
      const nacionalidad = columns[nacIdx] || 'Extranjero';
      const rawElegible = columns[eIdx] ? columns[eIdx].toLowerCase() : '';
      const elegible = rawElegible === 'si' || rawElegible === 'sí' || rawElegible === 'true' || rawElegible === '1' || rawElegible === 'aprobado' || rawElegible === 'ok' || rawElegible === '';
      const motivo = columns[mIdx] || (elegible ? 'Estatus migratorio autorizado.' : 'Estatus migratorio requiere revisión.');

      if (pasaporte) {
        parsed.push({
          pasaporte,
          nombre,
          nacionalidad,
          elegible,
          motivo
        });
      }
    }
    return parsed;
  };

  // Submit list to server
  const uploadRecords = async (recordsToUpload: ExtranjeriaRecord[]) => {
    if (currentRole === 'sencillo') {
      showStatus('Operación denegada. Su perfil de Admin Sencillo no tiene permisos para cargar información.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/extranjeria/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recordsToUpload })
      });
      const data = await response.json();
      if (data && data.success) {
        setRecords(data.records);
        showStatus(`¡Carga exitosa! Se han procesado e importado ${data.count} registros de pasaportes.`, 'success');
        setPastedCSV('');
        setShowPasteArea(false);
      } else {
        showStatus(`Error al guardar registros: ${data.error || 'Intente nuevamente'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      showStatus('Ocurrió un error al enviar el dataset de Extranjería al servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedCSV.trim()) {
      showStatus('Por favor pegue texto CSV válido primero.', 'error');
      return;
    }
    try {
      const parsed = parseCSV(pastedCSV);
      if (parsed.length === 0) {
        showStatus('No se detectaron filas correspondientes en el bloque de texto.', 'error');
        return;
      }
      uploadRecords(parsed);
    } catch (e: any) {
      showStatus(`Error al parsear el CSV manual: ${e.message}`, 'error');
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      showStatus('Formato no soportado. Debe ingresar un archivo de extensión CSV o de texto plano delimitado (.csv, .txt)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        try {
          const parsed = parseCSV(text);
          if (parsed.length === 0) {
            showStatus('El archivo CSV seleccionado parece estar vacío o carecer de formato.', 'error');
            return;
          }
          uploadRecords(parsed);
        } catch (err: any) {
          showStatus(`Surgió un inconveniente de parseo: ${err.message}`, 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  // Manual record operations
  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole === 'sencillo') {
      showStatus('Operación denegada. Solo personal de Inmigración/Admin puede registrar pasaportes manualmente.', 'error');
      return;
    }

    if (!formPasaporte.trim() || !formNombre.trim()) {
      showStatus('Los campos de Pasaporte y Nombre son de carácter obligatorio.', 'error');
      return;
    }

    const rec: ExtranjeriaRecord = {
      pasaporte: formPasaporte.trim().toUpperCase(),
      nombre: formNombre.trim(),
      nacionalidad: formNacionalidad.trim() || 'No especificada',
      elegible: formElegible,
      motivo: formMotivo.trim() || (formElegible ? 'Trámite de Extranjería Autorizado.' : 'Estatus migratorio en revisión.')
    };

    let updatedList: ExtranjeriaRecord[] = [];
    if (editingRecordIdx !== null) {
      // Edit mode
      updatedList = [...records];
      updatedList[editingRecordIdx] = rec;
      showStatus('Registro de pasaporte actualizado con éxito.', 'success');
    } else {
      // Insertion mode
      // Remove duplicates
      updatedList = records.filter(r => r.pasaporte !== rec.pasaporte);
      updatedList.unshift(rec);
      showStatus(`Pasaporte ${rec.pasaporte} registrado de forma manual y colocado al inicio de la base.`, 'success');
    }

    setFormPasaporte('');
    setFormNombre('');
    setFormNacionalidad('');
    setFormElegible(true);
    setFormMotivo('');
    setEditingRecordIdx(null);
    setShowManualForm(false);
    
    // Save
    uploadRecords(updatedList);
  };

  const handleEditRecord = (rec: ExtranjeriaRecord, idx: number) => {
    if (currentRole === 'sencillo') {
      showStatus('Su perfil es de Solo Lectura. No puede modificar registros.', 'error');
      return;
    }
    setFormPasaporte(rec.pasaporte);
    setFormNombre(rec.nombre);
    setFormNacionalidad(rec.nacionalidad || '');
    setFormElegible(rec.elegible);
    setFormMotivo(rec.motivo);
    setEditingRecordIdx(idx);
    setShowManualForm(true);
    setShowPasteArea(false);
  };

  const handleDeleteRecord = (pasaporteToDelete: string) => {
    if (currentRole === 'sencillo') {
      showStatus('Operación denegada. Permisos de borrado insuficientes.', 'error');
      return;
    }
    if (confirm(`¿Seguro que desea remover el pasaporte ${pasaporteToDelete} de la lista de elegibilidad?`)) {
      const updated = records.filter(r => r.pasaporte !== pasaporteToDelete);
      uploadRecords(updated);
    }
  };

  const handleDemoPasteSet = () => {
    const demoText = `pasaporte,nombre,nacionalidad,elegible,motivo
PA-PAN-904231,Alexander Volkov,Rusia,si,Permiso transitorio residencial aprobado (Nro: 1042-2026).
PA-CAN-551234,Chloe Leblanc,Canadá,no,Falta de pago de sellos oficiales e impuestos de fianza de deportación.
PA-COL-990023,Julio Cesar Beltran,Colombia,si,Estatus regularizado de Países Amigos. Habilitado para huellas.
PA-VEN-412351,Yandry Jose Sanchez,Venezuela,no,Multa de sobre-estadía activa. Diríjase a Caja General para pago.
PA-USA-112233,Sarah Michelle Connor,Estados Unidos,si,Residente calificada por Convenio de Jubilados.`;
    setPastedCSV(demoText);
  };

  // Filter records
  const filteredRecords = records.filter(rec => {
    const query = searchQuery.toLowerCase();
    return (
      rec.pasaporte.toLowerCase().includes(query) ||
      rec.nombre.toLowerCase().includes(query) ||
      (rec.nacionalidad && rec.nacionalidad.toLowerCase().includes(query)) ||
      rec.motivo.toLowerCase().includes(query)
    );
  });

  return (
    <div id="extranjeria-controller-root" className="space-y-6 text-slate-100 font-sans">
      
      {/* STATUS BANNER */}
      {statusMessage.text && (
        <div className={`p-3.5 rounded border text-xs font-semibold flex items-center gap-2.5 animate-fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800' 
            : statusMessage.type === 'error'
              ? 'bg-red-950/90 text-red-300 border-red-900'
              : 'bg-slate-900 text-slate-300 border-slate-750'
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

      {/* ADMIN CONTROLS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: FILE CARDS AND MANUAL REGISTER */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* DRAG & DROP LOADER PANEL */}
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Importación Masiva (CSV)</h4>
            
            {currentRole === 'sencillo' ? (
              <div className="bg-slate-900 p-4 rounded text-center border border-slate-800 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-550 mx-auto" />
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Su cuenta no cuenta con permisos de carga masiva de datos migratorios. Cambie su perfil a <strong className="text-amber-400">ADMIN MIGRACIÓN</strong> para subir listados CSV.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div 
                  className={`border-2 border-dashed rounded-lg p-5 text-center transition-all duration-300 cursor-pointer ${
                    dragActive 
                      ? 'border-amber-400 bg-amber-950/10' 
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileInputChange} 
                    accept=".csv,.txt"
                  />
                  <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce-subtle" />
                  <span className="text-[11px] font-extrabold text-slate-200 block uppercase tracking-wider">Arrastre su Archivo de Citas</span>
                  <span className="text-[10px] text-slate-450 block mt-1 leading-tight">Soporta formatos CSV de texto delimitado por comas o punto y coma (.csv, .txt)</span>
                  <span className="inline-block mt-3 bg-slate-850 hover:bg-slate-800 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded border border-slate-750 text-slate-200 transition">
                    Seleccionar Archivo
                  </span>
                </div>

                {/* PASTE PLAIN TEXT EXPANDABLE */}
                <div className="border border-slate-850 rounded">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasteArea(!showPasteArea);
                      setEditingRecordIdx(null);
                    }}
                    className="w-full bg-slate-900 py-2.5 px-3.5 flex items-center justify-between text-left transition hover:bg-slate-850 cursor-pointer text-slate-350"
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-300">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      Pegar Contenido CSV Delimitado
                    </span>
                    <span className="text-xs text-slate-500 font-bold">{showPasteArea ? 'Ocultar ▲' : 'Mostrar ▼'}</span>
                  </button>

                  {showPasteArea && (
                    <div className="p-3 bg-slate-900/80 border-t border-slate-850 space-y-3 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-mono tracking-widest uppercase text-slate-400">Separador automático detectado</span>
                        <button
                          type="button"
                          onClick={handleDemoPasteSet}
                          className="text-[9px] font-extrabold text-blue-400 hover:underline hover:text-blue-300 transition"
                        >
                          Pegar Plantilla de Ejemplo
                        </button>
                      </div>
                      <textarea
                        rows={6}
                        placeholder="pasaporte,nombre,nacionalidad,elegible,motivo&#10;PA100AA,John Doe,Estados Unidos,si,Ingreso Regular aprobado.&#10;PA500BB,Marie Curie,Francia,no,Requiere entrevista especial."
                        value={pastedCSV}
                        onChange={(e) => setPastedCSV(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-[10px] font-mono p-2 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handlePasteSubmit}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-1.5 rounded transition shadow-md"
                      >
                        Validar y Cargar Texto Pegado
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SCHEDULING CAPACITY CONTROL (Extranjería Special) */}
          <div className="bg-slate-950 rounded-lg border border-slate-805 p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Control Operativo de Citas de Extranjería</span>
            </h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Configure los límites de usuarios simultáneos, intervalos de consultas, y el horario de inicio/fin aplicable para toda reserva migratoria.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Cupos por Slot</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={capacidad}
                    onChange={(e) => setCapacidad(parseInt(e.target.value, 10) || 1)}
                    disabled={currentRole === 'sencillo'}
                    className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Intervalo (Minutos)</label>
                  <select
                    value={intervalo}
                    onChange={(e) => setIntervalo(parseInt(e.target.value, 10))}
                    disabled={currentRole === 'sencillo'}
                    className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-mono"
                  >
                    <option value="10">10 minutos</option>
                    <option value="15">15 minutos</option>
                    <option value="20">20 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">60 minutos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Hora Inicio</label>
                  <select
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    disabled={currentRole === 'sencillo'}
                    className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none"
                  >
                    {SELECT_TIMES_OPTIONS.map(time => (
                      <option key={`start-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Hora Fin (Cierre)</label>
                  <select
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    disabled={currentRole === 'sencillo'}
                    className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none"
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
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2 rounded transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Guardar Parámetros de Citas</span>
              </button>
            </form>
          </div>

          {/* MANUAL REGISTRATION FORM */}
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {editingRecordIdx !== null ? 'Modificar Pasaporte' : 'Registro Individual Manual'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowManualForm(!showManualForm);
                  setEditingRecordIdx(null);
                  setFormPasaporte('');
                  setFormNombre('');
                  setFormNacionalidad('');
                  setFormElegible(true);
                  setFormMotivo('');
                }}
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition border ${
                  showManualForm 
                    ? 'bg-red-950/80 text-red-400 border-red-900/40 hover:bg-red-900/30'
                    : 'bg-blue-950/80 text-blue-400 border-blue-900/40 hover:bg-blue-900/30'
                }`}
              >
                {showManualForm ? 'Cancelar' : 'Habilitar Formulario'}
              </button>
            </div>

            {showManualForm && (
              <form onSubmit={handleManualFormSubmit} className="space-y-3.5 pt-1 animate-fade-in font-sans">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Número de Pasaporte</label>
                  <input
                    type="text"
                    disabled={editingRecordIdx !== null} // cannot edit passport key index
                    placeholder="Ejemplo: PA541249"
                    value={formPasaporte}
                    onChange={(e) => setFormPasaporte(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono uppercase disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Nombre Completo del Ciudadano</label>
                  <input
                    type="text"
                    placeholder="Ejemplo: Jin Kazama"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-755 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Nacionalidad</label>
                    <input
                      type="text"
                      placeholder="Ej: Canadá"
                      value={formNacionalidad}
                      onChange={(e) => setFormNacionalidad(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-755 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Estatus Elegibilidad</label>
                    <select
                      value={formElegible ? "si" : "no"}
                      onChange={(e) => setFormElegible(e.target.value === "si")}
                      className="w-full bg-slate-900 border border-slate-755 text-white p-2 rounded text-xs cursor-pointer focus:outline-none"
                    >
                      <option value="si">✓ Sí - AUTORIZADO (Elegible)</option>
                      <option value="no">✗ No - SUSPENDIDO (Inhabilitado)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Observaciones / Motivo de Elegibilidad</label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Resolución SNM aprobada. Listo para toma fotográfica."
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-755 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={currentRole === 'sencillo'}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2 rounded transition shadow-md disabled:opacity-50"
                >
                  {editingRecordIdx !== null ? 'Actualizar Registro Pasaporte' : 'Registrar y Sincronizar Pasaporte'}
                </button>
              </form>
            )}
          </div>

          {/* STRUCTURAL REQUIREMENTS SCHEMATIC SPECIFICATION BOX */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 text-[11px] text-slate-400">
            <h5 className="font-extrabold uppercase text-slate-300 text-[10px] tracking-wide flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              Especificación CSV de Extranjería
            </h5>
            <p className="leading-relaxed">
              La cabecera del archivo CSV subido debe incluir por lo menos columnas etiquetadas con los nombres correspondientes de:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-450 font-mono text-[10px]">
              <li><strong className="text-slate-300">pasaporte</strong> (Clave única)</li>
              <li><strong className="text-slate-300">nombre</strong> (Nombre y apellido)</li>
              <li><strong className="text-slate-300">nacionalidad</strong> (País de procedencia)</li>
              <li><strong className="text-slate-300">elegible</strong> ("si" / "no", "true" / "false")</li>
              <li><strong className="text-slate-300">motivo</strong> (Texto explicativo para el usuario)</li>
            </ul>
          </div>

        </div>

        {/* RIGHT COLUMN: SEARCHABLE TABLE OF REGISTERED FOREIGNERS */}
        <div className="lg:col-span-7 bg-slate-950 rounded-lg border border-slate-800 p-5 flex flex-col space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span>Registros del Servidor</span>
                <span className="bg-slate-900 border border-slate-750 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {records.length}
                </span>
              </h4>
              <p className="text-[10px] text-slate-450 font-medium">Historial registrado en extranjeria-db.json</p>
            </div>
            
            <button
              onClick={fetchRecords}
              className="text-slate-400 hover:text-white transition bg-slate-900 hover:bg-slate-850 p-2 rounded border border-slate-750 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide cursor-pointer"
              title="Refrescar listado"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
          </div>

          {/* TABLE QUERY SEARCH */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por pasaporte, nombre, nacionalidad, observaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded text-xs pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
            />
          </div>

          {/* TABLE VIEW */}
          <div className="flex-1 overflow-x-auto min-h-[300px] border border-slate-850 rounded">
            {loading && records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2 text-slate-400">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs font-semibold uppercase tracking-wider">Cargando base de migración...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2 text-slate-400">
                <AlertCircle className="w-8 h-8 text-slate-600" />
                <span className="text-xs font-semibold uppercase tracking-wider">Sin coincidencias</span>
                <p className="text-[10px] text-slate-500 text-center max-w-xs leading-relaxed">
                  No se localizaron pasaportes con el patrón ingresado o la base de datos se encuentra vacía.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono">
                    <th className="p-3 w-32">Pasaporte</th>
                    <th className="p-3">Datos del Ciudadano</th>
                    <th className="p-3 w-28 text-center font-sans uppercase">Habilitado</th>
                    <th className="p-3 w-20 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredRecords.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60 transition duration-150">
                      <td className="p-3 font-mono font-bold tracking-wider text-amber-400 uppercase">
                        {rec.pasaporte}
                      </td>
                      <td className="p-3 space-y-1">
                        <div className="font-bold text-slate-200">{rec.nombre}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-450 leading-relaxed font-semibold">
                          <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{rec.nacionalidad || 'Desconocida'}</span>
                          <span className="text-slate-650">•</span>
                          <span className="text-[10px] text-slate-500 italic max-w-xs truncate" title={rec.motivo}>
                            {rec.motivo}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          rec.elegible 
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-900/50' 
                            : 'bg-red-950 text-red-300 border-red-900/50'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rec.elegible ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
                          {rec.elegible ? 'SÍ (RESERVA)' : 'NO / DETENER'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditRecord(rec, idx)}
                            disabled={currentRole === 'sencillo'}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition cursor-pointer disabled:opacity-40"
                            title="Editar pasaporte"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec.pasaporte)}
                            disabled={currentRole === 'sencillo'}
                            className="p-1 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded transition cursor-pointer disabled:opacity-40"
                            title="Remover de la base"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* STATISTICS OVERVIEW FOOTER */}
          <div className="grid grid-cols-3 gap-3 bg-slate-900 p-3 rounded border border-slate-850 text-center text-xs">
            <div>
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide block">Habilitados</span>
              <span className="text-sm font-black text-emerald-400">{records.filter(r => r.elegible).length}</span>
            </div>
            <div className="border-x border-slate-800">
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide block">Suspendidos</span>
              <span className="text-sm font-black text-red-400">{records.filter(r => !r.elegible).length}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide block">Total Base</span>
              <span className="text-sm font-black text-white">{records.length}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
