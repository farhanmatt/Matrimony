import nodemailer from "nodemailer";

type ProfileCreatedEmailParams = {
  to: string;
  recipientName?: string | null;
  profileName: string;
};

type ProfileLikedEmailParams = {
  to: string;
  recipientName?: string | null;
  likedByName: string;
};

type PasswordResetCodeEmailParams = {
  to: string;
  recipientName?: string | null;
  verificationCode: string;
  expiresInMinutes: number;
};

type RegistrationOtpEmailParams = {
  to: string;
  recipientName?: string | null;
  verificationCode: string;
  expiresInMinutes: number;
};

type PasswordChangedEmailParams = {
  to: string;
  recipientName?: string | null;
};

type SendEmailResult =
  | { ok: true; status: "sent" }
  | { ok: false; status: "skipped" | "failed"; reason: string };

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function getSmtpConfig() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) {
    return null;
  }

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT?.trim() || "465");
  const secure =
    (process.env.SMTP_SECURE?.trim() || "").toLowerCase() === "true" ||
    port === 465;

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: process.env.MAIL_FROM?.trim() || user,
  };
}

async function getTransporter() {
  const config = getSmtpConfig();
  if (!config) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      })
    );
  }

  return transporterPromise;
}

function getFriendlyEmailErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : "Unknown email sending error";

  if (
    rawMessage.includes("535-5.7.8") ||
    rawMessage.includes("BadCredentials") ||
    rawMessage.includes("Invalid login")
  ) {
    return "Gmail rejected the SMTP login. Use a 16-character Gmail App Password in SMTP_PASS instead of your normal Gmail password.";
  }

  if (
    rawMessage.includes("ETIMEOUT") ||
    rawMessage.includes("ECONNECTION") ||
    rawMessage.includes("Connection timeout")
  ) {
    return "The app could not reach the Gmail SMTP server. Check your network/firewall and try again.";
  }

  return rawMessage;
}


function buildEmailTemplate(title: string, preheader: string, content: string) {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#334155;-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05),0 8px 10px -6px rgba(0,0,0,0.01);overflow:hidden;">
          <tr>
            <td align="center" style="padding:40px 40px 30px;background-color:#ffffff;border-bottom:1px solid #f1f5f9;">
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#e11d48;letter-spacing:-0.5px;text-transform:uppercase;">
                MIP Matrimony
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0 0 10px;font-size:14px;color:#64748b;font-weight:600;">
                MIP Matrimony
              </p>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                This email was sent to you regarding your account on MIP Matrimony. If you did not request this, please ignore this email or contact support.
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#cbd5e1;">
                &copy; ${currentYear} MIP Matrimony. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  );
}

async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  skippedReason,
  errorContext,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  skippedReason: string;
  errorContext: string;
}): Promise<SendEmailResult> {
  const config = getSmtpConfig();
  if (!config) {
    console.warn(skippedReason);
    return { ok: false, status: "skipped", reason: skippedReason };
  }

  try {
    const transporter = await getTransporter();
    if (!transporter) {
      return {
        ok: false,
        status: "failed",
        reason: "Email transporter could not be created.",
      };
    }

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
      text,
    });

    return { ok: true, status: "sent" };
  } catch (error) {
    console.error(`${errorContext}:`, error);
    return {
      ok: false,
      status: "failed",
      reason: getFriendlyEmailErrorMessage(error),
    };
  }
}

