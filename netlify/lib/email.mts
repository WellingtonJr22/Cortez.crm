// Email sending helper for Cortez CRM.
//
// Supports three providers, all with a free tier, over their plain HTTP APIs —
// so no extra npm dependency is required. The provider is chosen automatically
// by whichever API key is present in the environment (Brevo first, then
// SendGrid, then Resend). Configuration is read from environment variables and
// never hard-coded.
//
// To send invitations to ANY recipient for free WITHOUT owning a domain, use
// Brevo or SendGrid: create a free account, verify a single sender email
// address (a one-time confirmation email to, e.g., your own Gmail), set its key,
// and set EMAIL_FROM to that verified address.
//
//   BREVO_API_KEY     — Brevo (brevo.com) API key. Free: 300 emails/day.
//   SENDGRID_API_KEY  — SendGrid API key. Free: 100 emails/day.
//   RESEND_API_KEY    — Resend API key. NOTE: Resend's shared sender only
//                       delivers to your own Resend account email; to reach any
//                       recipient it requires a fully verified DOMAIN.
//   EMAIL_FROM        — the "From" address, e.g.
//                       "Cortez CRM <equipe@suaempresa.com>". REQUIRED for Brevo
//                       and SendGrid (must be your verified sender). For Resend
//                       it defaults to the shared onboarding sender.
//
// When no provider key is set, sending is skipped gracefully (the invite is
// still created) and the caller is told the email was not sent.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";
const RESEND_DEFAULT_FROM = "Cortez CRM <onboarding@resend.dev>";

export interface SendResult {
  sent: boolean;
  // true when no provider is configured, so nothing was attempted.
  skipped?: boolean;
  error?: string;
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Parse a "Name <email@host>" or bare "email@host" string into parts.
function parseFrom(raw: string): { name: string; email: string } {
  const match = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) return { name: match[1] || "Cortez CRM", email: match[2].trim() };
  return { name: "Cortez CRM", email: raw.trim() };
}

async function sendViaBrevo(apiKey: string, from: string, opts: SendOptions): Promise<SendResult> {
  const sender = parseFrom(from);
  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
      textContent: opts.text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Brevo send failed", res.status, detail);
    return { sent: false, error: brevoHint(res.status) };
  }
  return { sent: true };
}

function brevoHint(status: number): string {
  if (status === 401) return "Chave do Brevo inválida (BREVO_API_KEY).";
  if (status === 400) return "Remetente não verificado no Brevo. Verifique o EMAIL_FROM no painel do Brevo.";
  return `Falha no envio pelo Brevo (${status}).`;
}

async function sendViaSendgrid(apiKey: string, from: string, opts: SendOptions): Promise<SendResult> {
  const sender = parseFrom(from);
  const res = await fetch(SENDGRID_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }] }],
      from: { email: sender.email, name: sender.name },
      subject: opts.subject,
      content: [
        { type: "text/plain", value: opts.text },
        { type: "text/html", value: opts.html },
      ],
    }),
  });
  // SendGrid returns 202 Accepted on success.
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("SendGrid send failed", res.status, detail);
    if (res.status === 403) {
      return { sent: false, error: "Remetente não verificado no SendGrid. Verifique o EMAIL_FROM (Single Sender Verification)." };
    }
    if (res.status === 401) return { sent: false, error: "Chave do SendGrid inválida (SENDGRID_API_KEY)." };
    return { sent: false, error: `Falha no envio pelo SendGrid (${res.status}).` };
  }
  return { sent: true };
}

async function sendViaResend(apiKey: string, from: string, opts: SendOptions): Promise<SendResult> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Resend send failed", res.status, detail);
    // Resend's shared sender refuses any recipient other than the account owner.
    if (res.status === 403 && from === RESEND_DEFAULT_FROM) {
      return {
        sent: false,
        error:
          "O remetente padrão do Resend só entrega para o email da sua própria conta Resend. Para enviar a qualquer email, use Brevo ou SendGrid (verifique um remetente) ou verifique um domínio no Resend.",
      };
    }
    return { sent: false, error: `Falha no envio (${res.status}).` };
  }
  return { sent: true };
}

async function sendEmail(opts: SendOptions): Promise<SendResult> {
  const brevoKey = Netlify.env.get("BREVO_API_KEY");
  const sendgridKey = Netlify.env.get("SENDGRID_API_KEY");
  const resendKey = Netlify.env.get("RESEND_API_KEY");
  const from = Netlify.env.get("EMAIL_FROM");

  try {
    if (brevoKey) {
      if (!from) return { sent: false, error: "Configure EMAIL_FROM com seu remetente verificado no Brevo." };
      return await sendViaBrevo(brevoKey, from, opts);
    }
    if (sendgridKey) {
      if (!from) return { sent: false, error: "Configure EMAIL_FROM com seu remetente verificado no SendGrid." };
      return await sendViaSendgrid(sendgridKey, from, opts);
    }
    if (resendKey) {
      return await sendViaResend(resendKey, from || RESEND_DEFAULT_FROM, opts);
    }
    return { sent: false, skipped: true };
  } catch (err) {
    console.error("Email request error", err);
    return { sent: false, error: "Não foi possível contatar o serviço de email." };
  }
}

// Resolve the public site URL from Netlify-provided env vars, falling back to
// the production domain.
function siteUrl(): string {
  return (
    Netlify.env.get("URL") ||
    Netlify.env.get("DEPLOY_PRIME_URL") ||
    "https://cortezcrm.netlify.app"
  ).replace(/\/$/, "");
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  atendente: "Atendente",
};

export async function sendInviteEmail(email: string, role: string): Promise<SendResult> {
  const roleLabel = ROLE_LABELS[role] || role;
  const link = `${siteUrl()}/login?invite=1&email=${encodeURIComponent(email)}`;

  const subject = "Você foi convidado para o Cortez CRM";
  const text = [
    `Você foi convidado para participar do Cortez CRM como ${roleLabel}.`,
    "",
    "Para acessar, crie sua conta usando este mesmo email:",
    link,
    "",
    "Se você não esperava este convite, pode ignorar esta mensagem.",
  ].join("\n");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h2 style="margin:0 0 8px">Cortez CRM</h2>
    <p style="font-size:15px;line-height:1.5;color:#334155">
      Você foi convidado para participar do <strong>Cortez CRM</strong> com a função
      <strong>${roleLabel}</strong>.
    </p>
    <p style="font-size:15px;line-height:1.5;color:#334155">
      Para começar, crie sua conta usando este mesmo endereço de email:
    </p>
    <p style="margin:24px 0">
      <a href="${link}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;display:inline-block">
        Criar minha conta
      </a>
    </p>
    <p style="font-size:13px;line-height:1.5;color:#64748b">
      Se o botão não funcionar, copie e cole este link no navegador:<br>
      <a href="${link}" style="color:#2563eb">${link}</a>
    </p>
    <p style="font-size:13px;line-height:1.5;color:#94a3b8;margin-top:24px">
      Se você não esperava este convite, pode ignorar esta mensagem.
    </p>
  </div>`;

  return sendEmail({ to: email, subject, html, text });
}
