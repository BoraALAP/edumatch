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
  const subject = `You're invited to ${schoolName} on EduMatch!`

  const friendlyAdminName = adminName ?? 'your school administrator'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937;">Welcome to EduMatch!</h1>
      <p>Hi there,</p>
      <p><strong>${friendlyAdminName}</strong> from <strong>${schoolName}</strong> has invited you to join EduMatch, our AI-assisted language practice platform.</p>
      <h2 style="color: #374151;">What is EduMatch?</h2>
      <ul>
        <li>Practice English with your classmates</li>
        <li>Get real-time AI grammar help</li>
        <li>Track your progress over time</li>
      </ul>
      <p style="margin: 24px 0;">
        <a href="${inviteLink}" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Accept Invitation</a>
      </p>
      <p>This invitation expires in ${expiresIn}.</p>
      <p style="color: #6b7280; font-size: 14px;">If the button does not work, copy and paste this link into your browser:<br /><a href="${inviteLink}">${inviteLink}</a></p>
    </div>
  `
    .replace(/\n\s+/g, ' ')
    .trim()

  const text = [
    'Welcome to EduMatch!',
    '',
    `${friendlyAdminName} from ${schoolName} has invited you to join EduMatch, our AI-assisted language practice platform.`,
    '',
    'What is EduMatch?',
    '- Practice English with your classmates',
    '- Get real-time AI grammar help',
    '- Track your progress over time',
    '',
    `Accept your invitation: ${inviteLink}`,
    '',
    `This invitation expires in ${expiresIn}.`,
  ].join('\n')

  return { subject, html, text }
}
