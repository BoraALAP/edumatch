# School Administration & Invitation System - Implementation Plan

## Overview

This plan adds comprehensive school administration features to EduMatch, enabling school admins to invite students, manage their school's users, and ensure students only match within their school.

---

## Current State Analysis

### ✅ What We Have:
- `schools` table with basic school info
- `profiles` table with `school_id` foreign key
- `role` enum with `school_admin` option
- `matches` table with `school_id` field
- RLS policies for data isolation

### ❌ What We Need:
- Student invitation system
- Email invitation flow
- School admin dashboard
- School-restricted matching
- Admin management tools
- Invitation tracking

---

## Phase 1: Database Schema Updates

### 1.1 Student Invitations Table

```sql
CREATE TABLE student_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role user_role DEFAULT 'student',
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  metadata JSONB DEFAULT '{}',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_pending_email_per_school UNIQUE (school_id, email) WHERE status = 'pending'
);

CREATE INDEX idx_invitations_token ON student_invitations(token);
CREATE INDEX idx_invitations_school_status ON student_invitations(school_id, status);
CREATE INDEX idx_invitations_email ON student_invitations(email);
```

### 1.2 Schools Table Enhancements

```sql
-- Add invitation settings to schools table
ALTER TABLE schools
ADD COLUMN invitation_settings JSONB DEFAULT '{
  "require_approval": false,
  "auto_accept_domain": false,
  "allowed_domains": [],
  "default_student_settings": {}
}'::jsonb;

-- Add admin contact info
ALTER TABLE schools
ADD COLUMN admin_email TEXT,
ADD COLUMN admin_name TEXT,
ADD COLUMN is_active BOOLEAN DEFAULT true;
```

### 1.3 Update Matches Table Logic

```sql
-- Add constraint to ensure same-school matching
ALTER TABLE matches
ADD CONSTRAINT matches_same_school_check
CHECK (
  school_id IS NULL OR
  (
    -- Both students must be from the same school
    SELECT COUNT(DISTINCT school_id)
    FROM profiles
    WHERE id IN (student1_id, student2_id)
      AND school_id IS NOT NULL
  ) <= 1
);
```

### 1.4 RLS Policies for Invitations

```sql
-- School admins can manage their school's invitations
CREATE POLICY "school_admins_manage_invitations"
ON student_invitations
FOR ALL
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM profiles
    WHERE id = auth.uid()
      AND role IN ('school_admin', 'admin')
  )
);

-- Students can view their own pending invitations
CREATE POLICY "students_view_own_invitations"
ON student_invitations
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
);

ENABLE ROW LEVEL SECURITY ON student_invitations;
```

---

## Phase 2: Invitation Flow

### 2.1 Invitation Creation

**Admin Action:**
1. School admin enters student email(s)
2. System validates:
   - Admin has permission
   - Email not already registered
   - School has capacity (max_students)
   - Email domain matches (if required)
3. Generate unique token
4. Send invitation email
5. Store invitation record

**API Endpoint:**
```typescript
POST /api/admin/invite-students
Body: {
  emails: string[],
  role?: 'student' | 'teacher',
  metadata?: {
    grade?: string,
    class?: string,
    customFields?: Record<string, any>
  }
}
```

### 2.2 Email Template

```html
Subject: You're invited to join [School Name] on EduMatch!

Hi there!

[Admin Name] from [School Name] has invited you to join EduMatch,
our AI-assisted language practice platform.

What is EduMatch?
- Practice English with your classmates
- Get real-time AI grammar help
- Track your progress

Click here to accept: [Link with token]

This invitation expires in 7 days.

Questions? Contact: [School Admin Email]
```

### 2.3 Invitation Acceptance Flow

**Student Action:**
1. Click invitation link → `/invite/[token]`
2. System validates token:
   - Not expired
   - Not already used
   - School still active
3. Student creates account OR signs in
4. Profile automatically linked to school
5. Onboarding with school-specific settings
6. Invitation marked as 'accepted'

**Pages to Create:**
- `/invite/[token]` - Invitation landing page
- `/admin/invitations` - Manage invitations
- `/admin/students` - Student list
- `/admin/settings` - School settings

---

## Phase 3: School-Based Matching

### 3.1 Update Matching Logic

**Current:** `/matches/page.tsx` - Match with anyone
**New:** Match only with school members

