// server/src/lib/mailer.js
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null
const FROM = process.env.MAIL_FROM || 'Bartawi <no-reply@bartawi.ae>'

function warnIfNotConfigured() {
  if (!resend) {
    console.warn('[mailer] RESEND_API_KEY not set — email send skipped')
    return true
  }
  return false
}

async function sendInviteEmail({ to, full_name, token, temp_password }) {
  if (warnIfNotConfigured()) return
  const inviteUrl = `${process.env.PUBLIC_APP_URL || 'https://app.bartawi.ae'}/login?invite=${token}`
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'You have been invited to the Bartawi platform',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; color: #1A1816;">
        <h1 style="font-family: Georgia, serif; font-style: italic; font-size: 28px; margin: 0 0 8px;">Bartawi</h1>
        <p style="color: #B8883D; font-size: 11px; letter-spacing: 0.1em; margin: 0 0 32px;">LABOUR CAMP MANAGEMENT</p>
        <p>Hi ${escapeHtml(full_name)},</p>
        <p>You've been invited to use the Bartawi Camp Management platform.</p>
        <div style="background: #F4EFE7; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <div style="font-size: 11px; color: #6A6159; letter-spacing: 0.1em; margin-bottom: 6px;">TEMPORARY PASSWORD</div>
          <code style="font-size: 16px; font-family: 'JetBrains Mono', monospace; color: #1A1816; font-weight: 600;">${escapeHtml(temp_password)}</code>
        </div>
        <p><a href="${inviteUrl}" style="display: inline-block; background: #1A1816; color: #FAF7F2; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-size: 13px; font-weight: 500;">Sign in to Bartawi</a></p>
        <p style="color: #6A6159; font-size: 12px;">Please change your password on first login.</p>
      </div>
    `,
  })
}

async function sendPasswordResetEmail({ to, full_name, token }) {
  if (warnIfNotConfigured()) return
  const resetUrl = `${process.env.PUBLIC_APP_URL || 'https://app.bartawi.ae'}/reset-password?token=${token}`
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Bartawi password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; color: #1A1816;">
        <h1 style="font-family: Georgia, serif; font-style: italic; font-size: 28px; margin: 0 0 32px;">Bartawi</h1>
        <p>Hi ${escapeHtml(full_name)},</p>
        <p>Click below to reset your password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="display: inline-block; background: #1A1816; color: #FAF7F2; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-size: 13px; font-weight: 500;">Reset password</a></p>
        <p style="color: #6A6159; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  })
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

export { sendInviteEmail, sendPasswordResetEmail }
