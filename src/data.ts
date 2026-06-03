import { CategoriaServicio, Sucursal } from './types';

export const SERVICIOS_TRIBUNAL: CategoriaServicio[] = [
  {
    id: 'registro_civil',
    nombre: 'Registro Civil',
    descripcion: 'Certificados de nacimiento, matrimonio, defunción y otros trámites del estado civil de las personas.',
    icono: 'FileText',
    subServicios: [
      {
        id: 'rc_nacimiento',
        nombre: 'Certificado de Nacimiento (Con o Sin Timbres)',
        descripcion: 'Expedición de certificados oficiales para trámites escolares, legales o de viaje.',
        requisitos: [
          'Suministrar el número de cédula del titular o tomo, asiento y folio del nacimiento.',
          'Costo de B/. 3.00 (con timbres fiscales de uso común).',
          'Nombres completos de los padres.'
        ]
      },
      {
        id: 'rc_matrimonio',
        nombre: 'Certificado de Matrimonio',
        descripcion: 'Documento que certifica el enlace de matrimonio inscrito legalmente.',
        requisitos: [
          'Número de cédula de ambos contrayentes o tomo/folio de inscripción.',
          'Costo de B/. 3.00 para uso nacional. Para uso internacional debe ser autenticado.',
          'Fecha aproximada en que se celebró el acto.'
        ]
      },
      {
        id: 'rc_defuncion',
        nombre: 'Certificado de Defunción',
        descripcion: 'Expedición de actas para trámites legales de herencias o procesos luctuosos.',
        requisitos: [
          'Número de cédula del difunto y fecha exacta del deceso.',
          'Identificación del solicitante con cédula de identidad personal.',
          'Costo de B/. 3.00.'
        ]
      },
      {
        id: 'rc_inscripcion',
        nombre: 'Inscripción de Nacimiento / Matrimonio',
        descripcion: 'Registro oficial de un nuevo nacimiento o de un enlace matrimonial civil.',
        requisitos: [
          'Parte clínico del hospital/partera (para nacimientos).',
          'Acta matrimonial original de la notaría o juzgado.',
          'Cédulas vigentes de los padres o contrayentes.'
        ]
      }
    ]
  },
  {
    id: 'cedulacion',
    nombre: 'Cedulación',
    descripcion: 'Trámites relacionados con la obtención, renovación, y duplicados de cédulas de identidad personal.',
    icono: 'IdCard',
    subServicios: [
      {
        id: 'ced_primera_vez',
        nombre: 'Cédula por Primera Vez (Mayores de 18 años)',
        descripcion: 'Para ciudadanos panameños nacidos en el territorio nacional que alcanzan la mayoría de edad.',
        requisitos: [
          'Tener 18 años cumplidos.',
          'Cédula juvenil',
          'Presencia física del interesado.',
          'EVITA EL COLOR BLANCO: NO USES SUÉTERES, CAMISAS, BLUSAS NI BUFANDAS BLANCAS.',
          'EVITA ACCESORIOS EN EL ROSTRO: NO LLEVES GORRAS, SOMBREROS, LENTES OSCUROS NI PIERCINGS VISIBLES EN LA CARA.',
          'CABELLO DESPEJADO: ASEGÚRATE DE LLEVAR EL ROSTRO Y LAS CEJAS TOTALMENTE VISIBLES.'
        ]
      },
      {
        id: 'ced_renovacion',
        nombre: 'Renovación de Cédula',
        descripcion: 'Renovación de documento vencido o próximo a vencer.',
        requisitos: [
          'Presentar la cédula de identidad vencida o por vencer (6 meses antes).',
          'Vestimenta adecuada para la toma de fotografía (no hombros descubiertos, no blusas escotadas).',
          'Trámite gratuito para renovación regular.',
          'EVITA EL COLOR BLANCO: NO USES SUÉTERES, CAMISAS, BLUSAS NI BUFANDAS BLANCAS.',
          'EVITA ACCESORIOS EN EL ROSTRO: NO LLEVES GORRAS, SOMBREROS, LENTES OSCUROS NI PIERCINGS VISIBLES EN LA CARA.',
          'CABELLO DESPEJADO: ASEGÚRATE DE LLEVAR EL ROSTRO Y LAS CEJAS TOTALMENTE VISIBLES.'
        ]
      },
      {
        id: 'ced_duplicado',
        nombre: 'Duplicado de Cédula (Pérdida o Robo)',
        descripcion: 'Reposición del documento por pérdida, robo, hurto o deterioro.',
        requisitos: [
          'El costo es de B/. 35.00',
          'Denuncia de pérdida (opcional pero recomendada).',
          'Confirmación de datos biométricos en oficina.',
          'EVITA EL COLOR BLANCO: NO USES SUÉTERES, CAMISAS, BLUSAS NI BUFANDAS BLANCAS.',
          'EVITA ACCESORIOS EN EL ROSTRO: NO LLEVES GORRAS, SOMBREROS, LENTES OSCUROS NI PIERCINGS VISIBLES EN LA CARA.',
          'CABELLO DESPEJADO: ASEGÚRATE DE LLEVAR EL ROSTRO Y LAS CEJAS TOTALMENTE VISIBLES.'
        ]
      },
      {
        id: 'ced_juvenil_primera',
        nombre: 'Cédula Juvenil por Primera Vez',
        descripcion: 'Formulación y entrega de cédula de identidad para menores de edad por primera vez.',
        requisitos: [
          'Estar acompañado de por lo menos uno de los padres con su cédula vigente.',
          'Certificado de nacimiento del menor.',
          'El menor de edad debe estar presente física voluntariamente.',
          'EVITA EL COLOR BLANCO: NO USES SUÉTERES, CAMISAS, BLUSAS NI BUFANDAS BLANCAS.',
          'EVITA ACCESORIOS EN EL ROSTRO: NO LLEVES GORRAS, SOMBREROS, LENTES OSCUROS NI PIERCINGS VISIBLES EN LA CARA.',
          'CABELLO DESPEJADO: ASEGÚRATE DE LLEVAR EL ROSTRO Y LAS CEJAS TOTALMENTE VISIBLES.'
        ]
      },
      {
        id: 'ced_juvenil_renovacion',
        nombre: 'Cédula Juvenil Renovación',
        descripcion: 'Trámite de renovación para la cédula de identidad de menor de edad por vencimiento.',
        requisitos: [
          'Estar acompañado de uno de los padres con su cédula vigente.',
          'Presentar la cédula juvenil vencida o próxima a vencer.',
          'El menor de edad debe estar presente físicamente.',
          'EVITA EL COLOR BLANCO: NO USES SUÉTERES, CAMISAS, BLUSAS NI BUFANDAS BLANCAS.',
          'EVITA ACCESORIOS EN EL ROSTRO: NO LLEVES GORRAS, SOMBREROS, LENTES OSCUROS NI PIERCINGS VISIBLES EN LA CARA.',
          'CABELLO DESPEJADO: ASEGÚRATE DE LLEVAR EL ROSTRO Y LAS CEJAS TOTALMENTE VISIBLES.'
        ]
      },
      {
        id: 'ced_pasados_edad',
        nombre: 'Mayores de Edad No Cedulados (Pasados de Edad)',
        descripcion: 'Trámite de cedulación tardía para ciudadanos panameños nacidos en el territorio nacional que alcanzaron la mayoría de edad sin obtener su documento.',
        requisitos: [
          'Declaración jurada de dos (2) testigos panameños mayores de edad.',
          'Certificado de nacimiento expedido por el Registro Civil.',
          'Pruebas documentales de presencia física en el país (certificados de escuela, cartillas de vacunas, etc.).',
          'Presencia física del interesado con vestimenta formal y hombros cubiertos.'
        ]
      },
      {
        id: 'ced_extranjero_renovacion',
        nombre: 'Renovación de Cédula de Extranjero (PE)',
        descripcion: 'Trámite de renovación del documento de identidad personal para ciudadanos extranjeros residentes permanentes.',
        requisitos: [
          'Presentar la cédula de extranjero (PE) vencida o próxima a vencer.',
          'Certificado de estatus migratorio vigente, emitido por el Servicio Nacional de Migración.',
          'Pasaporte original vigente (copia completa certificada).',
          'Pago del costo del trámite en la sucursal del Tribunal Electoral.'
        ]
      },
      {
        id: 'ced_extranjero_duplicado_perdida',
        nombre: 'Duplicado de Cédula PE por Pérdida',
        descripcion: 'Reposición de la cédula de extranjero (PE) residente permanente debido a robo, extravío o deterioro.',
        requisitos: [
          'Denuncia formal registrada de pérdida o robo ante la DIJ.',
          'Copia de pasaporte vigente y resolución autorizada de residencia.',
          'Pago de arancel obligatorio por duplicado de extranjería (B/. 50.00).'
        ]
      }
    ]
  },
  {
    id: 'organizacion_electoral',
    nombre: 'Organización Electoral',
    descripcion: 'Cambios de residencia electoral, inscripciones a partidos políticos, y más.',
    icono: 'Vote',
    subServicios: [
      {
        id: 'oe_cambio_residencia',
        nombre: 'Cambio de Residencia Electoral',
        descripcion: 'Actualización del centro de votación asignado según su domicilio habitual real.',
        requisitos: [
          'Cédula de identidad personal vigente.',
          'Factura de servicio público (agua, luz, teléfono) o documento que demuestre la nueva dirección (Opcional).',
          'Someterse a declaración jurada de residencia electoral.'
        ]
      },
      {
        id: 'oe_afiliacion_partido',
        nombre: 'Afiliación a Partido Político',
        descripcion: 'Registro voluntario de pertenencia a un esquema de partido político oficialmente reconocido.',
        requisitos: [
          'Cédula de identidad personal panameña vigente.',
          'Estar en pleno goce de sus derechos políticos (no tener suspensiones vigentes).',
          'La afiliación es de character personal e indelegable.'
        ]
      },
      {
        id: 'oe_renuncia_partido',
        nombre: 'Renuncia a Partido Político',
        descripcion: 'Trámite para desafiliarse de un colectivo partidario y regresar a estado independiente.',
        requisitos: [
          'Cédula de identidad vigente.',
          'Presentar formulario de renuncia debidamente firmado en oficinas del TE.'
        ]
      }
    ]
  },
  {
    id: 'extranjeria',
    nombre: 'Trámites de Extranjería',
    descripcion: 'Procesamiento de cédulas de identidad para ciudadanos extranjeros (PE) y certificaciones.',
    icono: 'Globe',
    subServicios: [
      {
        id: 'ext_primera_vez',
        nombre: 'Carnet de residente permanente por primera vez',
        descripcion: 'Emisión del documento de identidad personal para extranjeros residentes permanentes.',
        requisitos: [
          'Nota de migración',
          'Fotocopia de carné de residente permanente',
          'Fotocopia de pasaporte',
          'B/. 100.00(en efectivo)',
          'EVITA EL COLOR BLANCO: NO USES SUÉTERES, CAMISAS, BLUSAS NI BUFANDAS BLANCAS.',
          'EVITA ACCESORIOS EN EL ROSTRO: NO LLEVES GORRAS, SOMBREROS, LENTES OSCUROS NI PIERCINGS VISIBLES EN LA CARA.',
          'CABELLO DESPEJADO: ASEGÚRATE DE LLEVAR EL ROSTRO Y LAS CEJAS TOTALMENTE VISIBLES.',
          'Tener cita programada y presentarse 15 minutos antes'
        ]
      }
    ]
  },
  {
    id: 'panamenos_extranjero',
    nombre: 'Trámite de Panameños en el Extranjero',
    descripcion: 'Inscripción de hechos vitales y trámites consulares de identidad para ciudadanos residentes en el exterior.',
    icono: 'Plane',
    subServicios: [
      {
        id: 'pe_nacimiento',
        nombre: 'Inscripción de Nacimiento en el Extranjero',
        descripcion: 'Registro de nacimiento para hijos de padre y/o madre panameños nacidos fuera del territorio nacional.',
        requisitos: [
          'Certificado de nacimiento original otorgado por el país extranjero, debidamente apostillado o legalizado.',
          'Cédula de identidad de origen o pasaportes vigentes del padre o la madre panameña.',
          'Copia simple del documento de identidad del menor.'
        ]
      },
      {
        id: 'pe_cedulacion',
        nombre: 'Cédula de Identidad en Oficinas Consulares',
        descripcion: 'Gestión y renovación de cédula de identidad a través de delegaciones diplomáticas y consulados de enlace.',
        requisitos: [
          'Presencia física obligatoria en el consulado panameño correspondiente.',
          'Suministrar número de cédula anterior o pasaporte panameño vigente.',
          'Formulario de validación biométrica consular firmado.'
        ]
      },
      {
        id: 'pe_matrimonio',
        nombre: 'Inscripción de Matrimonio celebrado en el Extranjero',
        descripcion: 'Registro oficial de matrimonios de ciudadanos panameños celebrados en el exterior.',
        requisitos: [
          'Certificado de matrimonio original extranjero apostillado o legalizado.',
          'Cédula de identidad vigente del cónyuge panameño.',
          'Traducción autorizada al español si el documento original fue emitido en otro idioma.'
        ]
      }
    ]
  }
];