```typescript
// frontend/src/components/matching/MatchingInterface.tsx

async function fetchPotentialMatches() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, proficiency_level, interests')
    .eq('id', currentUserId)
    .single();

  // IMPORTANT: Only match within same school
  const { data: matches } = await supabase
    .from('profiles')
    .select('*')
    .eq('school_id', profile.school_id)  // ← School restriction
    .neq('id', currentUserId)
    .eq('role', 'student');

  return matches;
}
```

### 3.2 Match Creation Validation

**API Route:** `/api/matches/create`

```typescript
// Validate same school before creating match
const student1 = await getProfile(student1_id);
const student2 = await getProfile(student2_id);

if (student1.school_id !== student2.school_id) {
  throw new Error('Students must be from the same school');
}

// Also set school_id on match
await supabase.from('matches').insert({
  student1_id,
  student2_id,
  school_id: student1.school_id,  // ← Track school
  status: 'pending'
});
```

### 3.3 RLS Policy Update

```sql
-- Students can only see matches within their school
CREATE POLICY "students_view_school_matches"
ON matches
FOR SELECT
TO authenticated
USING (
  (student1_id = auth.uid() OR student2_id = auth.uid())
  AND school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid()
  )
);
```

---

## Phase 4: Admin Dashboard

### 4.1 Admin Dashboard Features

**Route:** `/admin` (school_admin role required)

#### Main Dashboard View:
```
┌─────────────────────────────────────────────┐
│  Riverside High School                      │
│  Admin Dashboard                            │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Overview                                │
│  ├─ 45 Active Students                     │
│  ├─ 3 Teachers                             │
│  ├─ 12 Active Conversations                │
│  └─ 156 Total Messages Today               │
│                                             │
│  👥 Quick Actions                           │
│  ├─ [Invite Students]                      │
│  ├─ [View All Students]                    │
│  ├─ [Manage Curriculum]                    │
│  └─ [View Reports]                         │
│                                             │
│  ⏰ Recent Activity                         │
│  - Alice matched with Bob (5 min ago)      │
│  - New student: Carol (20 min ago)         │
│  - Session ended: Dave & Eve (1 hr ago)    │
│                                             │
└─────────────────────────────────────────────┘
```

#### Student Management View (`/admin/students`):
```
┌──────────────────────────────────────────────────────────┐
│  Students (45)                      [+ Invite Students]  │
├──────────────────────────────────────────────────────────┤
│  Search: [________]  Filter: [All | Active | Inactive]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Name          Email           Level  Status  Actions   │
│  ───────────────────────────────────────────────────── │
│  Alice Smith   alice@...       B1     Active  [View]    │
│  Bob Jones     bob@...         A2     Active  [View]    │
│  Carol White   carol@...       B2     Active  [View]    │
│  ...                                                     │
│                                                          │
│  Showing 1-20 of 45              [1] 2 3 →              │
└──────────────────────────────────────────────────────────┘
```

#### Invitation Management View (`/admin/invitations`):
```
┌──────────────────────────────────────────────────────────┐
│  Invitations                        [+ Invite Students]  │
├──────────────────────────────────────────────────────────┤
│  [Pending (5)] [Accepted (32)] [Expired (3)]           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Email            Status   Sent         Actions         │
│  ──────────────────────────────────────────────────────│
│  new@school.edu   Pending  2 days ago   [Resend][Cancel]│
│  student@...      Pending  5 days ago   [Resend][Cancel]│
│  ...                                                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Admin Components to Build

```
frontend/src/app/admin/
├── layout.tsx                    # Admin layout with nav
├── page.tsx                      # Dashboard overview
├── invitations/
│   ├── page.tsx                  # Invitation list
│   └── components/
│       ├── InviteStudentsModal.tsx
│       ├── InvitationList.tsx
│       └── InvitationActions.tsx
├── students/
│   ├── page.tsx                  # Student list
│   ├── [studentId]/
│   │   └── page.tsx              # Student detail
│   └── components/
│       ├── StudentList.tsx
│       ├── StudentFilters.tsx
│       └── StudentDetail.tsx
├── settings/
│   └── page.tsx                  # School settings
└── reports/
    └── page.tsx                  # Analytics & reports