function buildProfileCreatedEmailHtml({
  recipientName,
  profileName,
}: Omit<ProfileCreatedEmailParams, "to">) {
  const appUrl = getAppUrl();
  const firstName = recipientName?.trim() || "there";
  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;padding:8px 16px;border-radius:999px;background:#ecfdf3;color:#047857;font-size:13px;font-weight:700;letter-spacing:0.5px;margin-bottom:20px;">
        SUCCESSFULLY CREATED
      </div>
      <h2 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#0f172a;">Welcome to MIP Matrimony</h2>
      <p style="margin:0;font-size:17px;line-height:1.6;color:#475569;">
        Hi ${firstName}, your profile <strong>${profileName}</strong> is now live!
      </p>
    </div>
    
    <div style="background-color:#f8fafc;padding:24px;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:32px;">
      <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1e293b;">What's next?</p>
      <ul style="margin:0;padding:0 0 0 24px;font-size:15px;line-height:1.8;color:#475569;">
        <li style="margin-bottom:8px;">Complete your bio to get 3x more matches.</li>
        <li style="margin-bottom:8px;">Upload high-quality photos.</li>
        <li>Browse matches and express interest!</li>
      </ul>
    </div>

    <div style="text-align:center;">
      <a href="${appUrl}/dashboard" style="display:inline-block;padding:16px 32px;border-radius:12px;background-color:#e11d48;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;box-shadow:0 4px 6px -1px rgba(225, 29, 72, 0.2);">
        Go to Dashboard
      </a>
    </div>
  `;
  return buildEmailTemplate("Welcome to MIP Matrimony", "Your profile has been successfully created", content);
}

function buildProfileCreatedEmailText({
  recipientName,
  profileName,
}: Omit<ProfileCreatedEmailParams, "to">) {
  const appUrl = getAppUrl();
  const firstName = recipientName?.trim() || "there";

  return [
    `Hi ${firstName},`,
    "",
    `Your matrimony profile "${profileName}" has been created successfully on MIP Matrimony.`,
    "",
    "You can now browse profiles, receive likes, and explore your matches.",
    "",
    `Open your dashboard: ${appUrl}/dashboard`,
    "",
    "If you did not create this profile, please contact support immediately.",
  ].join("\n");
}

function buildProfileLikedEmailHtml({
  recipientName,
  likedByName,
}: Omit<ProfileLikedEmailParams, "to">) {
  const appUrl = getAppUrl();
  const firstName = recipientName?.trim() || "there";
  const admirerName = likedByName.trim() || "Another MIP Matrimony member";
  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;padding:8px 16px;border-radius:999px;background:#fefce8;color:#a16207;font-size:13px;font-weight:700;letter-spacing:0.5px;margin-bottom:20px;">
        NEW INTEREST
      </div>
      <h2 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#0f172a;">Someone liked your profile!</h2>
      <p style="margin:0;font-size:17px;line-height:1.6;color:#475569;">
        Hi ${firstName}, <strong>${admirerName}</strong> just expressed interest in your profile.
      </p>
    </div>
    
    <div style="background-color:#f8fafc;padding:24px;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:32px;text-align:center;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">
        Don't keep them waiting! Log in now to view their full profile and decide if you'd like to connect.
      </p>
      <a href="${appUrl}/dashboard/received-likes" style="display:inline-block;padding:14px 28px;border-radius:12px;background-color:#e11d48;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
        View their Profile
      </a>
    </div>
  `;
  return buildEmailTemplate("Someone liked your profile", "You have received a new like on MIP Matrimony", content);
}

function buildProfileLikedEmailText({
  recipientName,
  likedByName,
}: Omit<ProfileLikedEmailParams, "to">) {
  const appUrl = getAppUrl();
  const firstName = recipientName?.trim() || "there";
  const admirerName = likedByName.trim() || "Another MIP Matrimony member";

  return [
    `Hi ${firstName},`,
    "",
    `${admirerName} liked your profile on MIP Matrimony.`,
    "",
    "Open your received likes to review their profile and respond if you are interested.",
    "",
    `View received likes: ${appUrl}/dashboard/received-likes`,
  ].join("\n");
}

function buildPasswordResetCodeEmailHtml({
  recipientName,
  verificationCode,
  expiresInMinutes,
}: Omit<PasswordResetCodeEmailParams, "to">) {
  const firstName = recipientName?.trim() || "there";
  const content = `
    <h2 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#0f172a;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">
      Hi ${firstName},<br><br>
      We received a request to reset the password for your MIP Matrimony account. Use the code below to proceed.
    </p>
    <div style="text-align:center;margin:32px 0;padding:32px 24px;background-color:#fff1f2;border-radius:16px;border:2px dashed #fda4af;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#e11d48;text-transform:uppercase;letter-spacing:1.5px;">Password Reset Code</p>
      <p style="margin:0;font-size:48px;font-weight:800;letter-spacing:8px;color:#e11d48;">${verificationCode}</p>
    </div>
    <div style="background-color:#f8fafc;padding:20px;border-radius:12px;border-left:4px solid #cbd5e1;">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#64748b;">
        This code expires in <strong>${expiresInMinutes} minutes</strong>. 
      </p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:#94a3b8;">
        If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
      </p>
    </div>
  `;
  return buildEmailTemplate("Reset Password - MIP Matrimony", "Use this code to reset your password", content);
}

