/**
 * Homepage
 *
 * Landing page for EduMatch platform.
 * Shows welcome message and login button for unauthenticated users.
 */

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-foreground">EduMatch</h1>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Practice English with Real Conversations
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            EduMatch connects students for interactive English practice sessions with
            AI-powered grammar assistance and real-time feedback.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started Free
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <Card className="p-6 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Real-time Conversations
            </h3>
            <p className="text-muted-foreground">
              Practice speaking with matched partners or AI assistants
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              AI Grammar Assistant
            </h3>
            <p className="text-muted-foreground">
              Get instant corrections and helpful feedback as you chat
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-5xl mb-4">📈</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Track Your Progress
            </h3>
            <p className="text-muted-foreground">
              Monitor your improvement with detailed analytics
            </p>
          </Card>
        </div>

        {/* How It Works */}
        <div className="mt-24">
          <h3 className="text-3xl font-bold text-foreground text-center mb-12">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold text-foreground mb-2">Sign Up</h4>
              <p className="text-sm text-muted-foreground">
                Create your account with Google or GitHub
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold text-foreground mb-2">Get Matched</h4>
              <p className="text-sm text-muted-foreground">
                Find partners with similar interests and levels
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold text-foreground mb-2">Start Chatting</h4>
              <p className="text-sm text-muted-foreground">
                Practice conversations with AI assistance
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold text-foreground mb-2">Improve</h4>
              <p className="text-sm text-muted-foreground">
                Review feedback and track your progress
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center">
          <Card className="p-12 bg-primary/10">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Ready to improve your English?
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of students practicing English every day
            </p>
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Learning Now
              </Button>
            </Link>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-primary-foreground mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-muted-foreground/80">
              © 2025 EduMatch. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
