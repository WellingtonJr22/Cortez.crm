// Email sending helper for Cortez CRM.
//
// Uses Resend (https://resend.com) — a provider with a free tier — over its
// plain HTTP API, so no extra npm dependency is required. Configuration is read
// from environment variables and never hard-coded:
//
//   RESEND_API_KEY  (required to actually send) — your Resend API key.
//   EMAIL_FROM      (optional) — the "From" address, e.g.
//                   "Cortez CRM <equipe@suaempresa.com>". Defaults to Resend's
//                   shared onboarding sender, which works without verifying a
//                   domain but can only deliver to your own Resend account email.
//
// When RESEND_API_KEY is not set, sending is skipped gracefully (the invite is
// still created) and the caller is told the email was not sent.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Cortez CRM <onboarding@resend.dev>";

export interface SendResult {
  sent: boolean;
  // true when no API key is configured, so nothing was attempted.
  skipped?: boolean;
  error?: string;
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail({ to, subject, html, text }: SendOptions): Promise<SendResult> {
  const apiKey = Netlify.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { sent: false, skipped: true };
  }
  const from = Netlify.env.get("EMAIL_FROM") || DEFAULT_FROM;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Resend send failed", res.status, detail);
      return { sent: false, error: `Falha no envio (${res.status}).` };
    }
    return { sent: true };
  } catch (err) {
    console.error("Resend request error", err);
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
  vendedor: "Vendedor",
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
