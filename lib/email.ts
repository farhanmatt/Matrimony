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

  return `
    <div style="margin:0;padding:32px 16px;background:#fff8fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ffe4ea;border-radius:24px;overflow:hidden;box-shadow:0 20px 48px rgba(15,23,42,0.08);">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#fffafc 0%,#fff1f6 100%);border-bottom:1px solid #ffe4ea;">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#ecfdf3;color:#047857;font-size:12px;font-weight:700;letter-spacing:0.04em;">
            PROFILE CREATED
          </div>
          <h1 style="margin:18px 0 8px;font-size:32px;line-height:1.15;color:#0f172a;">Welcome to Vivah Bandhan</h1>
          <p style="margin:0;font-size:16px;line-height:1.7;color:#475569;">
            Hi ${firstName}, your matrimony profile has been created successfully.
          </p>
        </div>

        <div style="padding:32px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#475569;">
            We have successfully registered your profile
            <strong style="color:#0f172a;"> ${profileName}</strong> on Vivah Bandhan.
            You can now browse profiles, receive likes, and find your perfect match.
          </p>

          <div style="margin:24px 0;padding:18px 20px;border-radius:18px;background:#fff7fa;border:1px solid #ffe1ea;">
            <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#e11d48;">What you can do next</p>
            <ul style="margin:0;padding-left:18px;color:#475569;font-size:15px;line-height:1.8;">
              <li>Complete any remaining profile details</li>
              <li>Browse recommended profiles</li>
              <li>Set partner preferences</li>
              <li>Respond to likes and mutual matches</li>
            </ul>
          </div>

          <div style="margin-top:30px;">
            <a href="${appUrl}/dashboard" style="display:inline-block;padding:14px 24px;border-radius:14px;background:linear-gradient(135deg,#e11d48 0%,#ec4899 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
              Open Your Dashboard
            </a>
          </div>

          <p style="margin:28px 0 0;font-size:14px;line-height:1.8;color:#64748b;">
            If you did not create this profile, please contact support immediately.
          </p>
        </div>
      </div>
    </div>
  `;
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
    `Your matrimony profile "${profileName}" has been created successfully on Vivah Bandhan.`,
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
  const admirerName = likedByName.trim() || "Another Vivah Bandhan member";

  return `
    <div style="margin:0;padding:32px 16px;background:#fff8fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ffe4ea;border-radius:24px;overflow:hidden;box-shadow:0 20px 48px rgba(15,23,42,0.08);">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#fffafc 0%,#fff1f6 100%);border-bottom:1px solid #ffe4ea;">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#fff1f2;color:#e11d48;font-size:12px;font-weight:700;letter-spacing:0.04em;">
            NEW LIKE
          </div>
          <h1 style="margin:18px 0 8px;font-size:32px;line-height:1.15;color:#0f172a;">Someone liked your profile</h1>
          <p style="margin:0;font-size:16px;line-height:1.7;color:#475569;">
            Hi ${firstName}, you have received a new like on Vivah Bandhan.
          </p>
        </div>

        <div style="padding:32px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#475569;">
            <strong style="color:#0f172a;">${admirerName}</strong> liked your profile. Visit your dashboard to review the profile and respond if you are interested.
          </p>

          <div style="margin:24px 0;padding:18px 20px;border-radius:18px;background:#fff7fa;border:1px solid #ffe1ea;">
            <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#e11d48;">What you can do next</p>
            <ul style="margin:0;padding-left:18px;color:#475569;font-size:15px;line-height:1.8;">
              <li>Open your received likes</li>
              <li>Review the member's profile details</li>
              <li>Like back to create a mutual match</li>
            </ul>
          </div>

          <div style="margin-top:30px;">
            <a href="${appUrl}/dashboard/received-likes" style="display:inline-block;padding:14px 24px;border-radius:14px;background:linear-gradient(135deg,#e11d48 0%,#ec4899 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
              View Received Likes
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildProfileLikedEmailText({
  recipientName,
  likedByName,
}: Omit<ProfileLikedEmailParams, "to">) {
  const appUrl = getAppUrl();
  const firstName = recipientName?.trim() || "there";
  const admirerName = likedByName.trim() || "Another Vivah Bandhan member";

  return [
    `Hi ${firstName},`,
    "",
    `${admirerName} liked your profile on Vivah Bandhan.`,
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

  return `
    <div style="margin:0;padding:32px 16px;background:#fff8fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ffe4ea;border-radius:24px;overflow:hidden;box-shadow:0 20px 48px rgba(15,23,42,0.08);">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#fffafc 0%,#fff1f6 100%);border-bottom:1px solid #ffe4ea;">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#fff1f2;color:#e11d48;font-size:12px;font-weight:700;letter-spacing:0.04em;">
            PASSWORD RESET
          </div>
          <h1 style="margin:18px 0 8px;font-size:32px;line-height:1.15;color:#0f172a;">Your verification code</h1>
          <p style="margin:0;font-size:16px;line-height:1.7;color:#475569;">
            Hi ${firstName}, use the verification code below to reset your Vivah Bandhan password.
          </p>
        </div>

        <div style="padding:32px;">
          <div style="margin:0 0 24px;padding:20px;border-radius:20px;background:#fff7fa;border:1px solid #ffe1ea;text-align:center;">
            <p style="margin:0 0 10px;font-size:14px;font-weight:700;letter-spacing:0.12em;color:#e11d48;">VERIFICATION CODE</p>
            <div style="font-size:34px;letter-spacing:0.35em;font-weight:700;color:#0f172a;">${verificationCode}</div>
          </div>

          <p style="margin:0;font-size:15px;line-height:1.8;color:#475569;">
            This code will expire in ${expiresInMinutes} minutes. If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;
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
    "Use the verification code below to reset your Vivah Bandhan password:",
    "",
    verificationCode,
    "",
    `This code will expire in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request a password reset, you can safely ignore this email.",
  ].join("\n");
}

export async function sendProfileCreatedEmail({
  to,
  recipientName,
  profileName,
}: ProfileCreatedEmailParams): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: "Your Vivah Bandhan profile has been created",
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
    subject: "Your profile was liked on Vivah Bandhan",
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
    subject: "Your Vivah Bandhan password reset code",
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

