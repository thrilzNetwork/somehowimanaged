/**
 * Netlify Function: subscribe
 *
 * POST /.netlify/functions/subscribe
 * Body: { "name": "...", "email": "..." }
 *
 * Flow:
 *   1. Check Supabase — if email exists, return instant access (no duplicate email)
 *   2. Insert contact into Supabase
 *   3. Add contact to Brevo list
 *   4. Send welcome transactional email via Brevo
 *   5. Mark welcome_email_sent = true in Supabase
 *
 * Required env vars:
 *   BREVO_API_KEY          – Brevo API key
 *   SENDER_EMAIL           – Verified Brevo sender address
 *   SUPABASE_URL           – e.g. https://xxxxxxxxxxxx.supabase.co
 *   SUPABASE_SERVICE_KEY   – Service role key (Supabase → Settings → API)
 *
 * Optional env vars:
 *   SENDER_NAME            – Display name (default: "Somehow I Managed")
 *   NOTIFY_EMAIL           – Your personal email to receive new-signup alerts
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL  = process.env.SENDER_EMAIL  || 'hello@quantumhospitalitysolutions.com';
const SENDER_NAME   = process.env.SENDER_NAME   || 'Somehow I Managed';
const NOTIFY_EMAIL  = process.env.NOTIFY_EMAIL; // owner notification (optional)
const BREVO_LIST_ID = 2;

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY environment variable is not set');

// ─── Supabase REST helper ─────────────────────────────────────────────────────

async function supa(method, table, { query = '', body = null, prefer = 'return=minimal' } = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        prefer,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

// ─── Brevo REST helper ────────────────────────────────────────────────────────

async function brevo(method, path, body) {
  const res = await fetch(`https://api.brevo.com${path}`, {
    method,
    headers: {
      'accept':       'application/json',
      'content-type': 'application/json',
      'api-key':      BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

// ─── Response helper ──────────────────────────────────────────────────────────

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  // Parse body
  let name, email;
  try {
    ({ name, email } = JSON.parse(event.body || '{}'));
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  if (!name || !email) return json(400, { error: 'name and email are required' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return json(400, { error: 'Invalid email address' });

  const firstName = name.split(' ')[0];
  const lastName  = name.split(' ').slice(1).join(' ') || '';

  // ── 1. Deduplicate via Supabase ───────────────────────────────────────────
  if (SUPABASE_URL && SUPABASE_KEY) {
    const check = await supa('GET', 'contacts', {
      query:  `?email=eq.${encodeURIComponent(email)}&select=id`,
      prefer: '',
    });
    if (check && check.data && check.data.length > 0) {
      // Already a member — grant access silently, no email sent
      return json(200, {
        alreadyMember: true,
        message: `Welcome back, ${firstName}! You're already on the list.`,
      });
    }
  }

  // ── 2. Save to Supabase ───────────────────────────────────────────────────
  if (SUPABASE_URL && SUPABASE_KEY) {
    const insert = await supa('POST', 'contacts', {
      body: {
        name,
        email,
        welcome_email_sent: false,
        source:  event.headers?.['referer'] || 'direct',
        country: event.headers?.['x-country'] || null,
      },
    });
    if (insert && insert.status !== 201) {
      console.error('Supabase insert error:', insert);
    }
  }

  // ── 3. Add to Brevo list ──────────────────────────────────────────────────
  const contactRes = await brevo('POST', '/v3/contacts', {
    email,
    attributes:    { FIRSTNAME: firstName, LASTNAME: lastName },
    listIds:       [BREVO_LIST_ID],
    updateEnabled: true,
  });

  if (![200, 201, 204].includes(contactRes.status)) {
    console.error('Brevo contact error:', contactRes);
    return json(502, { error: contactRes.body?.message || 'Failed to add contact' });
  }

  // ── 4. Send welcome email ─────────────────────────────────────────────────
  const emailRes = await brevo('POST', '/v3/smtp/email', {
    sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
    to:          [{ email, name }],
    subject:     `You're in, ${firstName}! Welcome to Somehow I Managed 🎉`,
    htmlContent: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:2rem;color:#111">
        <h1 style="font-size:1.5rem;margin-bottom:0.75rem">Hey ${firstName}, you're in! 🎉</h1>
        <p style="color:#555;line-height:1.6;margin-bottom:1rem">
          Welcome to <strong>Somehow I Managed</strong>.
          You've got early access and we'll keep you in the loop on the book, behind-the-scenes, and everything we're building.
        </p>
        <p style="color:#555;line-height:1.6;margin-bottom:1.5rem">
          Follow along on social for daily updates — links are on the site.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:1.5rem 0" />
        <p style="font-size:0.8rem;color:#999">
          You signed up at somehowimanaged.com. Reply to unsubscribe.
        </p>
      </div>
    `,
    textContent: `Hey ${firstName},\n\nYou're in! Welcome to Somehow I Managed.\n\nWe'll keep you posted on the book and everything we're building.\n\n— ${SENDER_NAME}`,
  });

  // ── 5. Mark welcome email sent in Supabase ────────────────────────────────
  if (emailRes.status === 201 && SUPABASE_URL && SUPABASE_KEY) {
    await supa('PATCH', 'contacts', {
      query: `?email=eq.${encodeURIComponent(email)}`,
      body:  { welcome_email_sent: true },
    });
  }

  // ── 6. Notify the owner of every new signup ───────────────────────────────
  if (NOTIFY_EMAIL) {
    const signupTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' });
    await brevo('POST', '/v3/smtp/email', {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to:     [{ email: NOTIFY_EMAIL }],
      subject: `New signup: ${name}`,
      htmlContent: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:1.5rem;color:#111">
          <p style="font-size:1.1rem;font-weight:700;margin-bottom:1rem">📬 New signup on Somehow I Managed</p>
          <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
            <tr><td style="padding:0.4rem 0;color:#666;width:80px">Name</td><td style="padding:0.4rem 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:0.4rem 0;color:#666">Email</td><td style="padding:0.4rem 0;font-weight:600">${email}</td></tr>
            <tr><td style="padding:0.4rem 0;color:#666">Country</td><td style="padding:0.4rem 0">${country || '—'}</td></tr>
            <tr><td style="padding:0.4rem 0;color:#666">Source</td><td style="padding:0.4rem 0;font-size:0.8rem;color:#888">${source}</td></tr>
            <tr><td style="padding:0.4rem 0;color:#666">Time</td><td style="padding:0.4rem 0">${signupTime} ET</td></tr>
          </table>
        </div>
      `,
      textContent: `New signup!\n\nName: ${name}\nEmail: ${email}\nCountry: ${country || '—'}\nSource: ${source}\nTime: ${signupTime} ET`,
    }).catch(err => console.error('Owner notification failed:', err));
  }

  if (emailRes.status !== 201) {
    console.error('Brevo email error:', emailRes.status, JSON.stringify(emailRes.body));
    return json(207, {
      message: `You're on the list, ${firstName}! (Welcome email delayed — check Brevo sender verification.)`,
      emailError: emailRes.body?.message,
    });
  }

  return json(200, {
    message: `You're in, ${firstName}! Check your inbox for a welcome email.`,
  });
};