function buildPasswordResetCodeEmailText({
  recipientName,
  verificationCode,
  expiresInMinutes,
}: Omit<PasswordResetCodeEmailParams, "to">) {
  const firstName = recipientName?.trim() || "there";

  return [
    `Hi ${firstName},`,
    "",
    "Use this verification code to finish resetting your MIP Matrimony password:",
    "",
    verificationCode,
    "",
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request a password reset, you can safely ignore this email.",
  ].join("\n");
}

function buildRegistrationOtpEmailHtml({
  recipientName,
  verificationCode,
  expiresInMinutes,
}: Omit<RegistrationOtpEmailParams, "to">) {
  const firstName = recipientName?.trim() || "there";
  const content = `
    <h2 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#0f172a;">Verify your account</h2>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">
      Hi ${firstName},<br><br>
      Please use the following OTP to finish creating your MIP Matrimony account.
    </p>
    <div style="text-align:center;margin:32px 0;padding:32px 24px;background-color:#fff1f2;border-radius:16px;border:2px dashed #fda4af;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#e11d48;text-transform:uppercase;letter-spacing:1.5px;">Your OTP Code</p>
      <p style="margin:0;font-size:48px;font-weight:800;letter-spacing:8px;color:#e11d48;">${verificationCode}</p>
    </div>
    <div style="background-color:#f8fafc;padding:20px;border-radius:12px;border-left:4px solid #cbd5e1;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:#64748b;">
        This OTP expires in <strong>${expiresInMinutes} minutes</strong>. Your account will only be created after this code is verified.
      </p>
    </div>
  `;
  return buildEmailTemplate("Your OTP Code - MIP Matrimony", "Use this OTP to finish creating your account", content);
}

function buildRegistrationOtpEmailText({
  recipientName,
  verificationCode,
  expiresInMinutes,
}: Omit<RegistrationOtpEmailParams, "to">) {
  const firstName = recipientName?.trim() || "there";

  return [
    `Hi ${firstName},`,
    "",
    "Use this OTP to finish creating your MIP Matrimony account:",
    "",
    verificationCode,
    "",
    `This OTP expires in ${expiresInMinutes} minutes.`,
    "",
    "Your account will only be created after this code is verified.",
  ].join("\n");
}

function buildPasswordChangedEmailHtml({
  recipientName,
}: Omit<PasswordChangedEmailParams, "to">) {
  const appUrl = getAppUrl();
  const firstName = recipientName?.trim() || "there";
  const content = `
    <h2 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#0f172a;">Password Updated</h2>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">
      Hi ${firstName},<br><br>
      This is a confirmation that the password for your MIP Matrimony account was recently changed.
    </p>
    
    <div style="background-color:#f8fafc;padding:20px;border-radius:12px;border-left:4px solid #10b981;margin-bottom:24px;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:#047857;font-weight:600;">
        If you made this change, no further action is required.
      </p>
    </div>

    <div style="background-color:#fff1f2;padding:20px;border-radius:12px;border:1px solid #ffe4ea;margin-bottom:32px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#e11d48;">Didn't make this change?</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
        Reset your password immediately and contact support if you believe someone accessed your account without permission.
      </p>
    </div>

    <a href="${appUrl}/login" style="display:inline-block;padding:14px 28px;border-radius:12px;background-color:#1e293b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
      Sign in to your account
    </a>
  `;
  return buildEmailTemplate("Password Changed - MIP Matrimony", "Your account password was successfully updated", content);
}

