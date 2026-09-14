import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.zoho.in';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false'; // true for port 465
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `"Codefiesta 5.0 Support" <${SMTP_USER}>` : '"Codefiesta 5.0 Support"');

let transporter = null;

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

/**
 * Send 6-digit Login OTP to participant/leader
 */
export async function sendOtpEmail({ to, otp, attemptsLeft = 5 }) {
  const cleanTo = String(to || '').trim().toLowerCase();
  if (!cleanTo || !cleanTo.includes('@')) {
    throw new Error('Invalid recipient email address.');
  }

  const subject = `Your Codefiesta 5.0 Login Code: ${otp}`;
  const textContent = `Codefiesta 5.0 Verification Code: ${otp}\n\n` +
    `Your one-time login code is: ${otp}\n` +
    `This code will expire in 10 minutes.\n\n` +
    `For security reasons, do not share this code with anyone.\n` +
    `Remaining login attempts for today: ${attemptsLeft}\n\n` +
    `If you did not request this verification code, please ignore this email.\n` +
    `Need help? Contact support@protechy.in\n\n` +
    `Codefiesta 5.0 Hackathon Team`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codefiesta 5.0 Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="540px" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #064e3b 100%); padding: 32px 30px; text-align: center; border-bottom: 1px solid #374151;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #34d399; margin-bottom: 12px;">
                Official Hackathon Access
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                CODEFIESTA <span style="color: #10b981;">5.0</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #9ca3af; font-weight: 500;">
                National Level Hackathon | Protechy Gateway
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #ffffff;">
                Authentication One-Time Password
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9ca3af;">
                We received a request to log in to the Codefiesta 5.0 portal for <strong style="color: #f3f4f6;">${cleanTo}</strong>. Enter the 6-digit verification code below to proceed:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #030712; border: 2px dashed #059669; border-radius: 12px; padding: 22px 16px;">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #10b981; margin-bottom: 8px;">
                      Your Verification Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #34d399; text-shadow: 0 0 12px rgba(52, 211, 153, 0.4);">
                      ${otp}
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                      ⏱️ Expires in <strong>10 minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notice Badges -->
              <div style="background-color: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #fca5a5;">
                  <strong>Security Reminder:</strong> Never share this code with anyone. Codefiesta organizers and coordinators will never ask for your verification code.
                </p>
              </div>

              <div style="font-size: 12px; color: #6b7280; line-height: 1.5;">
                • Daily login attempts left today: <strong>${attemptsLeft}</strong><br>
                • If you did not initiate this request, you can safely disregard this email.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0b0f19; padding: 24px 32px; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #6b7280;">
                Sent automatically by <strong>Codefiesta 5.0 Mail Dispatcher</strong>
              </p>
              <p style="margin: 0; font-size: 11px; color: #4b5563;">
                Direct inquiries to <a href="mailto:support@protechy.in" style="color: #10b981; text-decoration: none;">support@protechy.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const transport = getTransporter();
  console.log(`[MAILER] Dispatching OTP email via Zoho SMTP to recipient: ${cleanTo} (From: ${SMTP_FROM})`);
  const info = await transport.sendMail({
    from: SMTP_FROM,
    to: cleanTo,
    replyTo: 'support@protechy.in',
    subject,
    text: textContent,
    html: htmlContent,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    response: info.response,
  };
}

/**
 * Send registration confirmation receipt
 */
export async function sendRegistrationEmail({ to, squadName, leaderName, utrNumber, membersCount = 1 }) {
  const cleanTo = String(to || '').trim().toLowerCase();
  if (!cleanTo || !cleanTo.includes('@')) return null;

  const subject = `Registration Received: ${squadName} - Codefiesta 5.0`;
  const textContent = `Welcome to Codefiesta 5.0!\n\n` +
    `Hello ${leaderName || 'Squad Leader'},\n\n` +
    `We have received your registration for squad "${squadName}".\n` +
    `Payment Reference (UTR): ${utrNumber || 'Pending'}\n` +
    `Registration Fee: Rs. 800 (Verified upon admin approval)\n\n` +
    `Our admin team is verifying your payment submission. Once approved, you will have full access to your squad dashboard.\n\n` +
    `Support: support@protechy.in\n` +
    `Codefiesta 5.0 Team`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Codefiesta 5.0 Registration Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="540px" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #064e3b 100%); padding: 32px 30px; text-align: center; border-bottom: 1px solid #374151;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff;">
                CODEFIESTA <span style="color: #10b981;">5.0</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #9ca3af;">
                Registration & Payment Acknowledgment
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; color: #ffffff;">
                Squad "${squadName}" Registered Successfully
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #9ca3af;">
                Hello <strong>${leaderName || 'Squad Leader'}</strong>, your registration form and payment details have been recorded on the Codefiesta 5.0 portal.
              </p>
              <div style="background-color: #030712; border: 1px solid #374151; border-radius: 10px; padding: 18px; margin-bottom: 20px; font-size: 13px; line-height: 1.8;">
                <div>🏷️ <strong>Squad Name:</strong> ${squadName}</div>
                <div>👤 <strong>Leader Email:</strong> ${cleanTo}</div>
                <div>👥 <strong>Team Size:</strong> ${membersCount} Members</div>
                <div>💳 <strong>Registration Fee:</strong> ₹800</div>
                <div>🧾 <strong>Submitted UTR:</strong> <code style="color: #34d399; font-family: monospace;">${utrNumber || 'N/A'}</code></div>
                <div>⏳ <strong>Status:</strong> <span style="color: #fbbf24; font-weight: 600;">Pending Admin Payment Verification</span></div>
              </div>
              <p style="margin: 0 0 10px; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                Our payment coordinators will review your 12-digit UTR transaction against the official banking portal. Once confirmed, you will receive full dashboard access.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0b0f19; padding: 20px 32px; border-top: 1px solid #1f2937; text-align: center; font-size: 12px; color: #6b7280;">
              Need urgent help with payment confirmation? Reach out at <a href="mailto:support@protechy.in" style="color: #10b981;">support@protechy.in</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const transport = getTransporter();
    console.log(`[MAILER] Dispatching registration receipt via Zoho SMTP to candidate: ${cleanTo}`);
    const info = await transport.sendMail({
      from: SMTP_FROM,
      to: cleanTo,
      replyTo: 'support@protechy.in',
      subject,
      text: textContent,
      html: htmlContent,
    });
    return info;
  } catch (e) {
    console.error('[Registration Email Error]:', e.message);
    return null;
  }
}

