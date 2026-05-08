// notify-tradeshow-signup
// Fired by the /pioneer + /waitlist pages after a successful Supabase insert.
// Sends Z an email via Resend so he sees signups in real time, not just in the dashboard.
//
// Body shape (one of):
//   { kind: "pioneer",  data: { company_name, state_code, contact_name, email } }
//   { kind: "waitlist", data: { name, email, company_name?, state_code? } }
//
// Best-effort: if RESEND_API_KEY is missing or Resend errors, returns 200 with a
// non-fatal flag so the user-facing form still shows success.  We never want a
// notification glitch to make a real signup look broken to the customer.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NOTIFY_TO   = 'zach@treadset.co';
const NOTIFY_FROM = 'TreadSet Notifications <noreply@bsgtires.com>';

interface PioneerPayload  { kind: 'pioneer';  data: { company_name: string; state_code: string; contact_name: string; email: string } }
interface WaitlistPayload { kind: 'waitlist'; data: { name: string; email: string; company_name?: string | null; state_code?: string | null } }
type Payload = PioneerPayload | WaitlistPayload;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')    return jsonResp({ error: 'POST only' }, 405);

  let payload: Payload;
  try { payload = await req.json(); }
  catch { return jsonResp({ error: 'bad JSON body' }, 400); }

  if (!payload || (payload.kind !== 'pioneer' && payload.kind !== 'waitlist')) {
    return jsonResp({ error: 'kind must be "pioneer" or "waitlist"' }, 400);
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping send');
    return jsonResp({ ok: true, sent: false, reason: 'no api key' });
  }

  const { subject, html, text } = renderEmail(payload);

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    NOTIFY_FROM,
        to:      [NOTIFY_TO],
        reply_to: payload.kind === 'pioneer' ? payload.data.email : payload.data.email,
        subject,
        html,
        text,
        tags: [
          { name: 'category',  value: 'tradeshow' },
          { name: 'kind',      value: payload.kind },
        ],
      }),
    });

    if (!r.ok) {
      const errBody = await r.text();
      console.error('Resend error', r.status, errBody);
      return jsonResp({ ok: true, sent: false, reason: 'resend error', status: r.status });
    }

    const result = await r.json();
    return jsonResp({ ok: true, sent: true, id: result?.id });
  } catch (e) {
    console.error('Resend fetch threw', e);
    return jsonResp({ ok: true, sent: false, reason: 'fetch threw' });
  }
});

function renderEmail(p: Payload): { subject: string; html: string; text: string } {
  if (p.kind === 'pioneer') {
    const { company_name, state_code, contact_name, email } = p.data;
    const subject = `🎯 New Pioneer signup: ${state_code} — ${company_name}`;
    const html = `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 540px; padding: 24px;">
        <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #B84A20; font-weight: 700;">
          New Pioneer · ${state_code}
        </p>
        <h1 style="margin: 0 0 18px; font-size: 24px; line-height: 1.15; color: #14150F; letter-spacing: -0.02em;">
          ${escapeHtml(company_name)}
        </h1>
        <table style="border-collapse: collapse; width: 100%; font-size: 14px; color: #14150F;">
          <tr><td style="padding: 6px 0; color: #6E6A60; width: 110px;">Contact</td><td style="padding: 6px 0;">${escapeHtml(contact_name)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6E6A60;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #1F4D2C; text-decoration: none;">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #6E6A60;">State</td><td style="padding: 6px 0;"><strong>${state_code}</strong></td></tr>
        </table>
        <p style="margin: 22px 0 0; padding-top: 14px; border-top: 1px solid #E7E0CE; font-size: 12px; color: #6E6A60;">
          From the Denver tradeshow charter QR. State is now locked.
          Reply to this email to reach them directly.
        </p>
      </div>
    `;
    const text = [
      `New Pioneer · ${state_code}`,
      ``,
      `${company_name}`,
      ``,
      `Contact: ${contact_name}`,
      `Email:   ${email}`,
      `State:   ${state_code}`,
      ``,
      `Reply to this email to reach them directly.`,
    ].join('\n');
    return { subject, html, text };
  }

  // waitlist
  const { name, email, company_name, state_code } = p.data;
  const subject = `📩 New waitlist signup: ${name}${state_code ? ' · ' + state_code : ''}`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 540px; padding: 24px;">
      <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #6E6A60; font-weight: 700;">
        Waitlist signup
      </p>
      <h1 style="margin: 0 0 18px; font-size: 22px; line-height: 1.2; color: #14150F; letter-spacing: -0.018em;">
        ${escapeHtml(name)}
      </h1>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px; color: #14150F;">
        <tr><td style="padding: 6px 0; color: #6E6A60; width: 110px;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #1F4D2C; text-decoration: none;">${escapeHtml(email)}</a></td></tr>
        ${company_name ? `<tr><td style="padding: 6px 0; color: #6E6A60;">Company</td><td style="padding: 6px 0;">${escapeHtml(company_name)}</td></tr>` : ''}
        ${state_code   ? `<tr><td style="padding: 6px 0; color: #6E6A60;">State</td><td style="padding: 6px 0;"><strong>${state_code}</strong></td></tr>` : ''}
      </table>
      <p style="margin: 22px 0 0; padding-top: 14px; border-top: 1px solid #E7E0CE; font-size: 12px; color: #6E6A60;">
        From the Denver tradeshow waitlist QR.
      </p>
    </div>
  `;
  const text = [
    `Waitlist signup`,
    ``,
    `Name:    ${name}`,
    `Email:   ${email}`,
    company_name ? `Company: ${company_name}` : null,
    state_code   ? `State:   ${state_code}`   : null,
  ].filter(Boolean).join('\n');
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
