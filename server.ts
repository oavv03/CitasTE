import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Fix Node warning about localhost dns resolution in some runtimes
dns.setDefaultResultOrder("ipv4first");

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
                  src="${logoAbsoluteUrl}" 
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

      // Check if Resend API Key is defined
      if (apiKey && apiKey !== "undefined" && apiKey.trim() !== "") {
        console.log(`[Email Service] Attempting real Resend email delivery to ${email}...`);
        
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            from: "Tribunal Electoral <onboarding@resend.dev>",
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
            simulated: false
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