/**
 * Send official Payment Verified & Selection Confirmed email to Squad Leader
 */
export async function sendPaymentVerifiedEmail({ to, leaderName, teamName }) {
  const cleanTo = String(to || '').trim().toLowerCase();
  if (!cleanTo || !cleanTo.includes('@')) return null;

  const subject = `Registration & Payment Confirmed: Welcome to CODEFIESTA 5.0! — Team ${teamName || 'Confirmed'}`;
  const textContent = `PAYMENT VERIFIED • SELECTION CONFIRMED\n` +
    `Welcome to CODEFIESTA 5.0 Onsite Edition!\n\n` +
    `Dear ${leaderName || 'Participant'},\n\n` +
    `Congratulations! Your registration fee has been successfully received and verified. ` +
    `We are thrilled to confirm ${teamName ? `team "${teamName}"'s` : 'your team\'s'} selection for the onsite, in-person edition of CODEFIESTA 5.0, hosted at Global Institute of Technology, Jaipur.\n\n` +
    `MANDATORY ACTION: Join the Official WhatsApp Community for live updates:\n` +
    `https://chat.whatsapp.com/C7muE2UsAqZBFGfWNEWNP1?s=cl&p=a&mlu=4&ilr=4\n\n` +
    `Event Details:\n` +
    `• Event: CODEFIESTA 5.0 (24-Hour Hackathon)\n` +
    `• Date & Schedule: 8th – 9th October 2026\n` +
    `• Format / Mode: Onsite • In-Person Hackathon\n` +
    `• Venue: Campus @ Global Institute of Technology, Jaipur\n\n` +
    `Best Regards,\n` +
    `Team CodeFiesta, Global Institute of Technology, Jaipur\n` +
    `Mr. Lakshit Vashishtha || Student Coordinator || 9772316648 (WhatsApp: https://wa.me/+919772316648)\n` +
    `Email: codefiesta@gitjaipur.com | Website: hackathon.gitjaipur.com`;

  const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Registration &amp; Payment Confirmed: Welcome to CODEFIESTA 5.0!</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      border-collapse: collapse;
    }
    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    a {
      color: #5b21b6;
      text-decoration: none;
    }
    .action-btn:hover {
      background-color: #15803d !important;
      box-shadow: 0 6px 18px rgba(22, 163, 74, 0.4) !important;
    }
    .wa-btn:hover {
      background-color: #1eaf53 !important;
      box-shadow: 0 6px 18px rgba(37, 211, 102, 0.4) !important;
    }
    .social-link:hover {
      opacity: 0.8 !important;
      transform: translateY(-2px);
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        margin: 0 auto !important;
      }
      .email-content {
        padding: 22px 18px !important;
      }
      .header-table td {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        padding: 6px 0 !important;
      }
      .header-table td img {
        margin: 0 auto !important;
      }
      .event-detail-col {
        display: block !important;
        width: 100% !important;
        padding: 6px 0 !important;
      }
      .social-td {
        padding: 0 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text -->
  <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    Congratulations! Your payment has been verified and your selection for CODEFIESTA 5.0 (8th–9th Oct) is officially confirmed. Review event instructions and join the mandatory WhatsApp group.
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- Outer Canvas Table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Email Container (600px Max Width) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
          <!-- Top Header Row -->
          <tr>
            <td style="background: linear-gradient(135deg, #221240 0%, #2e1354 50%, #511556 100%); border-bottom: 1px solid #3b1968; padding: 20px 28px 18px 28px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="header-table">
                <tr>
                  <td align="left" valign="middle" style="width: 32%; text-align: left;">
                    <a href="https://hackathon.gitjaipur.com" target="_blank" style="text-decoration: none; display: inline-block;">
                      <div style="font-family: monospace; font-size: 18px; font-weight: 800; color: #fbbf24; letter-spacing: 1px;">
                        &lt;CF/5.0&gt;
                      </div>
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; color: #ffffff;">
                        CODEFIESTA
                      </div>
                    </a>
                  </td>
                  <td align="center" valign="middle" style="width: 38%; text-align: center; padding: 0 4px;">
                    <a href="https://www.gitjaipur.com" target="_blank" style="text-decoration: none; display: inline-block;">
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; line-height: 1.2;">
                        GLOBAL INSTITUTE
                      </div>
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 600; color: #e2e8f0; letter-spacing: 0.3px;">
                        OF TECHNOLOGY, JAIPUR
                      </div>
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 8px; font-weight: 700; color: #f472b6; letter-spacing: 0.3px; margin-top: 2px;">
                        NAAC 'A' GRADE ACCREDITED
                      </div>
                    </a>
                  </td>
                  <td align="right" valign="middle" style="width: 30%; text-align: right;">
                    <div style="display: inline-block; font-family: monospace; font-size: 11px; font-weight: 700; color: #38bdf8;">
                      CODE WARRIORS
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment Verified Badge -->
          <tr>
            <td style="padding: 24px 32px 0 32px; background-color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 20px 20px; text-align: center;">
                    <div style="display: inline-block; background-color: #10b981; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; margin-bottom: 8px;">
                      PAYMENT VERIFIED &bull; SELECTION CONFIRMED
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 800; color: #065f46; line-height: 1.3;">
                      Welcome to CODEFIESTA 5.0 Onsite Edition!
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #047857; margin-top: 6px; font-weight: 500;">
                      Your payment has been successfully verified. You are officially confirmed for the in-person hackathon.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td class="email-content" style="padding: 24px 36px; background-color: #ffffff;">
              <p style="font-size: 15px; color: #0f172a; margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Dear <strong>${leaderName || 'Participant'}</strong>,
              </p>

              <p style="font-size: 15px; line-height: 1.65; color: #1e293b; margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <strong>Congratulations!</strong> Your registration fee has been successfully received and verified. We are thrilled to confirm ${teamName ? `team <strong>"${teamName}"</strong>’s` : 'your team’s'} selection for the onsite, in-person edition of <strong>CODEFIESTA 5.0</strong>, hosted at <strong>Global Institute of Technology, Jaipur</strong>.
              </p>

              <p style="font-size: 15px; line-height: 1.65; color: #1e293b; margin: 0 0 22px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                You are officially part of the action &mdash; get ready for an electrifying 24 hours of non-stop coding, problem-solving, and building alongside the brightest student developers across the country!
              </p>

              <!-- WhatsApp Community Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1.5px solid #86efac; border-radius: 12px; padding: 22px 20px; text-align: center;">
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px;">
                      MANDATORY ACTION FOR ALL TEAM MEMBERS
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 800; color: #14532d; margin-bottom: 8px;">
                      Join the Official WhatsApp Community
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; line-height: 1.55; color: #166534; margin-bottom: 16px;">
                      To receive real-time updates, mentor assignments, reporting instructions, and crucial onsite announcements, joining our official WhatsApp group is <strong>mandatory for all participants</strong>.
                    </div>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="border-radius: 8px; background-color: #25D366; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.35);">
                          <a href="https://chat.whatsapp.com/C7muE2UsAqZBFGfWNEWNP1?s=cl&p=a&mlu=4&ilr=4" target="_blank" class="wa-btn" style="display: inline-block; padding: 13px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; letter-spacing: 0.5px; border-radius: 8px; text-transform: uppercase;">
                            JOIN OFFICIAL WHATSAPP GROUP
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Event Details -->
              <h3 style="font-size: 18px; font-weight: 700; color: #5b21b6; margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Event Details &amp; Location
              </h3>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #334155;">
                <tr>
                  <td class="event-detail-col" width="50%" valign="top" style="padding: 5px 10px 5px 0;">
                    <div><strong>Event</strong></div>
                    <div style="color: #64748b; font-size: 13px;">CODEFIESTA 5.0 (24-Hour Hackathon)</div>
                  </td>
                  <td class="event-detail-col" width="50%" valign="top" style="padding: 5px 0 5px 10px;">
                    <div><strong>Date &amp; Schedule</strong></div>
                    <div style="color: #64748b; font-size: 13px;">8th &ndash; 9th October 2026</div>
                  </td>
                </tr>
                <tr>
                  <td class="event-detail-col" valign="top" style="padding: 8px 10px 5px 0;">
                    <div><strong>Format / Mode</strong></div>
                    <div style="color: #64748b; font-size: 13px;">Onsite &bull; In-Person Hackathon</div>
                  </td>
                  <td class="event-detail-col" valign="top" style="padding: 8px 0 5px 10px;">
                    <div><strong>Venue Location</strong></div>
                    <div style="color: #64748b; font-size: 13px;">Campus @ Global Institute of Technology, Jaipur</div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; line-height: 1.65; color: #475569; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                All detailed reporting times, check-in instructions, Wi-Fi access details, and mentor schedules will be shared with you on your email and the official WhatsApp group shortly.
              </p>

              <!-- Stay Connected -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; margin-bottom: 24px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <tr>
                  <td align="center">
                    <h3 style="font-size: 18px; font-weight: 700; color: #5b21b6; text-align: center; margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Stay Connected
                    </h3>
                    <p style="text-align: center; font-size: 14px; color: #475569; margin: 0 0 18px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Follow us for updates, announcements &amp; community vibes
                    </p>

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 20px auto;">
                      <tr>
                        <td align="center" style="padding: 0 14px;">
                          <a href="https://www.instagram.com/_gitjaipur" target="_blank" style="color: #5b21b6; font-weight: 700; text-decoration: none; font-size: 13px;">
                            Instagram
                          </a>
                        </td>
                        <td align="center" style="padding: 0 14px;">
                          <a href="https://www.linkedin.com/school/global-institute-of-technology-jaipur/" target="_blank" style="color: #5b21b6; font-weight: 700; text-decoration: none; font-size: 13px;">
                            LinkedIn
                          </a>
                        </td>
                        <td align="center" style="padding: 0 14px;">
                          <a href="https://www.facebook.com/gitjaipurofficial?mibextid=ZbWKwL" target="_blank" style="color: #5b21b6; font-weight: 700; text-decoration: none; font-size: 13px;">
                            Facebook
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="text-align: center; font-size: 14px; font-weight: 700; color: #0f172a; margin: 0;">
                      Don&rsquo;t forget to follow us for latest updates!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Signature & Footer -->
              <div style="font-size: 14px; line-height: 1.7; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-top: 1px solid #f1f5f9; padding-top: 18px;">
                --<br />
                <strong>Best Regards,</strong><br />
                <strong style="color: #5b21b6;">Team CodeFiesta,</strong><br />
                <strong>Global Institute of Technology, Jaipur</strong><br />
                Mr. Lakshit Vashishtha || Student Coordinator || <a href="https://wa.me/+919772316648" target="_blank" style="color: #5b21b6; text-decoration: none; font-weight: 600;">9772316648</a><br />
                <br />
                Email: <a href="mailto:codefiesta@gitjaipur.com" style="color: #5b21b6; text-decoration: none;">codefiesta@gitjaipur.com</a><br />
                Website: <a href="https://hackathon.gitjaipur.com" target="_blank" style="color: #5b21b6; text-decoration: none;">hackathon.gitjaipur.com</a><br />
                Address: ITS 1, IT Park Road, Sitapura Industrial Area, Sitapura, Jaipur, Rajasthan - 302022
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const transport = getTransporter();
    console.log(`[MAILER] Dispatching official payment verified & selection email via Zoho SMTP to candidate: ${cleanTo} (Team: ${teamName})`);
    const info = await transport.sendMail({
      from: SMTP_FROM,
      to: cleanTo,
      replyTo: 'support@protechy.in',
      subject,
      text: textContent,
      html: htmlContent,
    });
    return info;
  } catch (e) {
    console.error('[Payment Verification Email Error]:', e.message);
    return null;
  }
}


