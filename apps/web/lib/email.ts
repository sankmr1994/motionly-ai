import { getServerEnv } from "@motionly/config";
import { Resend } from "resend";

type TransactionalEmail = {
  to: string;
  subject: string;
  heading: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

export async function sendTransactionalEmail(
  email: TransactionalEmail,
): Promise<void> {
  const environment = getServerEnv();
  if (!environment.RESEND_API_KEY || !environment.RESEND_FROM_EMAIL) {
    throw new Error(
      "Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  const resend = new Resend(environment.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: `Motionly <${environment.RESEND_FROM_EMAIL}>`,
    to: email.to,
    subject: email.subject,
    html: `
      <div style="background:#f1f4f8;padding:40px 16px;font-family:Arial,sans-serif;color:#152238">
        <div style="max-width:560px;margin:0 auto;background:#fcfcfa;border:1px solid #dce2eb;padding:40px">
          <p style="margin:0 0 24px;color:#3157e7;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Motionly</p>
          <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px">${escapeHtml(email.heading)}</h1>
          <p style="font-size:16px;line-height:1.7;margin:0 0 28px;color:#526079">${escapeHtml(email.message)}</p>
          <a href="${escapeHtml(email.actionUrl)}" style="display:inline-block;background:#3157e7;color:#fff;text-decoration:none;padding:14px 20px;font-weight:700">${escapeHtml(email.actionLabel)}</a>
          <p style="font-size:13px;line-height:1.6;margin:28px 0 0;color:#738097">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>`,
  });

  if (error) throw new Error(`Resend email delivery failed: ${error.message}`);
}
