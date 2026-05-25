export type TipoIdentificacion = 'Cedula' | 'CedulaJuvenil' | 'Extranjero' | 'Pasaporte';

export interface DatosPersonales {
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  fechaNacimiento: string;
  telefono: string;
  correo: string;
  numeroSeguimiento?: string;
}

export type ServicioCategoriaId = 'extranjeria' | 'organizacion_electoral' | 'cedulacion' | 'registro_civil' | 'panamenos_extranjero';

export interface SubServicio {
  id: string;
  nombre: string;
  descripcion: string;
  requisitos: string[];
}

export interface CategoriaServicio {
  id: ServicioCategoriaId;
  nombre: string;
  descripcion: string;
  icono: string;
  subServicios: SubServicio[];
}

export interface Sucursal {
  id: string;
  provincia: string;
  nombre: string;
  direccion: string;
  telefono: string;
  horario: string;
}

export interface Cita {
  id: string; // TE-YYYYMMDD-XXXX
  datosPersonales: DatosPersonales;
  servicioCategoria: ServicioCategoriaId;
  subServicioId: string;
  sucursalId: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
  codigoTransaccion: string;
  fechaCreacion: string;
  estado: 'confirmada' | 'cancelada' | 'asistire' | 'no_asistire';
}

export interface ExtranjeriaRecord {
  pasaporte: string;
  nombre: string;
  nacionalidad?: string;
  elegible: boolean;
  motivo: string;
}

export type AdminRole = 'sencillo' | 'super' | 'extranjeria' | 'pasado_edad';

