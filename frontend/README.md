# EduMatch - AI-Assisted Speaking Practice Platform

EduMatch is an innovative AI-assisted speaking practice platform designed for schools and students. The platform connects students based on shared interests and proficiency levels, enabling AI-moderated real-time conversations in text or voice.

## Features

### Core Functionality
- **Student Matching**: Connect students based on interests, proficiency level, and curriculum topics
- **Real-time AI Moderation**: AI agents listen, correct grammar, and redirect conversations
- **Adaptive Feedback**: Generate summaries and learning insights after each session
- **School Administration**: Schools manage students, levels, topics, and curricula
- **Multi-role Support**: Student, Teacher, and Admin roles with appropriate permissions

### AI Agents
1. **Conversation Agent ("Listener")**: Real-time grammar correction and topic alignment
2. **Solo Practice Agent ("Coach")**: Individual voice/text practice sessions
3. **Feedback Agent ("Reviewer")**: Post-session summaries and analytics
4. **Curriculum Agent ("Planner")**: Maps topics to learning objectives (Future)
5. **Admin Agent ("Orchestrator")**: Multi-agent coordination and permissions

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Supabase Auth
- **AI Integration**: OpenAI Agents via AI SDK
- **UI Components**: Shadcn UI + Tailwind CSS
- **Payment**: Stripe (Future)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd edumatch/frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

4. Set up the database:
   - Create a new Supabase project
   - Run the SQL from `docs/database-schema.md` in the Supabase SQL Editor
   - Enable realtime for the `messages` table

5. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Dashboard routes
│   │   ├── (chat)/            # Chat routes
│   │   └── api/               # API routes
│   ├── components/
│   │   └── ui/                # Shadcn UI components
│   ├── lib/
│   │   ├── supabase/          # Supabase client configurations
│   │   └── utils.ts           # Utility functions
│   ├── types/                 # TypeScript type definitions
│   ├── agents/                # AI agent implementations
│   └── hooks/                 # Custom React hooks
├── docs/                      # Documentation
│   └── database-schema.md     # Database schema and setup
├── public/                    # Static assets
└── package.json
```

## Key Files

- `src/lib/supabase/client.ts` - Supabase client for client components
- `src/lib/supabase/server.ts` - Supabase client for server components
- `src/lib/supabase/middleware.ts` - Auth middleware utilities
- `src/types/database.types.ts` - Database type definitions
- `src/middleware.ts` - Next.js middleware for auth
- `docs/database-schema.md` - Complete database schema

## Development Guidelines

### Component Documentation
Always document what a component can do and its purpose at the top of the file.

### Supabase Client Usage
- Use `@/lib/supabase/client` for client components (marked with `'use client'`)
- Use `@/lib/supabase/server` for server components (default)

### Type Safety
All database operations should use the types from `src/types/database.types.ts` for full type safety.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Database Migrations

Use Supabase CLI for managing database migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Create migration
supabase migration new migration_name

# Push to production
supabase db push
```

## Roadmap

| Phase | Objective | Status |
|-------|-----------|--------|
| Phase 1 | Two-person chat with Conversation Agent | 🚧 In Progress |
| Phase 2 | Solo Practice voice sessions | 📋 Planned |
| Phase 3 | Feedback summaries & reports | 📋 Planned |
| Phase 4 | School admin dashboards | 📋 Planned |
| Phase 5 | Curriculum integration | 📋 Planned |
| Phase 6 | Subscription & billing layer | 📋 Planned |
| Phase 7 | Translation & gamification | 📋 Planned |

## Contributing

Please read the `../CLAUDE.md` file for detailed agent specifications and behavioral policies.

## Security & Compliance

- All data operations handled through secure MCP channels
- PII encrypted at rest via Supabase
- GDPR and FERPA compliant
- Row Level Security (RLS) enabled on all tables

## Support

For issues and questions, please use the GitHub issue tracker.
