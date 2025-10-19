# EduMatch Setup Guide

This guide will walk you through setting up the EduMatch platform from scratch.

## Quick Start Checklist

- [ ] Node.js 20+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Supabase account created
- [ ] OpenAI API key obtained
- [ ] Dependencies installed (`pnpm install`)
- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] Development server running

## Detailed Setup Steps

### 1. Install Dependencies

```bash
cd frontend
pnpm install
```

### 2. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: eduMatch
   - Database Password: (strong password)
   - Region: (closest to your users)
4. Wait for project to be created (~2 minutes)

### 3. Configure Database

1. Go to SQL Editor in Supabase dashboard
2. Copy and paste the SQL from `docs/database-schema.md`
3. Run the SQL to create tables, policies, and functions
4. Go to Database → Replication
5. Enable realtime for the `messages` table

### 4. Get Supabase Credentials

1. Go to Project Settings → API
2. Copy the following:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Project API Key (anon/public) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Get OpenAI API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key → `OPENAI_API_KEY`

### 6. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Enable Supabase Auth

1. Go to Authentication → Providers
2. Enable Email provider
3. Configure email templates (optional)
4. Disable email confirmation for development (optional):
   - Go to Authentication → Settings
   - Uncheck "Enable email confirmations"

### 8. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Verification Steps

### Test Database Connection

Create a test file `src/app/test/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server';

export default async function TestPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('count');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Database Test</h1>
      {error ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : (
        <p className="text-green-500">Connected! Profile count: {data?.[0]?.count}</p>
      )}
    </div>
  );
}
```

### Test Build

```bash
pnpm build
```

This should complete without errors.

## Common Issues

### Issue: "Invalid API key" error

**Solution**: Double-check that you copied the anon/public key, not the service role key.

### Issue: Database connection fails

**Solution**:
1. Verify your Supabase URL is correct
2. Check that RLS policies are properly set up
3. Ensure you ran all SQL from database-schema.md

### Issue: Build fails with type errors

**Solution**:
1. Delete `.next` folder: `rm -rf .next`
2. Clear pnpm cache: `pnpm store prune`
3. Reinstall: `pnpm install`
4. Rebuild: `pnpm build`

### Issue: Module not found errors

**Solution**: Check that `tsconfig.json` has the correct path mapping:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Next Steps

After setup is complete:

1. Create your first user account
2. Test authentication flow
3. Explore the database in Supabase Table Editor
4. Read `CLAUDE.md` for agent implementation details
5. Start building features!

## Production Deployment

See the main README.md for Vercel deployment instructions.

## Support

If you encounter issues:
1. Check this guide
2. Review error messages carefully
3. Check Supabase logs in the dashboard
4. Consult Next.js and Supabase documentation
