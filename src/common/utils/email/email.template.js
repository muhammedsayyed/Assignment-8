import { EmailSubjectEnum } from "../../enum/email.enum.js";

const messageBySubject = {
    [EmailSubjectEnum.CONFIRM_EMAIL]: {
        title: "Confirm your email",
        description: "Use this one-time code to finish creating your Saraha Studio account."
    },
    [EmailSubjectEnum.FORGOT_PASSWORD]: {
        title: "Reset your password",
        description: "Use this one-time code to reset your Saraha Studio password."
    },
    [EmailSubjectEnum.TWO_STEP_VERIFICATION]: {
        title: "Confirm it is you",
        description: "Enter this one-time code to finish signing in to Saraha Studio."
    }
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[character]));

export const verifyEmailTemplate = ({ code, subject, title }) => {
    const content = messageBySubject[subject] ?? {
        title: title ?? "Your verification code",
        description: "Use this one-time code to continue."
    };
    const heading = escapeHtml(title ?? content.title);
    const safeCode = escapeHtml(code);

    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${heading}</title></head>
<body style="margin:0;padding:32px 12px;background:#f4f6f1;font-family:Arial,Helvetica,sans-serif;color:#26372e;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fffefa;border:1px solid #e2e8df;border-radius:16px;overflow:hidden;">
    <tr><td style="padding:28px 32px 22px;">
      <div style="display:inline-block;width:38px;height:38px;line-height:38px;text-align:center;background:#315e4b;color:#fff;border-radius:12px;font-size:21px;font-weight:bold;">s.</div>
      <span style="margin-left:10px;vertical-align:10px;font-size:18px;font-weight:bold;color:#26372e;">Saraha <span style="font-weight:normal;color:#879186;">Studio</span></span>
      <p style="margin:28px 0 8px;color:#829080;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">YOUR SPACE IS WAITING</p>
      <h1 style="margin:0;font-size:28px;line-height:1.25;color:#26372e;">${heading}</h1>
      <p style="margin:12px 0 0;color:#687468;font-size:15px;line-height:1.7;">${escapeHtml(content.description)}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;background:#e9f0e7;border:1px solid #dce7da;border-radius:12px;">
        <tr><td style="padding:20px;text-align:center;">
          <p style="margin:0 0 12px;color:#586a5a;font-size:12px;">YOUR VERIFICATION CODE</p>
          <div style="display:inline-block;padding:14px 22px;background:#315e4b;border-radius:9px;color:#fff;font-size:30px;font-weight:bold;letter-spacing:7px;">${safeCode}</div>
          <p style="margin:12px 0 0;color:#687468;font-size:12px;">This code expires in 2 minutes. Do not share it with anyone.</p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#879186;font-size:12px;line-height:1.6;">If you did not request this code, you can safely ignore this email.</p>
    </td></tr>
  </table>
  <p style="margin:16px auto 0;max-width:560px;text-align:center;color:#9aa397;font-size:11px;">PRIVATE BY DEFAULT &nbsp;·&nbsp; MADE FOR GOOD WORDS</p>
</body>
</html>`;
};