function buildPasswordChangedEmailText({
  recipientName,
}: Omit<PasswordChangedEmailParams, "to">) {
  const appUrl = getAppUrl();
  const firstName = recipientName?.trim() || "there";

  return [
    `Hi ${firstName},`,
    "",
    "Your MIP Matrimony password has been updated successfully.",
    "",
    "If this was you, no further action is needed.",
    "",
    "If you did not make this change, reset your password again immediately and contact support.",
    "",
    `Sign in: ${appUrl}/login`,
  ].join("\n");
}

export async function sendProfileCreatedEmail({
  to,
  recipientName,
  profileName,
}: ProfileCreatedEmailParams): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: "Your MIP Matrimony profile has been created",
    html: buildProfileCreatedEmailHtml({ recipientName, profileName }),
    text: buildProfileCreatedEmailText({ recipientName, profileName }),
    skippedReason:
      "SMTP_USER / SMTP_PASS are not configured. Profile email was skipped.",
    errorContext: "Profile created email error",
  });
}

export async function sendProfileLikedEmail({
  to,
  recipientName,
  likedByName,
}: ProfileLikedEmailParams): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: "Your profile was liked on MIP Matrimony",
    html: buildProfileLikedEmailHtml({ recipientName, likedByName }),
    text: buildProfileLikedEmailText({ recipientName, likedByName }),
    skippedReason:
      "SMTP_USER / SMTP_PASS are not configured. Like notification email was skipped.",
    errorContext: "Profile liked email error",
  });
}

export async function sendPasswordResetCodeEmail({
  to,
  recipientName,
  verificationCode,
  expiresInMinutes,
}: PasswordResetCodeEmailParams): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: "Your MIP Matrimony password reset code",
    html: buildPasswordResetCodeEmailHtml({
      recipientName,
      verificationCode,
      expiresInMinutes,
    }),
    text: buildPasswordResetCodeEmailText({
      recipientName,
      verificationCode,
      expiresInMinutes,
    }),
    skippedReason:
      "SMTP_USER / SMTP_PASS are not configured. Password reset email was skipped.",
    errorContext: "Password reset email error",
  });
}

export async function sendRegistrationOtpEmail({
  to,
  recipientName,
  verificationCode,
  expiresInMinutes,
}: RegistrationOtpEmailParams): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: "Your MIP Matrimony registration OTP",
    html: buildRegistrationOtpEmailHtml({
      recipientName,
      verificationCode,
      expiresInMinutes,
    }),
    text: buildRegistrationOtpEmailText({
      recipientName,
      verificationCode,
      expiresInMinutes,
    }),
    skippedReason:
      "SMTP_USER / SMTP_PASS are not configured. Registration OTP email was skipped.",
    errorContext: "Registration OTP email error",
  });
}

export async function sendPasswordChangedEmail({
  to,
  recipientName,
}: PasswordChangedEmailParams): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: "Your MIP Matrimony password was changed",
    html: buildPasswordChangedEmailHtml({ recipientName }),
    text: buildPasswordChangedEmailText({ recipientName }),
    skippedReason:
      "SMTP_USER / SMTP_PASS are not configured. Password changed email was skipped.",
    errorContext: "Password changed email error",
  });
}

export async function sendMobileSelfieLinkEmail({
  to,
  recipientName,
  link,
}: {
  to: string;
  recipientName?: string | null;
  link: string;
}): Promise<SendEmailResult> {
  const name = recipientName || "User";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2>Hello ${name},</h2>
      <p>Please use the link below to securely capture and upload your selfie photos from your mobile device.</p>
      <p><a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #e11d48; color: white; text-decoration: none; border-radius: 5px;">Capture Selfie</a></p>
      <p>If the button doesn't work, copy and paste this link into your mobile browser:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link will expire in 15 minutes.</p>
    </div>
  `;
  const text = `Hello ${name},\n\nPlease use this link to capture your selfie photos securely on your mobile device:\n${link}\n\nThis link will expire in 15 minutes.`;

  return sendTransactionalEmail({
    to,
    subject: "Action Required: Capture your Selfie Photos",
    html,
    text,
    skippedReason: "SMTP_USER / SMTP_PASS not configured. Selfie email skipped.",
    errorContext: "Selfie mobile link email error",
  });
}
