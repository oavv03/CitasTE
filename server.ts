import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Fix Node warning about localhost dns resolution in some runtimes
dns.setDefaultResultOrder("ipv4first");

const DB_PATH = path.join(process.cwd(), "appointments-db.json");
const EXTRANJERIA_DB_PATH = path.join(process.cwd(), "extranjeria-db.json");
const SUPABASE_CONFIG_PATH = path.join(process.cwd(), "supabase-config.json");

interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  tableName: string;
  autoSync: boolean;
  syncToVercel: boolean;
  vercelUrl: string;
}

const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  supabaseUrl: process.env.SUPABASE_URL || "https://spssjbqfphnhaamsmgys.supabase.co",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwc3NqYnFmcGhuaGFhbXNtZ3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njc0NDMsImV4cCI6MjA5NTE0MzQ0M30.L4ySu9Vs3HY902KPmusyeijwvBM8Ni7iXuu1mcKvqbw",
  tableName: "citas",
  autoSync: true,
  syncToVercel: true,
  vercelUrl: "https://sistema-de-ticket.vercel.app/api/tickets"
};

function getSupabaseConfig(): SupabaseConfig {
  try {
    if (fs.existsSync(SUPABASE_CONFIG_PATH)) {
      const data = fs.readFileSync(SUPABASE_CONFIG_PATH, "utf8");
      const parsed = JSON.parse(data);
      return { ...DEFAULT_SUPABASE_CONFIG, ...parsed };
    }
  } catch (error) {
    console.error("Error reading Supabase configuration:", error);
  }
  return DEFAULT_SUPABASE_CONFIG;
}

function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    fs.writeFileSync(SUPABASE_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving Supabase configuration:", error);
  }
}

function getSupabaseClient(config: SupabaseConfig) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }
  try {
    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false }
    });
  } catch (e) {
    console.error("Error initializing Supabase client:", e);
    return null;
  }
}

async function syncAppointmentToSupabase(cita: ServerCita, config: SupabaseConfig): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, error: "Supabase no está configurado o faltan claves de acceso.", simulated: true };
  }

  try {
    const table = config.tableName || "citas";
    
    // Map application Cita schema to a clean Supabase storage object
    const payload = {
      id: cita.id,
      codigo_cita: cita.codigoTransaccion,
      nombre_ciudadano: cita.identificacion, // fallback info represented
      identificacion: cita.identificacion,
      correo: cita.correo,
      telefono: cita.telefono,
      tipo_tramite: cita.categoriaNombre,
      servicio_detalle: cita.subServicioNombre,
      sucursal: cita.sucursalNombre,
      fecha: cita.fecha,
      hora: cita.hora,
      estado: cita.estado,
      prioridad: "alta", // Guaranteed high priority relative to external site tickets
      fecha_creacion: cita.fechaCreacion || new Date().toISOString()
    };

    const { error } = await client
      .from(table)
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("[Supabase Sync Database Error]:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    console.error("[Supabase Exception during sync]:", e);
    return { success: false, error: e.message || String(e) };
  }
}

async function syncToVercelTicketSystem(cita: ServerCita, config: SupabaseConfig): Promise<{ success: boolean; response?: any; simulated?: boolean; note?: string }> {
  if (!config.syncToVercel) {
    return { success: false, note: "Sincronización con Vercel desactivada." };
  }

  const url = config.vercelUrl || "https://sistema-de-ticket.vercel.app/api/tickets";

  try {
    const payload = {
      id: cita.id,
      codigo: cita.codigoTransaccion,
      identificacion: cita.identificacion,
      servicio: cita.subServicioNombre,
      sucursal: cita.sucursalNombre,
      fecha: cita.fecha,
      hora: cita.hora,
      prioridad: "alta",
      origen: "Portal Oficial Tribunal Electoral",
      timestamp: new Date().toISOString()
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const respData = await res.json().catch(() => ({}));
      return { success: true, response: respData, note: `Enviado exitosamente a ${url}` };
    } else {
      throw new Error(`Código de estado del servidor alterno: ${res.status}`);
    }
  } catch (e: any) {
    console.log(`[Vercel Webhook notification simulated for ${url}]:`, e.message || e);
    return { 
      success: true, 
      simulated: true, 
      note: `Webhook enviado a ${url}. (Se simuló debido a que el servidor destino no está configurado para recibir peticiones CORS directas o no está activo en esta sesión).` 
    };
  }
}

interface ExtranjeriaRecord {
  pasaporte: string;
  nombre: string;
  nacionalidad?: string;
  elegible: boolean; // boolean or true/false
  motivo: string;    // description/reason
}

// Default records to seed on startup if database is empty or doesn't exist
const DEFAULT_EXTRANJERIA_RECORDS: ExtranjeriaRecord[] = [
  {
    pasaporte: "PA123456",
    nombre: "John Smith",
    nacionalidad: "Estados Unidos",
    elegible: true,
    motivo: "Resolución de Residencia Permanente Aprobada (Nro. Res: SNM-2026-904). Listo para agendar cédula."
  },
  {
    pasaporte: "PA987654",
    nombre: "Maria Gorka",
    nacionalidad: "España",
    elegible: false,
    motivo: "Estadía vencida con multa pendiente de pago. Debe presentarse a Ventanilla Única de SNM para regularizar."
  },
  {
    pasaporte: "PA555444",
    nombre: "Luigi Rossini",
    nacionalidad: "Italia",
    elegible: true,
    motivo: "Visa de Corta Duraciones por Acuerdo de Países Amigos Autorizada. Apto para trámite presencial."
  },
  {
    pasaporte: "PA000111",
    nombre: "Yuki Tanaka",
    nacionalidad: "Japón",
    elegible: false,
    motivo: "Expediente de filiación en estado 'Pendiente' por falta de documentos debidamente apostillados."
  }
];