```

### 4.3 API Routes to Build

```
frontend/src/app/api/admin/
├── invitations/
│   ├── create/route.ts           # POST - Send invitations
│   ├── resend/route.ts           # POST - Resend invitation
│   ├── cancel/route.ts           # POST - Cancel invitation
│   └── list/route.ts             # GET - List invitations
├── students/
│   ├── list/route.ts             # GET - List students
│   ├── [id]/
│   │   ├── route.ts              # GET/PATCH - Student details
│   │   └── deactivate/route.ts  # POST - Deactivate student
│   └── stats/route.ts            # GET - Student statistics
├── school/
│   ├── settings/route.ts         # GET/PATCH - School settings
│   └── stats/route.ts            # GET - School statistics
└── reports/
    ├── activity/route.ts         # GET - Activity report
    └── sessions/route.ts         # GET - Session summary
```

---

## Phase 5: Email Integration

### 5.1 Email Service Setup

**Options:**
1. **SendGrid** (Recommended) - Reliable, widely supported transactional email API
2. **Resend** - Modern DX, good deliverability
3. **AWS SES** - Cost-effective

**Environment Variables:**
```env
SENDGRID_API_KEY=sg_...
FROM_EMAIL=noreply@edumatch.app
ADMIN_EMAIL=admin@edumatch.app
ENABLE_DEV_ADMIN_SETUP=true # optional dev utility, see Immediate Next Steps
```

> We call the SendGrid REST API directly with `fetch`, so no additional dependencies are required.

### 5.2 Email Templates

```typescript
// lib/email/templates.ts

