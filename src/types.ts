export type TipoIdentificacion = 'Cedula' | 'CedulaJuvenil' | 'Extranjero' | 'Pasaporte';

export interface DatosPersonales {
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  fechaNacimiento: string;
  telefono: string;
  correo: string;
  nombreCompleto?: string;
  numeroSeguimiento?: string;
  // Campos específicos para el trámite de extranjería
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  pasaporte?: string;
  nacionalidad?: string;
  fechaResolucion?: string;
  numeroResolucion?: string;
  fechaVencimiento?: string;
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
  estado: 'confirmada' | 'cancelada' | 'asistire' | 'no_asistire' | 'realizada';
}

export interface ExtranjeriaRecord {
  pasaporte: string;
  nombre: string;
  nacionalidad?: string;
  elegible: boolean;
  motivo: string;
}

export type AdminRole = 'sencillo' | 'super' | 'extranjeria' | 'pasado_edad' | 'extranjeria_supervisor' | 'extranjeria_atencion' | 'extranjeria_cubiculo' | 'pasado_edad_supervisor' | 'pasado_edad_admin';

export interface AdminUser {
  username: string;
  password?: string;
  role: AdminRole;
  nombre: string;
  fechaCreacion: string;
}

export interface CmsConfig {
  siteTitle: string;
  siteSubtitle: string;
  logoUrl: string;
  primaryColor: string;
  customTexts: { [key: string]: string };
  sections: Array<{ id: string; name: string; description: string; icon?: string }>;
  pages: Array<{ id: string; title: string; slug: string; content: string; path?: string }>;
  images: Array<{ id: string; name: string; url: string; category?: string }>;
}