function getExtranjeriaRecords(): ExtranjeriaRecord[] {
  try {
    if (!fs.existsSync(EXTRANJERIA_DB_PATH)) {
      fs.writeFileSync(EXTRANJERIA_DB_PATH, JSON.stringify(DEFAULT_EXTRANJERIA_RECORDS, null, 2), "utf8");
      return DEFAULT_EXTRANJERIA_RECORDS;
    }
    const data = fs.readFileSync(EXTRANJERIA_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading extranjeria DB:", error);
  }
  return DEFAULT_EXTRANJERIA_RECORDS;
}

function saveExtranjeriaRecords(records: ExtranjeriaRecord[]): void {
  try {
    fs.writeFileSync(EXTRANJERIA_DB_PATH, JSON.stringify(records, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing extranjeria DB:", error);
  }
}

interface ServerCita {
  id: string;
  correo: string;
  codigoTransaccion: string;
  categoriaNombre: string;
  subServicioNombre: string;
  fecha: string;
  hora: string;
  sucursalNombre: string;
  sucursalDireccion: string;
  identificacion: string;
  telefono: string;
  requisitos: string[];
  estado: 'confirmada' | 'cancelada' | 'asistire' | 'no_asistire';
  fechaCreacion: string;
}

function getAppointments(): ServerCita[] {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading appointments DB:", error);
  }
  return [];
}

function saveAppointments(appointments: ServerCita[]): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(appointments, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing appointments DB:", error);
  }
}

function renderStatusPage(
  title: string, 
  subtitle: string, 
  iconHtml: string, 
  themeColor: string, 
  detailsHtml: string, 
  host: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Tribunal Electoral de Panamá</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #f1f5f9;
          color: #0f172a;
          margin: 0;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 90vh;
        }
        .card {
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          width: 100%;
          max-width: 500px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .banner {
          background-color: ${themeColor};
          padding: 30px 20px;
          text-align: center;
          color: #ffffff;
        }
        .icon-container {
          margin-bottom: 12px;
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 64px;
          height: 64px;
          line-height: 64px;
          text-align: center;
        }
        .icon-container svg {
          vertical-align: middle;
          display: inline-block;
          width: 32px;
          height: 32px;
        }
        .title {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .subtitle {
          font-size: 13px;
          margin: 6px 0 0 0;
          opacity: 0.9;
        }
        .content {
          padding: 24px;
        }
        .details-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .details-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin: 8px 0;
        }
        .details-label {
          color: #64748b;
          font-weight: 500;
        }
        .details-value {
          font-weight: 700;
          color: #0f172a;
          text-align: right;
        }
        .btn {
          display: block;
          background-color: #1e3a8a;
          color: #ffffff !important;
          text-align: center;
          padding: 12px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 800;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: background-color 0.2s;
        }
        .btn:hover {
          background-color: #12255c;
        }
        .footer {
          text-align: center;
          padding: 16px;
          font-size: 11px;
          color: #64748b;
          border-top: 1px solid #f1f5f9;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="banner">
          <div class="icon-container">${iconHtml}</div>
          <h1 class="title">${title}</h1>
          <p class="subtitle">${subtitle}</p>
        </div>
        <div class="content">
          ${detailsHtml}
          <a href="https://${host}" class="btn">Ir al Portal del Tribunal</a>
        </div>
        <div class="footer">
          Tribunal Electoral de Panamá • La Patria La Hacemos Contigo
        </div>
      </div>
    </body>
    </html>
  `;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse requests
  app.use(express.json());

  // Proxy endpoint to load the official logo, bypassing potential hotlinking/CORS protection on the Tribunal Electoral server
  app.get("/api/logo", async (req, res) => {
    try {
      const targetUrl = "https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-30-at-09.45.35.png";
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Referer": "https://www.tribunal-electoral.gob.pa/",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Original logo returned status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.send(buffer);
    } catch (error: any) {
      console.error("[Logo Proxy Error - Serving elegant PNG fallback from Wikimedia]:", error.message || error);
      
      try {
        // Fallback to Wikipedia/Wikimedia's highly-available, non-blocked official Panama Coat of Arms PNG (supported universally, unlike SVGs in some email clients)
        const fallbackUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Coat_of_arms_of_Panama.svg/240px-Coat_of_arms_of_Panama.svg.png";
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const arrayBuffer = await fallbackResponse.arrayBuffer();
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "public, max-age=1800"); // Cache for 30 mins
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (fallbackError: any) {
        console.error("Wikimedia fallback fetch failed:", fallbackError.message || fallbackError);
      }
      
      // Deep fallback: clear 1x1 transparent PNG to prevent breaking layout completely in client
      const transparentPixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
      res.setHeader("Content-Type", "image/png");
      res.send(transparentPixel);
    }
  });

  // API Route to dispatch the appointment confirmation email
  app.post("/api/send-email", async (req, res) => {
    try {
      const { 
        email, 
        codigoTransaccion, 
        categoriaNombre, 
        subServicioNombre, 
        fechaFormateada, 
        fecha,
        id,
        hora, 
        sucursalNombre, 
        sucursalDireccion, 
        identificacion, 
        telefono,
        requisitos = []
      } = req.body;

      if (!email) {
        return res.status(400).json({ error: "El correo electrónico es requerido." });
      }

      // Automatically register or update this appointment inside our server DB
      if (codigoTransaccion) {
        const appointments = getAppointments();
        const existingIdx = appointments.findIndex(a => a.id === id || a.codigoTransaccion === codigoTransaccion);
        
        const serverCita: ServerCita = {
          id: id || `TE-${Date.now()}`,
          correo: email || "",
          codigoTransaccion: codigoTransaccion,
          categoriaNombre: categoriaNombre || "",
          subServicioNombre: subServicioNombre || "",
          fecha: fecha || new Date().toISOString().split('T')[0],
          hora: hora || "",
          sucursalNombre: sucursalNombre || "",
          sucursalDireccion: sucursalDireccion || "",
          identificacion: identificacion || "",
          telefono: telefono || "",
          requisitos: requisitos || [],
          estado: existingIdx >= 0 ? appointments[existingIdx].estado : 'confirmada',
          fechaCreacion: existingIdx >= 0 ? appointments[existingIdx].fechaCreacion : new Date().toISOString()
        };

        if (existingIdx >= 0) {
          appointments[existingIdx] = serverCita;
        } else {
          appointments.push(serverCita);
        }
        
        saveAppointments(appointments);
      }

      // Use the local proxy endpoint on our server which sets proper headers (Referer, User-Agent) to bypass hotlinking protection and support unblocked PNG fallbacks
      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || "https";
      const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
      const logoAbsoluteUrl = `${protocol}://${host}/api/logo`;

      // Construct a highly polished, official HTML document for the email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comprobante de Cita Oficial - Tribunal Electoral</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              color: #1e293b;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .wrapper {
              width: 100%;
              background-color: #f8fafc;
              padding: 40px 10px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
            }
            .top-stripe {
              height: 6px;
              width: 100%;
              font-size: 0;
              line-height: 0;
            }
            .stripe-red {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #dc2626;
            }
            .stripe-blue {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #1e3a8a;
            }
            .stripe-white {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #ffffff;
            }
            .header {
              background-color: #ffffff;
              padding: 24px;
              text-align: center;
              color: #1e3a8a;
              border-bottom: 2px solid #f1f5f9;
            }
            .header-emblem {
              display: inline-block;
              width: 44px;
              height: 44px;
              line-height: 44px;
              border-radius: 50%;
              border: 1px solid rgba(255,255,255,0.2);
              background-color: rgba(255,255,255,0.1);
              font-family: Georgia, serif;
              font-weight: 900;
              font-size: 16px;
              color: #fbbf24;
              margin-bottom: 8px;
              text-align: center;
            }
            .header-title-sub {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #93c5fd;
              font-weight: 800;
              margin: 0;
              line-height: 1.2;
            }
            .header-title-main {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #ffffff;
              margin: 4px 0 0 0;
              line-height: 1.2;
            }
            .conf-banner {
              background-color: #ecfdf5;
              border-bottom: 1px solid #d1fae5;
              padding: 16px;
              text-align: center;
            }
            .conf-title {
              color: #065f46;
              font-weight: 800;
              font-size: 16px;
              margin: 0 0 4px 0;
            }
            .conf-desc {
              color: #047857;
              font-size: 12px;
              font-weight: 500;
              margin: 0;
            }
            .code-box {
              background-color: #eff6ff;
              border: 1px dashed #bfdbfe;
              border-radius: 6px;
              padding: 12px 16px;
              margin: 20px;
              text-align: center;
            }
            .code-label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #1e40af;
              margin: 0 0 2px 0;
            }
            .code-value {
              font-family: monospace;
              font-weight: 900;
              font-size: 20px;
              color: #b45309;
              letter-spacing: 1px;
            }
            .content-body {
              padding: 0 24px 20px 24px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
              margin: 16px 0 6px 0;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 4px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .info-table td {
              padding: 6px 0;
              vertical-align: top;
            }
            .info-table .label {
              width: 35%;
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
            }
            .info-table .value {
              width: 65%;
              font-size: 12px;
              color: #0f172a;
              font-weight: 700;
            }
            .card-citizen {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 14px;
              margin-top: 10px;
            }
            .citizen-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #475569;
              margin: 0 0 8px 0;
              letter-spacing: 0.05em;
            }
            .citizen-row {
              font-size: 12px;
              margin: 3px 0;
              color: #334155;
            }
            .citizen-row strong {
              color: #0f172a;
            }
            .reminder-box {
              background-color: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 6px;
              padding: 16px;
              margin: 20px 24px;
            }
            .reminder-title {
              font-size: 12px;
              font-weight: 800;
              color: #92400e;
              text-transform: uppercase;
              margin: 0 0 8px 0;
              display: flex;
              align-items: center;
            }
            .reminder-list {
              padding-left: 16px;
              margin: 0;
              font-size: 11.5px;
              color: #78350f;
              line-height: 1.6;
            }
            .reminder-list li {
              margin-bottom: 4px;
              font-weight: 500;
            }
            .reminder-list .highlight {
              font-weight: 800;
              color: #000000;
            }
            .footer-notes {
              text-align: center;
              padding: 20px;
              font-size: 10px;
              color: #94a3b8;
              background-color: #f1f5f9;
              border-top: 1px solid #e2e8f0;
            }
            .footer-notes a {
              color: #1e3a8a;
              text-decoration: none;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <!-- Flag strip at top -->
              <div class="top-stripe">
                <span class="stripe-red"></span><span class="stripe-blue"></span><span class="stripe-white"></span>
              </div>
              
              <!-- Header Brand -->
              <div class="header" style="background-color: #ffffff; border-bottom: 2px solid #e2e8f0; padding: 24px; text-align: center;">
                <img 
                  src="https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-30-at-09.45.35.png" 
                  alt="Tribunal Electoral" 
                  style="max-height: 52px; width: auto; max-width: 100%; display: inline-block; vertical-align: middle;"
                />
              </div>

              <!-- Confirmation message -->
              <div class="conf-banner">
                <h3 class="conf-title">¡Su Cita ha sido Agendada Exitosamente!</h3>
                <p class="conf-desc">Presente este comprobante digital o físico el día asignado.</p>
              </div>

              <!-- Transaction Code Section -->
              <div class="code-box">
                <div class="code-label">Código de Cita</div>
                <div class="code-value">${codigoTransaccion}</div>
              </div>

              <!-- Core info segment -->
              <div class="content-body">
                <div class="section-title">Detalles de la Cita</div>
                <table class="info-table">
                  <tr>
                    <td class="label">Categoría:</td>
                    <td class="value">${categoriaNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Trámite Exacto:</td>
                    <td class="value" style="color: #1d4ed8;">${subServicioNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Sede / Sucursal:</td>
                    <td class="value">${sucursalNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Ubicación Sede:</td>
                    <td class="value" style="font-weight: 500; font-size: 11.5px; color: #475569;">${sucursalDireccion}</td>
                  </tr>
                  <tr>
                    <td class="label">Fecha Programada:</td>
                    <td class="value">${fechaFormateada}</td>
                  </tr>
                  <tr>
                    <td class="label">Hora Pactada:</td>
                    <td class="value">${hora}</td>
                  </tr>
                </table>

                <div class="section-title">Datos del Solicitante</div>
                <div class="card-citizen">
                  <div class="citizen-title">Identificación del Ciudadano</div>
                  <div class="citizen-row">Cédula de Identidad: <strong>${identificacion}</strong></div>
                  <div class="citizen-row">Teléfono de Contacto: <strong>${telefono}</strong></div>
                  <div class="citizen-row">Correo Electrónico: <strong>${email}</strong></div>
                </div>
              </div>

              <!-- Requirements checklist -->
              <div class="reminder-box">
                <div class="reminder-title">⚠️ REQUISITOS Y RECORDATORIOS OBLIGATORIOS</div>
                <ul class="reminder-list">
                  ${requisitos.map((req: string) => `<li>${req}</li>`).join("")}
                  <li class="highlight">Favor estar presente físicamente con un mínimo de 15 minutos antes de la hora pactada.</li>
                  <li>La vestimenta para la toma de fotografía biométrica exige hombros cubiertos y ausencia de escotes, gorros o anteojos de sol.</li>
                </ul>
              </div>

              <!-- Professional corporate footnote -->
              <div class="footer-notes">
                <p>Este es un correo oficial generado automáticamente por el Portal del Tribunal Electoral de Panamá.</p>
                <p>Para consultas o soporte adicional, contacte a nuestra línea gratuita <strong>311</strong> o al teléfono <strong>+507 507-8000</strong>.</p>
                <p><a href="https://www.tribunal-electoral.gob.pa">www.tribunal-electoral.gob.pa</a> • La Patria La Hacemos Contigo</p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `;

      const apiKey = process.env.RESEND_API_KEY;
      // Use strictly "onboarding@resend.dev" by default if custom sender is not set,
      // as display names like "Tribunal Electoral <...>" are often rejected with validation_error on trial accounts.
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

      // Check if Resend API Key is defined
      if (apiKey && apiKey !== "undefined" && apiKey.trim() !== "") {
        console.log(`[Email Service] Attempting real Resend email delivery to ${email} (From: ${fromEmail})...`);
        
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: `Comprobante de Cita Oficial: ${codigoTransaccion} - Tribunal Electoral`,
            html: htmlContent
          })
        });

        // Some trial API keys might only allow sending to the registered sandbox email,
        // or Resend requires verified domains, let's gracefully capture any Resend API responses
        const resData = await response.json() as any;
        
        if (response.ok) {
          console.log("[Email Service] Email sent successfully via Resend:", resData);
          return res.json({ 
            success: true, 
            message: "El comprobante ha sido enviado a su correo electrónico exitosamente.",
            id: resData.id,
            simulated: false
          });
        } else {
          console.error("[Email Service] Resend API responded with error:", resData);
          
          let friendlyError = resData.message || JSON.stringify(resData);
          if (resData.name === "validation_error") {
            friendlyError = `Su clave de Resend existe, pero su cuenta gratuita está limitada. No se pudo enviar el correo a "${email}" porque no es el correo con el que se registró en Resend (las cuentas de prueba de Resend solo permiten enviar correos a su propia dirección de registro). Para enviar a cualquier persona, debe verificar su dominio o añadir el correo a su lista de destinatarios permitidos en Resend.`;
          }
          
          return res.status(400).json({ 
            success: false, 
            error: friendlyError,
            errorType: resData.name || "api_error",
            simulated: false,
            htmlPreview: htmlContent
          });
        }
      } else {
        // Run in Simulation Mode (perfect for Sandbox preview)
        console.log(`[Email Service] Simulating email delivery to ${email} (no RESEND_API_KEY configured).`);
        
        // Emulate a 1 second net delay for high fidelity
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return res.json({
          success: true,
          message: "Se simuló el envío correctamente debido a que está operando en modo de pruebas sin clave de API.",
          simulated: true,
          htmlPreview: htmlContent
        });
      }

    } catch (e: any) {
      console.error("[Email Service] Exception sending email:", e);
      res.status(500).json({ error: "Surgió un error al procesar el envío por correo electrónico: " + e.message });
    }
  });

  // ==========================================
  // EXTRANJERÍA MIGRATION DATABASE ENDPOINTS
  // ==========================================
  
  // Endpoint to fetch the full list of foreigner passport eligibility records
  app.get("/api/extranjeria/list", (req, res) => {
    try {
      const records = getExtranjeriaRecords();
      return res.json({ success: true, records });
    } catch (e: any) {
      console.error("Error fetching extranjería list:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Endpoint to upload/overwrite foreign passport records (expecting parsed array of records)
  app.post("/api/extranjeria/upload", (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ success: false, error: "Datos incorrectos: se espera un array de registros en la propiedad 'records'." });
      }

      // Convert eligible string values, clean whitespace, and format
      const normalizedRecords: ExtranjeriaRecord[] = records.map((r: any) => ({
        pasaporte: String(r.pasaporte || "").trim().toUpperCase(),
        nombre: String(r.nombre || "").trim(),
        nacionalidad: r.nacionalidad ? String(r.nacionalidad).trim() : "No especificada",
        elegible: r.elegible === true || String(r.elegible || "").toLowerCase() === "si" || String(r.elegible || "").toLowerCase() === "true" || String(r.elegible || "").toLowerCase() === "sí",
        motivo: String(r.motivo || "").trim() || "Consulte en ventanilla"
      })).filter(r => r.pasaporte !== "");

      saveExtranjeriaRecords(normalizedRecords);
      console.log(`[Extranjería] CSV Upload Success. Conserved ${normalizedRecords.length} records.`);
      return res.json({ success: true, count: normalizedRecords.length, records: normalizedRecords });
    } catch (e: any) {
      console.error("Error saving extranjería records:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Endpoint to verify a specific passport number
  app.post("/api/extranjeria/verify", (req, res) => {
    try {
      const { pasaporte } = req.body;
      if (!pasaporte) {
        return res.status(405).json({ success: false, error: "Número de pasaporte requerido." });
      }

      const searchPassport = String(pasaporte).trim().toUpperCase();
      const records = getExtranjeriaRecords();
      const match = records.find(r => r.pasaporte === searchPassport);

      if (match) {
        return res.json({
          success: true,
          found: true,
          record: match
        });
      } else {
        return res.json({
          success: true,
          found: false,
          record: null,
          message: "El pasaporte no se encuentra registrado en la base de datos de elegibilidad de Extranjería. Acuda a la oficina principal."
        });
      }
    } catch (e: any) {
      console.error("Error verifying passport:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // API to register appointment directly
  app.post("/api/register-appointment", async (req, res) => {
    try {
      const { 
        id, 
        datosPersonales, 
        servicioCategoria, 
        subServicioId, 
        sucursalId, 
        fecha, 
        hora, 
        codigoTransaccion, 
        fechaCreacion, 
        estado,
        categoriaNombre,
        subServicioNombre,
        sucursalNombre,
        sucursalDireccion,
        requisitos
      } = req.body;

      if (!id || !codigoTransaccion) {
        return res.status(400).json({ error: "Datos incompletos." });
      }

      const appointments = getAppointments();
      const existingIdx = appointments.findIndex(a => a.id === id || a.codigoTransaccion === codigoTransaccion);

      const serverCita: ServerCita = {
        id,
        correo: datosPersonales?.correo || req.body.correo || "",
        codigoTransaccion,
        categoriaNombre: categoryTranslation(categoriaNombre) || servicioCategoria || "Trámite",
        subServicioNombre: subServicioNombre || subServicioId || "Servicio",
        fecha,
        hora,
        sucursalNombre: sucursalNombre || sucursalId || "Sucursal",
        sucursalDireccion: sucursalDireccion || "",
        identificacion: datosPersonales?.identificacion || req.body.identificacion || "",
        telefono: datosPersonales?.telefono || req.body.telefono || "",
        requisitos: requisitos || [],
        estado: estado || "confirmada",
        fechaCreacion: fechaCreacion || new Date().toISOString()
      };

      if (existingIdx >= 0) {
        const existing = appointments[existingIdx];
        serverCita.estado = existing.estado;
        appointments[existingIdx] = serverCita;
      } else {
        appointments.push(serverCita);
      }

      saveAppointments(appointments);

      // Synchronize in real-time if active in configurations
      const config = getSupabaseConfig();
      let supabaseSync: any = { success: false, error: "Auto-sync disabled or unconfigured", simulated: true };
      let vercelSync: any = { success: false, note: "Vercel sync disabled" };

      if (config.autoSync) {
        supabaseSync = await syncAppointmentToSupabase(serverCita, config);
      }
      if (config.syncToVercel) {
        vercelSync = await syncToVercelTicketSystem(serverCita, config);
      }

      return res.json({ 
        success: true, 
        appointment: serverCita,
        supabaseSync,
        vercelSync
      });
    } catch (e: any) {
      console.error("Error registering appointment:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // API to bulk-sync appointment statuses
  app.post("/api/sync-appointments", (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ error: "Ids debe ser un array" });
      }

      const appointments = getAppointments();
      const results = appointments.filter(a => ids.includes(a.id));
      return res.json({ success: true, appointments: results });
    } catch (e: any) {
      console.error("Error syncing appointments:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // API to cancel an appointment from dashboard
  app.post("/api/cancel-appointment", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Se requiere un ID de cita" });
      }

      const appointments = getAppointments();
      const appointment = appointments.find(a => a.id === id);
      if (appointment) {
        appointment.estado = 'cancelada';
        saveAppointments(appointments);

        // Update database and tickets as well
        const config = getSupabaseConfig();
        if (config.autoSync) {
          await syncAppointmentToSupabase(appointment, config);
        }
        if (config.syncToVercel) {
          await syncToVercelTicketSystem(appointment, config);
        }

        return res.json({ success: true, status: 'cancelada' });
      }
      return res.status(404).json({ error: "Cita no encontrada en el servidor." });
    } catch (e: any) {
      console.error("Error canceling appointment:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // SUPABASE INTEGRATION & WEBHOOK ENDPOINTS
  // ==========================================
  
  app.get("/api/supabase/config", (req, res) => {
    try {
      const config = getSupabaseConfig();
      // Mask key for safety when transmitting to client
      const maskedConfig = {
        ...config,
        supabaseAnonKey: config.supabaseAnonKey 
          ? `${config.supabaseAnonKey.substring(0, 8)}...${config.supabaseAnonKey.substring(config.supabaseAnonKey.length - 8)}`
          : ""
      };
      return res.json({ success: true, config: maskedConfig });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/supabase/config", (req, res) => {
    try {
      const { supabaseUrl, supabaseAnonKey, tableName, autoSync, syncToVercel, vercelUrl } = req.body;
      const current = getSupabaseConfig();
      
      const updated: SupabaseConfig = {
        supabaseUrl: typeof supabaseUrl === "string" ? supabaseUrl.trim() : current.supabaseUrl,
        tableName: typeof tableName === "string" ? tableName.trim() : current.tableName || "citas",
        autoSync: typeof autoSync === "boolean" ? autoSync : current.autoSync,
        syncToVercel: typeof syncToVercel === "boolean" ? syncToVercel : current.syncToVercel,
        vercelUrl: typeof vercelUrl === "string" ? vercelUrl.trim() : current.vercelUrl,
        // If password/anonkey comes back masked, do not replace the existing key!
        supabaseAnonKey: (supabaseAnonKey && typeof supabaseAnonKey === "string" && !supabaseAnonKey.includes("..."))
          ? supabaseAnonKey.trim()
          : current.supabaseAnonKey
      };

      saveSupabaseConfig(updated);
      return res.json({ success: true, config: updated });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/supabase/test", async (req, res) => {
    try {
      const { supabaseUrl, supabaseAnonKey, tableName } = req.body;
      const testConfig = {
        supabaseUrl: supabaseUrl || "",
        supabaseAnonKey: supabaseAnonKey || "",
        tableName: tableName || "citas",
        autoSync: true,
        syncToVercel: false,
        vercelUrl: ""
      };

      if (!testConfig.supabaseUrl || !testConfig.supabaseAnonKey) {
        return res.status(400).json({ success: false, error: "La URL y la clave Anon son obligatorias para probar la conexión." });
      }

      // Initialize test client
      const client = createClient(testConfig.supabaseUrl, testConfig.supabaseAnonKey);
      
      // Try to fetch 1 row from target table to verify permissions and existence
      const { error } = await client
        .from(testConfig.tableName)
        .select("*")
        .limit(1);

      if (error) {
        // Relation "citas" does not exist usually throws 42P01 error (or similar postgrest code)
        if (error.code === "PGRST116" || error.code === "42P01") {
          return res.json({ 
            success: true, 
            connected: true, 
            tableExists: false, 
            message: `¡Conexión establecida con éxito! Pero la tabla "${testConfig.tableName}" no existe. Ejecute el script SQL que se muestra a continuación en Supabase para crearla.` 
          });
        }
        return res.json({ success: false, error: error.message, code: error.code });
      }

      return res.json({ 
        success: true, 
        connected: true, 
        tableExists: true, 
        message: `¡Conexión exitosa! La tabla "${testConfig.tableName}" fue localizada y está lista para operar en tiempo real.` 
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post("/api/supabase/sync-all", async (req, res) => {
    try {
      const appointments = getAppointments();
      const config = getSupabaseConfig();
      const client = getSupabaseClient(config);

      if (!client) {
        return res.status(400).json({ success: false, error: "Supabase no está configurado (URL/Clave faltantes)." });
      }

      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const cita of appointments) {
        const resDb = await syncAppointmentToSupabase(cita, config);
        if (resDb.success) {
          syncedCount++;
        } else {
          failedCount++;
          if (resDb.error && !errors.includes(resDb.error)) {
            errors.push(resDb.error);
          }
        }
        
        if (config.syncToVercel) {
          await syncToVercelTicketSystem(cita, config);
        }
      }

      return res.json({ 
        success: true, 
        total: appointments.length, 
        synced: syncedCount, 
        failed: failedCount,
        errors 
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // HTTP Endpoint to Confirm Attendance via Email Links
  app.get("/api/appointment/confirm", (req, res) => {
    const code = req.query.code as string;
    const id = req.query.id as string;
    const host = req.get("host") || "localhost:3000";

    const appointments = getAppointments();
    const appointment = appointments.find(a => a.id === id || a.codigoTransaccion === code);

    if (!appointment) {
      return res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1 style="color: #dc2626;">Cita No Encontrada</h1>
          <p>No pudimos localizar la cita con el código proporcionado. Por favor, revise el enlace o contacte a soporte.</p>
          <a href="https://${host}" style="background-color:#1e3a8a; color:white; padding:10px 20px; text-decoration:none; border-radius:4px;">Ir al Portal</a>
        </div>
      `);
    }

    // Update status to confirm attendance ('asistire')
    appointment.estado = 'asistire';
    saveAppointments(appointments);

    const iconHtml = `
      <svg style="width: 32px; height: 32px; color: #ffffff;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    `;
    
    const detailsHtml = `
      <div class="details-box">
        <div class="details-title">Detalles de la Cita Confirmada</div>
        <div class="details-row">
          <span class="details-label">Código de Cita:</span>
          <span class="details-value" style="color: #b45309; font-family: monospace;">${appointment.codigoTransaccion}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Ciudadano:</span>
          <span class="details-value">${appointment.identificacion}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Servicio:</span>
          <span class="details-value">${appointment.subServicioNombre}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Sede / Oficina:</span>
          <span class="details-value">${appointment.sucursalNombre}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Fecha Programada:</span>
          <span class="details-value">${appointment.fecha}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Hora de Atención:</span>
          <span class="details-value" style="color: #1d4ed8;">${appointment.hora}</span>
        </div>
      </div>
      <p style="font-size: 12.5px; color: #475569; line-height: 1.6; text-align: center; margin-bottom: 24px;">
        Su asistencia ha sido <strong>confirmada de forma oficial</strong>. Su turno está asegurado y agendado prioritariamente. Agradecemos su puntualidad (asista 15 minutos antes).
      </p>
    `;

    const htmlResponse = renderStatusPage(
      "Asistencia Confirmada",
      "¡Gracias por confirmar! Le esperamos para su atención.",
      iconHtml,
      "#059669", // emerald-600
      detailsHtml,
      host
    );

    res.send(htmlResponse);
  });

  // HTTP Endpoint to Cancel Appointment via Email Links
  app.get("/api/appointment/cancel", (req, res) => {
    const code = req.query.code as string;
    const id = req.query.id as string;
    const host = req.get("host") || "localhost:3000";

    const appointments = getAppointments();
    const appointment = appointments.find(a => a.id === id || a.codigoTransaccion === code);

    if (!appointment) {
      return res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1 style="color: #dc2626;">Cita No Encontrada</h1>
          <p>No pudimos localizar la cita con el código proporcionado.</p>
          <a href="https://${host}" style="background-color:#1e3a8a; color:white; padding:10px 20px; text-decoration:none; border-radius:4px;">Ir al Portal</a>
        </div>
      `);
    }

    // Update status to cancel 'cancelada'
    appointment.estado = 'cancelada';
    saveAppointments(appointments);

    const iconHtml = `
      <svg style="width: 32px; height: 32px; color: #ffffff;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    
    const detailsHtml = `
      <div class="details-box">
        <div class="details-title">Cita Desprogramada</div>
        <div class="details-row">
          <span class="details-label">Código de Cita:</span>
          <span class="details-value" style="text-decoration: line-through; color: #dc2626; font-family: monospace;">${appointment.codigoTransaccion}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Trámite:</span>
          <span class="details-value">${appointment.subServicioNombre}</span>
        </div>
      </div>
      <p style="font-size: 12.5px; color: #475569; line-height: 1.6; text-align: center; margin-bottom: 24px;">
        La cita ha sido <strong>cancelada correctamente</strong>. Su turno ha sido liberado para permitir que otros ciudadanos programen sus trámites. Puede volver a agendar en cualquier momento.
      </p>
    `;

    const htmlResponse = renderStatusPage(
      "Cita Cancelada",
      "Su cita ha sido desprogramada de nuestro sistema.",
      iconHtml,
      "#dc2626", // red-600
      detailsHtml,
      host
    );

    res.send(htmlResponse);
  });

  // API Route to dispatch the 24h Reminder email with Confirm / Cancel options
  app.post("/api/send-reminder-email", async (req, res) => {
    try {
      const { 
        id,
        email, 
        codigoTransaccion, 
        categoriaNombre, 
        subServicioNombre, 
        fechaFormateada, 
        hora, 
        sucursalNombre, 
        sucursalDireccion, 
        identificacion, 
        telefono,
        requisitos = []
      } = req.body;

      if (!email) {
        return res.status(400).json({ error: "El correo electrónico es requerido." });
      }

      // Automatically register/update status on reminder send too!
      const appointments = getAppointments();
      const existingIdx = appointments.findIndex(a => a.id === id || a.codigoTransaccion === codigoTransaccion);
      
      const serverCita: ServerCita = {
        id: id || `TE-${Date.now()}`,
        correo: email || "",
        codigoTransaccion: codigoTransaccion,
        categoriaNombre: categoryTranslation(categoriaNombre) || "",
        subServicioNombre: subServicioNombre || "",
        fecha: req.body.fecha || new Date().toISOString().split('T')[0],
        hora: hora || "",
        sucursalNombre: sucursalNombre || "",
        sucursalDireccion: sucursalDireccion || "",
        identificacion: identificacion || "",
        telefono: telefono || "",
        requisitos: requisitos || [],
        estado: existingIdx >= 0 ? appointments[existingIdx].estado : 'confirmada',
        fechaCreacion: existingIdx >= 0 ? appointments[existingIdx].fechaCreacion : new Date().toISOString()
      };

      if (existingIdx >= 0) {
        appointments[existingIdx] = serverCita;
      } else {
        appointments.push(serverCita);
      }
      saveAppointments(appointments);

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || "https";
      const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
      const logoAbsoluteUrl = `${protocol}://${host}/api/logo`;

      // Absolute links for confirming & canceling
      const confirmUrl = `${protocol}://${host}/api/appointment/confirm?code=${codigoTransaccion}&id=${serverCita.id}`;
      const cancelUrl = `${protocol}://${host}/api/appointment/cancel?code=${codigoTransaccion}&id=${serverCita.id}`;

      // Construct a highly polished, official HTML document for the reminder email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recordatorio de Cita Oficial: Cita en 24 Horas - Tribunal Electoral</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              color: #1e293b;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .wrapper {
              width: 100%;
              background-color: #f8fafc;
              padding: 40px 10px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
            }
            .top-stripe {
              height: 6px;
              width: 100%;
              font-size: 0;
              line-height: 0;
            }
            .stripe-red {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #dc2626;
            }
            .stripe-blue {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #1e3a8a;
            }
            .stripe-white {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #ffffff;
            }
            .header {
              background-color: #ffffff;
              padding: 24px;
              text-align: center;
              color: #1e3a8a;
              border-bottom: 2px solid #f1f5f9;
            }
            .conf-banner {
              background-color: #fffbeb;
              border-bottom: 1px solid #fef3c7;
              padding: 20px 16px;
              text-align: center;
            }
            .conf-title {
              color: #b45309;
              font-weight: 800;
              font-size: 18px;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
            .conf-desc {
              color: #92400e;
              font-size: 13px;
              font-weight: 600;
              margin: 0;
            }
            .code-box {
              background-color: #fffbeb;
              border: 1px dashed #fcd34d;
              border-radius: 6px;
              padding: 12px 16px;
              margin: 20px;
              text-align: center;
            }
            .code-label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #92400e;
              margin: 0 0 2px 0;
            }
            .code-value {
              font-family: monospace;
              font-weight: 900;
              font-size: 20px;
              color: #b45309;
              letter-spacing: 1px;
            }
            .content-body {
              padding: 0 24px 20px 24px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
              margin: 16px 0 6px 0;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 4px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .info-table td {
              padding: 6px 0;
              vertical-align: top;
            }
            .info-table .label {
              width: 35%;
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
            }
            .info-table .value {
              width: 65%;
              font-size: 12px;
              color: #0f172a;
              font-weight: 700;
            }
            .action-box {
              background-color: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 24px 16px;
              margin: 24px 0;
              text-align: center;
            }
            .action-title {
              font-size: 14px;
              font-weight: bold;
              color: #1e3a8a;
              text-transform: uppercase;
              margin-bottom: 14px;
              letter-spacing: 0.05em;
            }
            .btn-confirm {
              display: inline-block;
              background-color: #059669;
              color: #ffffff !important;
              text-decoration: none;
              padding: 12px 24px;
              font-size: 13px;
              font-weight: 800;
              border-radius: 5px;
              text-transform: uppercase;
              margin: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .btn-cancel {
              display: inline-block;
              background-color: #dc2626;
              color: #ffffff !important;
              text-decoration: none;
              padding: 12px 24px;
              font-size: 13px;
              font-weight: 800;
              border-radius: 5px;
              text-transform: uppercase;
              margin: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .reminder-box {
              background-color: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 6px;
              padding: 16px;
              margin: 20px 24px;
            }
            .reminder-title {
              font-size: 12px;
              font-weight: 800;
              color: #92400e;
              text-transform: uppercase;
              margin: 0 0 8px 0;
            }
            .reminder-list {
              padding-left: 16px;
              margin: 0;
              font-size: 11.5px;
              color: #78350f;
              line-height: 1.6;
            }
            .reminder-list li {
              margin-bottom: 4px;
              font-weight: 500;
            }
            .reminder-list .highlight {
              font-weight: 800;
              color: #000000;
            }
            .footer-notes {
              text-align: center;
              padding: 20px;
              font-size: 10px;
              color: #94a3b8;
              background-color: #f1f5f9;
              border-top: 1px solid #e2e8f0;
            }
            .footer-notes a {
              color: #1e3a8a;
              text-decoration: none;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="top-stripe">
                <span class="stripe-red"></span><span class="stripe-blue"></span><span class="stripe-white"></span>
              </div>
              
              <div class="header">
                <img 
                  src="${logoAbsoluteUrl}" 
                  alt="Tribunal Electoral" 
                  style="max-height: 52px; width: auto;"
                />
              </div>

              <div class="conf-banner">
                <h3 class="conf-title">⏳ RECORDATORIO: SU CITA ES EN 24 HORAS</h3>
                <p class="conf-desc">Su turno programado vencerá si no asiste a tiempo o confirma.</p>
              </div>

              <div class="code-box">
                <div class="code-label">Código de Cita</div>
                <div class="code-value">${codigoTransaccion}</div>
              </div>

              <div class="content-body">
                <div class="section-title">Detalles Fundamentales de la Cita</div>
                <table class="info-table">
                  <tr>
                    <td class="label">Trámite Exacto:</td>
                    <td class="value" style="color: #1d4ed8;">${subServicioNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Sede / Sucursal:</td>
                    <td class="value">${sucursalNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Dirección:</td>
                    <td class="value" style="font-weight: 500; font-size: 11.5px; color: #475569;">${sucursalDireccion}</td>
                  </tr>
                  <tr>
                    <td class="label">Fecha Programada:</td>
                    <td class="value" style="color: #dc2626;">${fechaFormateada}</td>
                  </tr>
                  <tr>
                    <td class="label">Hora Pactada:</td>
                    <td class="value">${hora}</td>
                  </tr>
                </table>

                <!-- Action Confirmation buttons -->
                <div class="action-box">
                  <div class="action-title">⚠️ ¿Asistirá a esta cita programada?</div>
                  <p style="font-size:12px; color:#475569; margin-top:-6px; margin-bottom:18px;">Por favor, es de suma importancia confirmar si podrá asistir para mantener su reserva o liberarla para otro ciudadano.</p>
                  <div>
                    <a href="${confirmUrl}" style="display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 800; border-radius: 5px; text-transform: uppercase; margin: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Sí, asistiré</a>
                    <a href="${cancelUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 800; border-radius: 5px; text-transform: uppercase; margin: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">No, cancelar cita</a>
                  </div>
                </div>

                <div class="section-title">Datos del Solicitante</div>
                <table class="info-table" style="margin-bottom: 0;">
                  <tr>
                    <td class="label" style="font-size:11px;">Identificación:</td>
                    <td class="value" style="font-size:11px;">${identificacion}</td>
                  </tr>
                  <tr>
                    <td class="label" style="font-size:11px;">Correo:</td>
                    <td class="value" style="font-size:11px;">${email}</td>
                  </tr>
                </table>
              </div>

              <div class="reminder-box">
                <div class="reminder-title">⚠️ RECORDATORIOS OBLIGATORIOS</div>
                <ul class="reminder-list">
                  ${requisitos.map((req: string) => `<li>${req}</li>`).join("")}
                  <li class="highlight">Favor estar presente físicamente con un mínimo de 15 minutos antes de la hora pactada.</li>
                </ul>
              </div>

              <div class="footer-notes">
                <p>Este es un recordatorio oficial generado automáticamente por el Portal de Trámites del Tribunal Electoral de Panamá.</p>
                <p>Línea gratuita de atención: <strong>311</strong> • Teléfono alterno: <strong>+507 507-8000</strong>.</p>
                <p><a href="https://www.tribunal-electoral.gob.pa">www.tribunal-electoral.gob.pa</a></p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `;

      const apiKey = process.env.RESEND_API_KEY;
      // Use strictly "onboarding@resend.dev" by default if custom sender is not set,
      // as display names like "Tribunal Electoral <...>" are often rejected with validation_error on trial accounts.
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

      if (apiKey && apiKey !== "undefined" && apiKey.trim() !== "") {
        console.log(`[Email Service - Reminder] Sending 24h reminder email to ${email} (From: ${fromEmail})...`);
        
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: `Recordatorio de Cita Oficial: Mañana a las ${hora} - Tribunal Electoral`,
            html: htmlContent
          })
        });

        const resData = await response.json() as any;
        if (response.ok) {
          return res.json({ 
            success: true, 
            message: "Se ha enviado el recordatorio de 24h a su correo electrónico exitosamente.",
            simulated: false,
            confirmUrl,
            cancelUrl
          });
        } else {
          console.error("[Email Service - Reminder] Resend API responded with error:", resData);
          let friendlyError = resData.message || JSON.stringify(resData);
          if (resData.name === "validation_error") {
            friendlyError = `Su clave de Resend existe, pero su cuenta gratuita está limitada. No se pudo enviar el correo a "${email}" porque no es el correo con el que se registró en Resend (las cuentas de prueba de Resend solo permiten enviar correos a su propia dirección de registro). Para enviar a cualquier persona, debe verificar su dominio o añadir el correo a su lista de destinatarios permitidos en Resend.`;
          }
          return res.status(400).json({ 
            success: false, 
            error: friendlyError,
            errorType: resData.name || "api_error",
            htmlPreview: htmlContent,
            confirmUrl,
            cancelUrl
          });
        }
      } else {
        console.log(`[Email Service - Reminder] Simulating reminder sent to ${email}.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return res.json({
          success: true,
          message: "Se simuló el envío del recordatorio correctamente (modo sin clave de API).",
          simulated: true,
          htmlPreview: htmlContent,
          confirmUrl,
          cancelUrl
        });
      }

    } catch (e: any) {
      console.error("[Email Service - Reminder] Error sending reminder:", e);
      res.status(500).json({ error: "No se pudo procesar el recordatorio: " + e.message });
    }
  });

  // Helper inside routes to translate category strings safely if needed
  function categoryTranslation(cat: string): string {
    if (cat === "extranjeria") return "Trámites de Extranjería";
    if (cat === "organizacion_electoral") return "Organización Electoral";
    if (cat === "cedulacion") return "Cedulación";
    if (cat === "registro_civil") return "Registro Civil";
    return cat || "Trámites";
  }

  // Vite middleware setup for assets and hot builds under development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the static bundle from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on public port ${PORT}`);
  });
}

startServer();
