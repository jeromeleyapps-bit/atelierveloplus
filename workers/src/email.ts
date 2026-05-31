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
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2>Merci pour ton achat — ${env.APP_NAME} ${tierLabel}</h2>
      <p>Voici ton code d'activation. Il est valable 1 an et utilisable une seule fois :</p>
      <p style="font-family:monospace;font-size:22px;background:#f3f4f6;padding:16px;border-radius:8px;letter-spacing:2px;text-align:center">
        ${token}
      </p>
      <p>Pas encore installé ? Télécharge l'application ici :</p>
      <p style="text-align:center;margin:16px 0">
        <a href="https://downloads.upgradedbikes.com/AtelierVeloPlus-Setup.exe"
           style="display:inline-block;background:#1e6091;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">
          ⬇ Télécharger pour Windows
        </a>
      </p>
      <p>Pour activer ta licence, depuis l'ordinateur où ${env.APP_NAME} est installé :</p>
      <ol>
        <li>Ouvre ${env.APP_NAME}.</li>
        <li>Va dans <strong>Mon compte → Gérer ma licence</strong> (ou <strong>Paramètres → Licence</strong>).</li>
        <li>Dans la carte <strong>« Activer un code d'achat »</strong>, colle le code ci-dessus et clique sur <strong>Activer</strong>.</li>
      </ol>
      <p style="background:#fff7ed;border:1px solid #fed7aa;padding:12px;border-radius:8px;font-size:14px">
        <strong>⚠️ Conserve cet email.</strong> Ce code te permet de réinstaller le logiciel sur ce
        même ordinateur. En cas de changement de matériel, contacte le support (atelier-velo-plus@upgradedbikes.com)
        pour transférer ta licence.
      </p>
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
