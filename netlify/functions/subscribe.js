/**
 * Netlify Function: subscribe
 *
 * POST /.netlify/functions/subscribe
 * Body: { "name": "...", "email": "..." }
 *
 * 1. Adds the contact to Brevo list ID 2
 * 2. Sends a welcome transactional email via Brevo
 *
 * Required Netlify environment variables:
 *   BREVO_API_KEY  – your Brevo API key
 *   SENDER_EMAIL   – a Brevo-verified sender address (e.g. hello@yourdomain.com)
 *   SENDER_NAME    – display name for outgoing emails (e.g. "Somehow I Managed")
 */

const https = require('https');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
if (!BREVO_API_KEY) {
  throw new Error('BREVO_API_KEY environment variable is not set');
}

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@somehowimanaged.com';
const SENDER_NAME  = process.env.SENDER_NAME  || 'Somehow I Managed';
const BREVO_LIST_ID = 2;

// ─── helpers ────────────────────────────────────────────────────────────────

function brevoRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path,
      method,
      headers: {
        'accept':       'application/json',
        'content-type': 'application/json',
        'api-key':      BREVO_API_KEY,
        'content-length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

// ─── handler ────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // Parse body
  let name, email;
  try {
    ({ name, email } = JSON.parse(event.body || '{}'));
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  if (!email || !name) {
    return jsonResponse(400, { error: 'name and email are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonResponse(400, { error: 'Invalid email address' });
  }

  const firstName = name.split(' ')[0];
  const lastName  = name.split(' ').slice(1).join(' ') || '';

  // ── Step 1: Create / update contact and add to list ──────────────────────
  const contactRes = await brevoRequest('POST', '/v3/contacts', {
    email,
    attributes: {
      FIRSTNAME: firstName,
      LASTNAME:  lastName,
    },
    listIds: [BREVO_LIST_ID],
    updateEnabled: true,   // update if contact already exists
  });

  const contactOk =
    contactRes.status === 201 ||   // created
    contactRes.status === 204 ||   // updated (no content)
    contactRes.status === 200;

  if (!contactOk) {
    console.error('Brevo contact error:', contactRes);
    const errMsg =
      contactRes.body?.message || 'Failed to add contact to Brevo';
    return jsonResponse(502, { error: errMsg });
  }

  // ── Step 2: Send welcome transactional email ──────────────────────────────
  const emailRes = await brevoRequest('POST', '/v3/smtp/email', {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email, name }],
    subject: `Welcome, ${firstName}! 🎉`,
    htmlContent: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:2rem;color:#111">
        <h1 style="font-size:1.5rem;margin-bottom:0.5rem">Hey ${firstName}, welcome aboard!</h1>
        <p style="color:#555;line-height:1.6;margin-bottom:1rem">
          Thanks for signing up to <strong>Somehow I Managed</strong>.
          You've been added to our list and we'll be in touch soon.
        </p>
        <p style="color:#555;line-height:1.6">
          In the meantime, if you have any questions just hit reply — we'd love to hear from you.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:1.5rem 0" />
        <p style="font-size:0.8rem;color:#999">
          You're receiving this because you signed up at somehowimanaged.com.
          <br />To unsubscribe, reply with "unsubscribe" in the subject line.
        </p>
      </div>
    `,
    textContent: `Hey ${firstName},\n\nThanks for signing up to Somehow I Managed! You're on the list and we'll be in touch soon.\n\nCheers,\n${SENDER_NAME}`,
  });

  if (emailRes.status !== 201) {
    // Contact was added but email failed — still a partial success
    console.error('Brevo email error:', emailRes);
    return jsonResponse(207, {
      message: "You're subscribed! (Welcome email could not be sent — please check Brevo sender verification.)",
      emailError: emailRes.body?.message,
    });
  }

  return jsonResponse(200, {
    message: "You're subscribed! Check your inbox for a welcome email.",
  });
};
