import { Resend } from 'resend';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json(res, 500, { error: 'RESEND_API_KEY is not configured' });

  const to = process.env.SUPPORT_FORM_TO || process.env.CONTACT_FORM_TO || process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) return json(res, 500, { error: 'Support destination email is not configured' });

  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name) return json(res, 400, { error: 'Name is required' });
  if (!isEmail(email)) return json(res, 400, { error: 'Valid email is required' });
  if (!message) return json(res, 400, { error: 'Message is required' });

  try {
    const resend = new Resend(apiKey);

    const subject = `Support request — ${name}`;
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 12px 0;">Support request</h2>
        <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <pre style="white-space: pre-wrap; margin: 16px 0 0 0; padding: 12px; background: #f6f7fb; border-radius: 10px;">${escapeHtml(
          message
        )}</pre>
      </div>
    `;

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      replyTo: email
    });

    return json(res, 200, { ok: true, id: result?.data?.id ?? null });
  } catch (err) {
    return json(res, 400, { error: err?.message ?? 'Bad Request' });
  }
}
