import React, { useState } from 'react';
import { ServicioCategoriaId, CategoriaServicio } from '../types';
import { SERVICIOS_TRIBUNAL } from '../data';
import { IdCard, FileText, Globe, Vote, ClipboardCheck, Info, ArrowLeft, ArrowRight, CornerDownRight, Plane } from 'lucide-react';

interface SeleccionServicioProps {
  selectedCategoria: ServicioCategoriaId | null;
  selectedSubServicioId: string | null;
  onBack?: () => void;
  onSelect: (categoria: ServicioCategoriaId, subServicioId: string) => void;
}

// Map icon string to Lucide component
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
  const [activeCat, setActiveCat] = useState<ServicioCategoriaId | null>(selectedCategoria);
  const [activeSub, setActiveSub] = useState<string | null>(selectedSubServicioId);

  const handleCategoryClick = (catId: ServicioCategoriaId) => {
    setActiveCat(catId);
    setActiveSub(null); // Reset sub-service on category change
  };

  const currentCategory = SERVICIOS_TRIBUNAL.find((c) => c.id === activeCat);
  const currentSubService = currentCategory?.subServicios.find((s) => s.id === activeSub);

  const handleNextSubmit = () => {
    if (activeCat && activeSub) {
      onSelect(activeCat, activeSub);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer border border-slate-200"
            title="Regresar al paso anterior"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Selección de Trámite o Servicio</h3>
          <p className="text-xs text-slate-500 font-medium">
            Elija la categoría y luego el trámite específico para el cual requiere programar su cita.
          </p>
        </div>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SERVICIOS_TRIBUNAL.map((cat) => {
          const isSelected = activeCat === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between h-full bg-white ${
                isSelected
                  ? 'border-blue-700 ring-2 ring-blue-700/10 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="space-y-3">
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {renderIcon(cat.icono, 'w-6 h-6')}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase">{cat.nombre}</h4>
                  <p className="text-xs text-slate-500 leading-snug line-clamp-2 font-medium">{cat.descripcion}</p>
                </div>
              </div>
              <div className="pt-3 w-full border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] font-bold">
                <span className={isSelected ? 'text-blue-700' : 'text-slate-400'}>
                  {cat.subServicios.length} trámites
                </span>
                <span className={`transition-transform duration-200 ${isSelected ? 'translate-x-1 text-blue-700' : 'text-slate-400'}`}>
                  →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-procedures Listing */}
      {currentCategory && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6 space-y-5">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Seleccione el trámite específico para: <span className="text-blue-700 font-extrabold normal-case">{currentCategory.nombre}</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">Seleccione una de las siguientes opciones para su cita presencial.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* List left side */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {currentCategory.subServicios.map((sub) => {
                const isSelected = activeSub === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSub(sub.id)}
                    className={`w-full text-left p-3.5 rounded border transition-all cursor-pointer flex items-start gap-3 bg-white ${
                      isSelected
                        ? 'border-blue-700 bg-blue-50/20 shadow-sm ring-1 ring-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 p-1 rounded ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 leading-snug">{sub.nombre}</h5>
                      <p className="text-[11px] text-slate-500 leading-normal mt-0.5 line-clamp-1 font-medium">{sub.descripcion}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sub-service Requirements panel on Right side */}
            <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between shadow-sm min-h-[220px]">
              {currentSubService ? (
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-blue-800">
                      Detalles del Trámite Seleccionado
                    </h5>
                    <p className="text-xs font-bold text-slate-800 mt-1">{currentSubService.nombre}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1 font-medium">{currentSubService.descripcion}</p>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                      <Info className="w-3.5 h-3.5 text-blue-700" /> Requisitos obligatorios el día de la cita:
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-600 pl-4 list-disc leading-relaxed font-semibold">
                      {currentSubService.requisitos.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <ClipboardCheck className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
                  <p className="text-xs font-bold">Por favor, seleccione un trámite para ver sus requisitos obligatorios.</p>
                </div>
              )}

              {/* Fee notice at bottom */}
              {currentSubService && (
                <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-slate-400 italic font-medium">
                  Nota: Asegure cumplir con todos los requisitos listados para garantizar un procesamiento exitoso en ventanilla.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4 border-t border-slate-100">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto h-12 px-6 rounded border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-50 transition cursor-pointer text-center flex items-center justify-center"
          >
            Regresar
          </button>
        ) : (
          <div className="hidden sm:block"></div>
        )}

        <button
          type="button"
          onClick={handleNextSubmit}
          disabled={!activeCat || !activeSub}
          className={`w-full sm:w-auto h-12 font-bold px-8 rounded shadow-lg uppercase tracking-wider text-xs transition duration-150 flex items-center justify-center gap-2 ${
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
