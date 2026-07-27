import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBugReportNotification(report, tenant) {
  try {
    await resend.emails.send({
      from: 'Reportes <onboarding@resend.dev>', // dominio de prueba de Resend — ver nota abajo
      to: process.env.SUPPORT_NOTIFICATION_EMAIL,
      subject: `[${report.type.toUpperCase()}] ${report.title}`,
      html: `
        <h2>${report.title}</h2>
        <p><strong>Tipo:</strong> ${report.type}</p>
        <p><strong>Empresa:</strong> ${tenant?.name ?? 'Desconocida'}</p>
        <p><strong>Plataforma:</strong> ${report.platform} · v${report.appVersion}</p>
        <p><strong>Pantalla:</strong> ${report.screenContext ?? '—'}</p>
        <hr/>
        <p>${report.description}</p>
      `,
    });
  } catch (err) {
    console.error('Error enviando notificación de bug report:', err.message);
  }
}