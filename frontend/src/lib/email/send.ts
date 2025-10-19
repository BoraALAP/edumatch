export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export interface SendEmailResult {
  success: boolean
  skipped?: boolean
  error?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.FROM_EMAIL ?? process.env.SENDGRID_FROM_EMAIL
  const fromName = process.env.FROM_NAME ?? process.env.SENDGRID_FROM_NAME ?? 'EduMatch'

  if (!apiKey || !fromEmail) {
    console.warn('[email] Missing SENDGRID_API_KEY or FROM_EMAIL; skipping email send.')
    return { success: false, skipped: true, error: 'Email service not configured' }
  }

  const content = [
    { type: 'text/html', value: options.html },
    ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
  ]

  const payload = {
    personalizations: [
      {
        to: [{ email: options.to }],
      },
    ],
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject: options.subject,
    content,
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let message = `Failed to send email (status ${response.status})`
    try {
      const body = await response.json()
      message = body?.errors?.[0]?.message ?? message
    } catch {
      // ignore parse errors
    }

    return { success: false, error: message }
  }

  return { success: true }
}