export const SUCURSALES_TE: Sucursal[] = [
  {
    id: 'anc_main',
    provincia: 'Panamá',
    nombre: 'Tribunal Electoral de Panamá',
    direccion: 'Avenida Omar Torrijos Herrera, Ancón, frente a la terminal de Albrook, Ciudad de Panamá',
    telefono: '+507 507-8000',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'boc_office',
    provincia: 'Bocas del Toro',
    nombre: 'Dirección Regional de Bocas del Toro',
    direccion: 'Calle Principal, Isla Colón, Bocas del Toro',
    telefono: '+507 757-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'coc_office',
    provincia: 'Coclé',
    nombre: 'Dirección Regional de Coclé',
    direccion: 'Vía Interamericana, entrada de Penonomé, frente a Plaza Iguana, Coclé',
    telefono: '+507 997-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'col_office',
    provincia: 'Colón',
    nombre: 'Dirección Regional de Colón',
    direccion: 'Calle 11 y Avenida Roosevelt, Ciudad de Colón',
    telefono: '+507 433-8200',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'chi_office',
    provincia: 'Chiriquí',
    nombre: 'Dirección Regional de Chiriquí',
    direccion: 'Calle F Sur y Avenida 3ra Oeste, David, Chiriquí',
    telefono: '+507 728-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'dar_office',
    provincia: 'Darién',
    nombre: 'Dirección Regional de Darién',
    direccion: 'Metetí, Carretera Panamericana, Darién',
    telefono: '+507 299-6350',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'her_office',
    provincia: 'Herrera',
    nombre: 'Dirección Regional de Herrera',
    direccion: 'Avenida Melitón Martín, Chitré, Herrera',
    telefono: '+507 913-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'los_office',
    provincia: 'Los Santos',
    nombre: 'Dirección Regional de Los Santos',
    direccion: 'Vía Circunvalación, frente al Estadio Flaco Bala Hernández, Las Tablas',
    telefono: '+507 926-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'pac_office',
    provincia: 'Panamá Centro',
    nombre: 'Dirección Regional de Panamá Centro',
    direccion: 'Centro Comercial El Dorado, Vía Ricardo J. Alfaro, Planta Alta, Ciudad de Panamá',
    telefono: '+507 507-8100',
    horario: 'Martes a Sábado 9:00 AM - 5:00 PM'
  },
  {
    id: 'pan_office',
    provincia: 'Panamá Norte',
    nombre: 'Dirección Regional de Panamá Norte',
    direccion: 'Vía Transístmica, Centro Comercial Plaza Las Cumbres, Las Cumbres',
    telefono: '+507 507-8250',
    horario: 'Lunes a Viernes 8:00 AM - 4:00 PM'
  },
  {
    id: 'pae_office',
    provincia: 'Panamá Este',
    nombre: 'Dirección Regional de Panamá Este',
    direccion: 'Plaza Comercial El Cruce, Planta Alta, 24 de Diciembre',
    telefono: '+507 507-8280',
    horario: 'Lunes a Viernes 8:00 AM - 4:00 PM'
  },
  {
    id: 'pao_office',
    provincia: 'Panamá Oeste',
    nombre: 'Dirección Regional de Panamá Oeste',
    direccion: 'Avenida Las Américas, al lado del cuartel de bomberos, La Chorrera',
    telefono: '+507 507-8400',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'sm_office',
    provincia: 'San Miguelito',
    nombre: 'Dirección Regional de San Miguelito',
    direccion: 'Centro Comercial Los Andes, Centro de Servicios Gubernamentales, San Miguelito',
    telefono: '+507 507-8300',
    horario: 'Martes a Sábado 9:00 AM - 5:00 PM'
  },
  {
    id: 'ver_office',
    provincia: 'Veraguas',
    nombre: 'Dirección Regional de Veraguas',
    direccion: 'Avenida Héctor Alejandro Santacoloma, Santiago, Veraguas',
    telefono: '+507 950-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'gun_office',
    provincia: 'Guna Yala',
    nombre: 'Dirección Regional de Guna Yala',
    direccion: 'Sede Comarcal, El Porvenir, Guna Yala',
    telefono: '+507 299-9130',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'arr_office',
    provincia: 'Arraiján',
    nombre: 'Regional Especial de Arraiján',
    direccion: 'Vía Interamericana, Plaza Paseo Arraiján, Arraiján',
    telefono: '+507 507-8410',
    horario: 'Lunes a Viernes 8:00 AM - 4:00 PM'
  }
];

