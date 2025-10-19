# Authentication Setup Guide

This guide explains how to set up social authentication (Google and GitHub) for the EduMatch platform.

## Prerequisites

- Supabase project created
- Next.js application running
- Environment variables configured in `.env.local`

## Step 1: Configure Social Providers in Supabase

### Google OAuth Setup

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list and click to expand
4. Enable the Google provider
5. You'll need to create OAuth credentials in Google Cloud Console:

   **Create Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Select **Web application**
   - Add authorized redirect URIs:
     ```
     https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**

6. Back in Supabase Dashboard:
   - Paste the **Client ID** in the appropriate field
   - Paste the **Client Secret** in the appropriate field
   - Save changes

### GitHub OAuth Setup

1. In your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **GitHub** in the list and click to expand
4. Enable the GitHub provider
5. You'll need to create an OAuth App in GitHub:

   **Create GitHub OAuth App:**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **New OAuth App**
   - Fill in the details:
     - **Application name:** EduMatch (or your app name)
     - **Homepage URL:** `http://localhost:3001` (for development)
     - **Authorization callback URL:**
       ```
       https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
       ```
   - Click **Register application**
   - Copy the **Client ID**
   - Generate a new **Client Secret** and copy it

6. Back in Supabase Dashboard:
   - Paste the **Client ID** in the appropriate field
   - Paste the **Client Secret** in the appropriate field
   - Save changes

## Step 2: Configure Redirect URLs

In your Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add the following URLs to **Redirect URLs**:
   - Development: `http://localhost:3001/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

3. Set the **Site URL**:
   - Development: `http://localhost:3001`
   - Production: `https://yourdomain.com`

## Step 3: Test Authentication

1. Start your Next.js development server:
   ```bash
   pnpm dev
   ```

2. Navigate to `http://localhost:3001`
3. Click "Sign In" button
4. You'll be redirected to the login page
5. Try logging in with Google or GitHub
6. After successful authentication, you should be redirected to `/dashboard`

## Authentication Flow

1. **Homepage** (`/`) - Landing page with "Sign In" button
2. **Login Page** (`/login`) - Shows social auth buttons (Google & GitHub)
3. **OAuth Redirect** - User is redirected to provider (Google/GitHub) for authentication
4. **Callback** (`/auth/callback`) - Handles the OAuth callback and exchanges code for session
5. **Dashboard** (`/dashboard`) - Protected page showing user profile and features

## Protected Routes

The following routes require authentication:
- `/dashboard` - Main dashboard
- `/chat` - Chat interface (coming soon)
- `/matches` - User matches (coming soon)
- `/profile` - User profile (coming soon)

Unauthenticated users will be redirected to `/login` with a `redirect_to` parameter.

## Sign Out

Users can sign out by:
1. Clicking the "Sign Out" button on the dashboard
2. This triggers a POST request to `/auth/signout`
3. User is signed out and redirected to `/login`

## Middleware

The middleware (`middleware.ts`) handles:
- Session refresh on every request
- Protecting routes from unauthenticated access
- Redirecting logged-in users away from auth pages
- Setting up Supabase SSR cookies

## Troubleshooting

### "Auth callback error" message

This usually means:
- OAuth credentials are incorrect
- Redirect URLs don't match
- Provider is not enabled in Supabase

**Fix:**
1. Double-check OAuth credentials in Supabase Dashboard
2. Verify redirect URLs match exactly
3. Ensure provider is enabled

### Users can't access protected routes

**Fix:**
1. Check that middleware is working (check browser cookies)
2. Verify `.env.local` has correct Supabase URL and Anon Key
3. Check Supabase Dashboard logs for errors

### Infinite redirect loop

This might happen if:
- Middleware configuration is incorrect
- Session cookies are not being set properly

**Fix:**
1. Check middleware matcher configuration
2. Verify cookie settings in Supabase client configuration
3. Check browser console for errors

## Next Steps

1. **Configure OAuth Apps for Production:**
   - Update redirect URLs with your production domain
   - Update Site URL in Supabase Dashboard

2. **Add More Providers:**
   - Follow similar steps for other providers (Twitter, Facebook, etc.)
   - Update login page to include new provider buttons

3. **Customize User Experience:**
   - Add user profile editing
   - Implement email notifications
   - Add social profile sync

## Security Notes

- Never commit OAuth secrets to version control
- Use environment variables for all sensitive data
- Keep Supabase Anon Key in environment variables (it's safe to expose to frontend)
- Service Role Key should NEVER be exposed to frontend
- Regularly rotate OAuth credentials
- Monitor authentication logs in Supabase Dashboard

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Social Login Guide](https://supabase.com/docs/guides/auth/social-login)
- [Next.js SSR with Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps)
