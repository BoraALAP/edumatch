export interface InvitationSettings {
  require_approval?: boolean
  auto_accept_domain?: boolean
  allowed_domains?: string[]
  default_student_settings?: Record<string, unknown>
}
