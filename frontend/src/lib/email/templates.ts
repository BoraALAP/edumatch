/**
 * Email Template for School Invitations
 *
 * Sends a magic link email that:
 * 1. Creates the user's account automatically
 * 2. Logs them in when they click the link
 * 3. Redirects to onboarding to complete their profile
 *
 * This reduces friction - users don't need to fill signup forms,
 * they just click, set password, and complete profile.
 */

export interface InvitationEmailTemplate {
  subject: string
  html: string
  text: string
}

export function buildInvitationEmail({
  schoolName,
  adminName,
  inviteLink,
  expiresIn,
}: {
  schoolName: string
  adminName: string | null
  inviteLink: string
  expiresIn: string
}): InvitationEmailTemplate {
  const subject = `Your EduMatch account for ${schoolName} is ready!`

  const friendlyAdminName = adminName ?? 'your school administrator'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937;">Welcome to EduMatch!</h1>
      <p>Hi there,</p>
      <p><strong>${friendlyAdminName}</strong> from <strong>${schoolName}</strong> has created an account for you on EduMatch, our AI-assisted language practice platform.</p>
      <h2 style="color: #374151;">What is EduMatch?</h2>
      <ul>
        <li>Practice English with your classmates</li>
        <li>Get real-time AI grammar help</li>
        <li>Track your progress over time</li>
      </ul>
      <h2 style="color: #374151;">Get Started</h2>
      <p>Click the button below to set up your account and complete your profile. This will log you in automatically.</p>
      <p style="margin: 24px 0;">
        <a href="${inviteLink}" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Set Up My Account</a>
      </p>
      <p style="color: #9ca3af; font-size: 14px;">This link expires in ${expiresIn}.</p>
      <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br /><a href="${inviteLink}" style="color: #4f46e5; word-break: break-all;">${inviteLink}</a></p>
    </div>
  `
    .replace(/\n\s+/g, ' ')
    .trim()

  const text = [
    'Welcome to EduMatch!',
    '',
    `${friendlyAdminName} from ${schoolName} has created an account for you on EduMatch, our AI-assisted language practice platform.`,
    '',
    'What is EduMatch?',
    '- Practice English with your classmates',
    '- Get real-time AI grammar help',
    '- Track your progress over time',
    '',
    'Get Started:',
    `Click this link to set up your account: ${inviteLink}`,
    '',
    `This link expires in ${expiresIn}.`,
  ].join('\n')

  return { subject, html, text }
}
