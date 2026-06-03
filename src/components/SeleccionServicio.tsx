import React, { useState } from 'react';
import { ServicioCategoriaId, CategoriaServicio } from '../types';
import { SERVICIOS_TRIBUNAL } from '../data';
import { 
  IdCard, 
  FileText, 
  Globe, 
  Vote, 
  ClipboardCheck, 
  Info, 
  ArrowLeft, 
  ArrowRight, 
  CornerDownRight, 
  Plane, 
  Check, 
  HelpCircle,
  AlertTriangle 
} from 'lucide-react';

interface SeleccionServicioProps {
  selectedCategoria: ServicioCategoriaId | null;
  selectedSubServicioId: string | null;
  onBack?: () => void;
  onSelect: (categoria: ServicioCategoriaId, subServicioId: string) => void;
}

// Custom badges & descriptions based on Category IDs to look extremely realistic
const CATEGORY_META: Record<ServicioCategoriaId, { 
  themeColor: string;
  activeBorder: string;
  bgLight: string;
  textColor: string;
  pillColor: string;
  badgeText: string;
}> = {
  cedulacion: {
    themeColor: 'bg-indigo-600',
    activeBorder: 'border-indigo-600 ring-indigo-600/10 bg-indigo-50/5',
    bgLight: 'bg-indigo-50 text-indigo-700',
    textColor: 'text-indigo-900',
    pillColor: 'bg-indigo-100 text-indigo-800',
    badgeText: 'Dpto. de Cedulación'
  },
  registro_civil: {
    themeColor: 'bg-teal-600',
    activeBorder: 'border-teal-600 ring-teal-600/10 bg-teal-50/5',
    bgLight: 'bg-teal-50 text-teal-700',
    textColor: 'text-teal-900',
    pillColor: 'bg-teal-100 text-teal-800',
    badgeText: 'Registro Civil'
  },
  extranjeria: {
    themeColor: 'bg-amber-600',
    activeBorder: 'border-amber-600 ring-amber-600/10 bg-amber-50/5',
    bgLight: 'bg-amber-50 text-amber-700',
    textColor: 'text-amber-900',
    pillColor: 'bg-amber-100 text-amber-800',
    badgeText: 'Inmigración PE'
  },
  organizacion_electoral: {
    themeColor: 'bg-purple-600',
    activeBorder: 'border-purple-600 ring-purple-600/10 bg-purple-50/5',
    bgLight: 'bg-purple-50 text-purple-700',
    textColor: 'text-purple-900',
    pillColor: 'bg-purple-100 text-purple-800',
    badgeText: 'Org. Electoral'
  },
  panamenos_extranjero: {
    themeColor: 'bg-sky-600',
    activeBorder: 'border-sky-600 ring-sky-600/10 bg-sky-50/5',
    bgLight: 'bg-sky-50 text-sky-700',
    textColor: 'text-sky-900',
    pillColor: 'bg-sky-100 text-sky-800',
    badgeText: 'Panameños en Extranjero'
  }
};

const renderIcon = (iconName: string, className: string) => {
  switch (iconName) {
    case 'IdCard':
      return <IdCard className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'Vote':
      return <Vote className={className} />;
    case 'Plane':
      return <Plane className={className} />;
    default:
      return <ClipboardCheck className={className} />;
  }
};