export const invitationEmail = ({
  schoolName,
  adminName,
  inviteLink,
  expiresIn,
}: {
  schoolName: string;
  adminName: string;
  inviteLink: string;
  expiresIn: string;
}) => ({
  subject: `You're invited to ${schoolName} on EduMatch!`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Welcome to EduMatch!</h1>
      <p>Hi there,</p>
      <p><strong>${adminName}</strong> from <strong>${schoolName}</strong> has invited you to join EduMatch.</p>

      <h2>What is EduMatch?</h2>
      <ul>
        <li>Practice English with your classmates</li>
        <li>Get real-time AI grammar corrections</li>
        <li>Track your learning progress</li>
      </ul>

      <div style="margin: 30px 0;">
        <a href="${inviteLink}"
           style="background: #4F46E5; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">
        This invitation expires in ${expiresIn}.
      </p>
    </div>
  `,
});
```

---

## Phase 6: Security & Permissions

### 6.1 Role-Based Access Control (RBAC)

```typescript
// lib/auth/permissions.ts

export const permissions = {
  school_admin: [
    'invite:students',
    'view:students',
    'view:student_details',
    'manage:curriculum',
    'view:reports',
    'manage:school_settings',
  ],
  teacher: [
    'view:students',
    'view:student_progress',
    'view:reports',
  ],
  student: [
    'view:matches',
    'create:matches',
    'view:own_data',
  ],
};

export function hasPermission(
  userRole: string,
  permission: string
): boolean {
  return permissions[userRole]?.includes(permission) ?? false;
}
```

### 6.2 Middleware Protection

```typescript
// middleware.ts

// Protect admin routes
if (url.pathname.startsWith('/admin')) {
  const profile = await getProfile(user.id);

  if (!['school_admin', 'admin'].includes(profile.role)) {
    return NextResponse.redirect(new URL('/dashboard', url));
  }
}
```

### 6.3 API Route Protection

```typescript
// app/api/admin/[...]/route.ts

export async function POST(request: Request) {
  const user = await getUser();
  const profile = await getProfile(user.id);

  if (!hasPermission(profile.role, 'invite:students')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ... proceed with invitation
}
```

---

## Phase 7: Implementation Roadmap

### Week 1: Database & Backend
- [ ] Create `student_invitations` table
- [ ] Update `schools` table with new fields
- [ ] Add RLS policies for invitations
- [ ] Create invitation CRUD API routes
- [ ] Set up email service (SendGrid)
- [ ] Build email templates

### Week 2: Invitation Flow
- [ ] Build invitation creation UI
- [ ] Implement invitation email sending
- [ ] Create `/invite/[token]` acceptance page
- [ ] Handle token validation logic
- [ ] Update onboarding for invited students
- [ ] Add invitation status tracking

### Week 3: School-Based Matching
- [ ] Update matching algorithm for school restriction
- [ ] Add school validation to match creation
- [ ] Update RLS policies for matches
- [ ] Test cross-school blocking
- [ ] Update UI to show "school members only"

### Week 4: Admin Dashboard - Part 1
- [ ] Create admin layout and navigation
- [ ] Build dashboard overview page
- [ ] Implement student list view
- [ ] Add student search and filters
- [ ] Create invitation management page

### Week 5: Admin Dashboard - Part 2
- [ ] Build school settings page
- [ ] Add student detail view
- [ ] Implement bulk actions (invite multiple)
- [ ] Create activity reports
- [ ] Add analytics charts

### Week 6: Polish & Testing
- [ ] Write integration tests
- [ ] Test invitation flow end-to-end
- [ ] Test school isolation
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation

---

## Immediate Next Steps for Visibility

To surface the new admin features in the current build, follow this sequence:

1. **Expose Admin Navigation**
   - Add a conditional link to `/admin` in the main dashboard for users with `school_admin` or `admin` roles.

2. **Seed Test School & Admin Profile**
   - Insert a test school row.
   - Update your profile to `role = 'school_admin'` and set `school_id` to the test school's ID so you can access the admin pages.
   - For local development you can set `ENABLE_DEV_ADMIN_SETUP=true` and call `POST /api/dev/setup-admin` (requires a Supabase service role key) to automate this step.

3. **Implement Invitation Acceptance UI**
   - Build the `/invite/[token]` page so invited students can redeem their invitation via the browser.

---

## Phase 8: Future Enhancements

### 8.1 Advanced Admin Features
- **Batch Operations:** Import students from CSV
- **Class Management:** Create and manage class groups
- **Assignment System:** Assign specific topics/partners
- **Scheduled Sessions:** Pre-schedule practice times
- **Parent Portal:** View child's progress (with consent)

### 8.2 School Analytics
- **Usage Dashboard:** Active students, session counts
- **Progress Tracking:** Average proficiency improvements
- **Engagement Metrics:** Daily/weekly active users
- **AI Insights:** Common grammar patterns, topic adherence
- **Export Reports:** PDF/CSV for school records

### 8.3 Multi-School Features
- **Inter-school Matches:** Optional cross-school matching
- **School Leagues:** Friendly competitions
- **Shared Curriculum:** Schools share lesson plans
- **District Administration:** Multi-school management

---

## Technical Specifications

### API Endpoints Summary

```
POST   /api/admin/invitations/create
POST   /api/admin/invitations/resend
POST   /api/admin/invitations/cancel
GET    /api/admin/invitations/list
GET    /api/admin/students/list
GET    /api/admin/students/[id]
PATCH  /api/admin/students/[id]
POST   /api/admin/students/[id]/deactivate
GET    /api/admin/school/settings
PATCH  /api/admin/school/settings
GET    /api/admin/school/stats
GET    /api/admin/reports/activity
GET    /api/admin/reports/sessions
GET    /api/invite/[token]/validate
POST   /api/invite/[token]/accept
```

### Database Functions Summary

```sql
-- Get invitation by token
get_invitation_by_token(token TEXT)

-- Validate invitation status
is_invitation_valid(token TEXT) RETURNS BOOLEAN

-- Accept invitation
accept_invitation(token TEXT, user_id UUID)

-- Get school statistics
get_school_stats(school_id UUID)

-- List students with pagination
list_school_students(school_id UUID, page INT, limit INT)
```

---

## Success Metrics

### Phase 1-3 (Foundation)
- ✅ School admins can invite students
- ✅ Students receive and accept invitations
- ✅ Students auto-linked to correct school
- ✅ Matching restricted to same school

### Phase 4-6 (Admin Tools)
- ✅ Admin dashboard operational
- ✅ Student management functional
- ✅ Invitation tracking working
- ✅ Permissions properly enforced

### Phase 7-8 (Polish & Scale)
- ✅ 95%+ email deliverability
- ✅ <100ms invitation validation
- ✅ Zero cross-school matches
- ✅ Admin satisfaction >90%

---

## Questions to Resolve

1. **Email Verification:** Should students verify email before accepting invitation?
2. **Domain Restriction:** Enforce school email domains (e.g., @school.edu)?
3. **Multi-School Students:** Allow students in multiple schools?
4. **Teacher Invitations:** Same flow as students or different?
5. **Parent Consent:** Required for students under 13? (COPPA compliance)
6. **Trial Period:** Free trial before school subscription required?

---

## Next Steps

1. **Review this plan** - Get feedback on approach
2. **Prioritize phases** - Which features are MVP?
3. **Set timeline** - Realistic deadlines?
4. **Assign tasks** - Who builds what?
5. **Start with Phase 1** - Database migrations first

---

This plan provides a complete roadmap for school administration features. Ready to start implementation? 🚀
