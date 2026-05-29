/**
 * Envoi d'email via l'API HTTP Resend (compatible Cloudflare Workers — pas de SMTP).
 */
export async function sendActivationEmail(
  env: { RESEND_API_KEY: string; EMAIL_FROM: string; APP_PUBLIC_URL: string; APP_NAME: string },
  email: string,
  tier: string,
  token: string,
): Promise<void> {
  const tierLabel = ({ basique: 'Basique', pro: 'Pro', pro_lifetime: 'Pro Lifetime' } as Record<string, string>)[tier] || tier;
  const activationUrl = `${env.APP_PUBLIC_URL.replace(/\/$/, '')}/admin/license?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2>Merci pour ton achat — ${env.APP_NAME} ${tierLabel}</h2>
      <p>Voici ton code d'activation. Il est valable 1 an et utilisable une seule fois :</p>
      <p style="font-family:monospace;font-size:20px;background:#f3f4f6;padding:14px;border-radius:8px;letter-spacing:2px;text-align:center">
        ${token}
      </p>
      <p>Pour activer ta licence :</p>
      <ol>
        <li>Ouvre ${env.APP_NAME} (ou télécharge-le si ce n'est pas déjà fait).</li>
        <li>Va dans <strong>Paramètres → Licence</strong>.</li>
        <li>Colle ton code dans l'onglet <strong>« Activer un code d'achat »</strong>.</li>
      </ol>
      <p>Tu peux aussi cliquer directement ici depuis le PC où l'app est installée :
        <a href="${activationUrl}">${activationUrl}</a></p>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email,
      subject: `Ton code d'activation ${env.APP_NAME} ${tierLabel}`,
      html,
      text: `Code d'activation : ${token}`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
}