export const HORAS_DISPONIBLES = [
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM'
];

// Dynamically synchronize with localStorage if customized by administration
try {
  const cachedServicios = localStorage.getItem('TE_SERVICIOS');
  if (cachedServicios) {
    const parsed = JSON.parse(cachedServicios);
    if (parsed && parsed.length > 0 && parsed[0].id === 'registro_civil') {
      SERVICIOS_TRIBUNAL.length = 0;
      SERVICIOS_TRIBUNAL.push(...parsed);
    } else {
      localStorage.removeItem('TE_SERVICIOS');
    }
  }
} catch (e) {
  console.error("Error loading cached servicios", e);
}

try {
  const cachedSucursales = localStorage.getItem('TE_SUCURSALES');
  if (cachedSucursales) {
    const parsed = JSON.parse(cachedSucursales);
    SUCURSALES_TE.length = 0;
    SUCURSALES_TE.push(...parsed);
  }
} catch (e) {
  console.error("Error loading cached sucursales", e);
}

export function saveTramiteMutation(newServicios: CategoriaServicio[]) {
  SERVICIOS_TRIBUNAL.length = 0;
  SERVICIOS_TRIBUNAL.push(...newServicios);
  localStorage.setItem('TE_SERVICIOS', JSON.stringify(newServicios));
}

export function saveSucursalMutation(newSucursales: Sucursal[]) {
  SUCURSALES_TE.length = 0;
  SUCURSALES_TE.push(...newSucursales);
  localStorage.setItem('TE_SUCURSALES', JSON.stringify(newSucursales));
}