export default function SeleccionServicio({
  selectedCategoria,
  selectedSubServicioId,
  onBack,
  onSelect,
}: SeleccionServicioProps) {
  const getSubServicesForCategory = (catId: ServicioCategoriaId): any[] => {
    const mainCat = SERVICIOS_TRIBUNAL.find(c => c.id === catId);
    if (!mainCat) return [];
    
    let list = [...mainCat.subServicios];
    
    if (catId === 'registro_civil') {
      const extPan = SERVICIOS_TRIBUNAL.find(c => c.id === 'panamenos_extranjero');
      if (extPan) {
        list = [...list, ...extPan.subServicios];
      }
    } else if (catId === 'cedulacion') {
      const ext = SERVICIOS_TRIBUNAL.find(c => c.id === 'extranjeria');
      if (ext) {
        list = [...list, ...ext.subServicios];
      }
    }
    
    return list;
  };

  const getInitialCategory = (cat: ServicioCategoriaId | null): ServicioCategoriaId | null => {
    if (!cat) return null;
    if (cat === 'extranjeria') return 'cedulacion';
    if (cat === 'panamenos_extranjero') return 'registro_civil';
    return cat;
  };

  const [activeCat, setActiveCat] = useState<ServicioCategoriaId | null>(getInitialCategory(selectedCategoria));
  const [activeSub, setActiveSub] = useState<string | null>(selectedSubServicioId);

  const handleCategoryClick = (catId: ServicioCategoriaId) => {
    setActiveCat(catId);
    setActiveSub(null); // Reset sub-service on category change
  };

  const currentCategory = SERVICIOS_TRIBUNAL.find((c) => c.id === activeCat);
  const subServicesList = activeCat ? getSubServicesForCategory(activeCat) : [];
  const currentSubService = subServicesList.find((s) => s.id === activeSub);

  const handleNextSubmit = () => {
    if (activeCat && activeSub) {
      let finalCat = activeCat;
      if (activeSub.startsWith('ext_')) {
        finalCat = 'extranjeria';
      } else if (activeSub.startsWith('pe_')) {
        finalCat = 'panamenos_extranjero';
      }
      onSelect(finalCat, activeSub);
    }
  };

  const getSubServicesCount = (catId: ServicioCategoriaId): number => {
    const mainCat = SERVICIOS_TRIBUNAL.find(c => c.id === catId);
    if (!mainCat) return 0;
    let count = mainCat.subServicios.length;
    if (catId === 'registro_civil') {
      const extPan = SERVICIOS_TRIBUNAL.find(c => c.id === 'panamenos_extranjero');
      if (extPan) count += extPan.subServicios.length;
    } else if (catId === 'cedulacion') {
      const ext = SERVICIOS_TRIBUNAL.find(c => c.id === 'extranjeria');
      if (ext) count += ext.subServicios.length;
    }
    return count;
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Heading */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-xl border border-blue-900/40">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-4 translate-x-4">
          <ClipboardCheck className="w-56 h-56 stroke-1" />
        </div>
        
        <div className="relative z-15 space-y-3">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-blue-400/20">
              Paso 1 de 3: Selección de Trámite
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] text-slate-300 font-medium">Buzón de Atención Presencial</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                ¿Qué trámite desea realizar hoy?
              </h2>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Seleccione la categoría institucional del Tribunal Electoral a continuación, y luego elija el trámite específico para habilitar su ficha de requisitos y programar su cita.
              </p>
            </div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="self-start md:self-center px-4 py-2 border border-slate-700/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition text-xs font-bold flex items-center gap-2 cursor-pointer bg-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Regresar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Categories - Modern Responsive Layout for 3 Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span>Categorías Gubernamentales</span>
            <span className="w-4 h-[1px] bg-slate-200"></span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Haga clic sobre una opción</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SERVICIOS_TRIBUNAL.filter(cat => ['registro_civil', 'cedulacion', 'organizacion_electoral'].includes(cat.id)).map((cat) => {
            const isSelected = activeCat === cat.id;
            const meta = CATEGORY_META[cat.id] || {
              themeColor: 'bg-blue-600',
              activeBorder: 'border-blue-600 ring-blue-600/10 shadow-sm bg-blue-50/5',
              bgLight: 'bg-blue-50 text-blue-700',
              textColor: 'text-slate-800',
              pillColor: 'bg-slate-100 text-slate-700',
              badgeText: 'Trámite'
            };

            const optionsCount = getSubServicesCount(cat.id);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`text-left p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md ${
                  isSelected
                    ? `${meta.activeBorder} ring-4 shadow-md scale-[1.02]`
                    : 'border-slate-100 bg-white hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Accent Color Strip when selected */}
                {isSelected && (
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${meta.themeColor}`} />
                )}

                <div className="space-y-4">
                  {/* Icon & Mini-badge */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                        isSelected ? `${meta.themeColor} text-white shadow-lg` : 'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}
                    >
                      {renderIcon(cat.icono, 'w-6 h-6')}
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${meta.bgLight}`}>
                      {meta.badgeText}
                    </span>
                  </div>

                  {/* Title & description */}
                  <div className="space-y-1">
                    <h4 className={`text-xs font-black tracking-wide uppercase ${isSelected ? meta.textColor : 'text-slate-700'}`}>
                      {cat.nombre}
                    </h4>
                    <p className="text-xs text-slate-500 leading-snug line-clamp-3 font-medium">
                      {cat.descripcion}
                    </p>
                  </div>
                </div>

                {/* Counter & Arrow Footer */}
                <div className="pt-3 w-full border-t border-slate-100/80 mt-4 flex items-center justify-between text-[11px] font-bold">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${isSelected ? meta.bgLight : 'bg-slate-50 text-slate-400'}`}>
                    {optionsCount} opciones
                  </span>
                  <span className={`transition-transform duration-300 ${isSelected ? 'translate-x-1.5 font-extrabold text-blue-700' : 'text-slate-300'}`}>
                    {isSelected ? '✓ Seleccionado' : 'Elegir →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-procedures Listing with unified styling */}
      {currentCategory && (
        <div className="animate-fade-in bg-slate-50 border border-slate-200/80 rounded-2xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-700"></span>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Trámites de {currentCategory.nombre}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Seleccione un procedimiento específico del listado izquierdo para consultar sus requisitos de atención y continuar con el agendamiento.
              </p>
            </div>
            
            {activeSub && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 self-start">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                Trámite listo para agendar
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List left side */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {subServicesList.map((sub) => {
                const isSelected = activeSub === sub.id;
                
                // Dynamic helper checks for realistic tags
                const isPaid = sub.requisitos.some(r => r.toLowerCase().includes('costo') || r.toLowerCase().includes('pago') || r.toLowerCase().includes('b/.'));
                const isJuvenilOrMenor = sub.id.includes('juvenil') || sub.nombre.toLowerCase().includes('menor');
                const isFirstTime = sub.id.includes('primera_vez') || sub.nombre.toLowerCase().includes('primera');
                const isPanamenoExt = sub.id.startsWith('pe_');
                const isExtranjeriaSub = sub.id.startsWith('ext_');

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSub(sub.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 relative ${
                      isSelected
                        ? 'border-blue-700 bg-white shadow-md ring-2 ring-blue-700/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Active highlight bar on left border */}
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-700 rounded-r" />
                    )}

                    <div className={`mt-0.5 p-1.5 rounded-lg border shrink-0 transition-all ${
                      isSelected 
                        ? 'bg-blue-700 text-white border-blue-800 shadow-sm' 
                        : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      <CornerDownRight className="w-4 h-4" />
                    </div>

                    <div className="space-y-1.5 flex-1 pr-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h5 className="text-xs font-extrabold text-slate-800 leading-snug">
                          {sub.nombre}
                        </h5>
                        
                        {/* Interactive dynamic tags */}
                        {isPaid ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/50">
                            Arancelado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                            Sin Costo / Regular
                          </span>
                        )}

                        {isJuvenilOrMenor && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200/50">
                            Menores de Edad
                          </span>
                        )}

                        {isFirstTime && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200/50">
                            Primera Vez
                          </span>
                        )}

                        {isPanamenoExt && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200/50">
                            Panameños en el Exterior
                          </span>
                        )}

                        {isExtranjeriaSub && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/50">
                            Extranjería PE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-normal font-medium line-clamp-2">
                        {sub.descripcion}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sub-service Requirements panel on Right side styled like an Official Sheet */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 md:p-6 flex flex-col justify-between shadow-sm min-h-[300px] relative overflow-hidden">
              {/* Soft decorative background element */}
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-slate-50 rounded-full blur-2xl pointer-events-none" />

              {currentSubService ? (
                <div className="space-y-5 relative z-10">
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Ficha Técnica del Trámite
                      </h5>
                    </div>
                    <p className="text-xs font-black text-slate-850 text-sm leading-snug">
                      {currentSubService.nombre}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1.5 font-medium">
                      {currentSubService.descripcion}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <span className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-wide uppercase">
                      <ClipboardCheck className="w-4 h-4 text-blue-700" /> 
                      Requisitos Necesarios:
                    </span>
                    
                    <div className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-4 space-y-3">
                      <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed font-semibold pl-1">
                        {currentSubService.requisitos.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px] border border-emerald-200">
                              ✓
                            </span>
                            <span className="flex-1">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-50/30 border border-blue-100/60 rounded-xl p-3.5 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-black text-blue-900 uppercase tracking-wide">
                        Información Adicional de Atención
                      </p>
                      <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5 font-medium">
                        Debe presentar toda la documentación en perfecto estado físico y original el día reservado. Su puntualidad es indispensable para mantener el orden de turnos en ventanilla.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                    <ClipboardCheck className="w-8 h-8 stroke-1 text-slate-400" />
                  </div>
                  <h6 className="text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
                    Visualizador de Requisitos
                  </h6>
                  <p className="text-xs font-medium text-slate-400 max-w-[280px] leading-relaxed">
                    Seleccione un trámite de la lista a su izquierda para revisar la documentación obligatoria que debe presentar el día de su cita.
                  </p>
                </div>
              )}

              {/* Fee notice at bottom */}
              {currentSubService && (
                <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="italic">
                    Nota: El trámite presencial es obligatorio e intransferible. Asegure cumplir con el perfil institucional solicitado.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-5 border-t border-slate-200">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto h-12 px-6 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-50 transition cursor-pointer text-center flex items-center justify-center gap-1 bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Regresar
          </button>
        ) : (
          <div className="hidden sm:block"></div>
        )}

        <button
          type="button"
          onClick={handleNextSubmit}
          disabled={!activeCat || !activeSub}
          className={`w-full sm:w-auto h-12 font-bold px-8 rounded-lg shadow-lg uppercase tracking-wider text-xs transition duration-150 flex items-center justify-center gap-2 ${
            activeCat && activeSub
              ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer shadow-blue-100'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Siguiente: Datos Personales</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
