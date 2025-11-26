import "dotenv/config";
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL = "no-reply@example.com" } = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export async function sendPasswordResetEmail(to, resetLink) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Recuperación de contraseña</h2>
      <p>Hacé clic en el botón para restablecer tu contraseña. 
      <strong>El enlace expira en 1 hora.</strong></p>
      <p style="text-align:center;margin:24px 0">
        <a href="${resetLink}" 
           style="background:#0d6efd;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block">
           Restablecer contraseña
        </a>
      </p>
      <p>Si no hiciste esta solicitud, ignorá este mensaje.</p>
    </div>
  `;
  await transporter.sendMail({ from: FROM_EMAIL, to, subject: "Restablecer contraseña", html });
}
