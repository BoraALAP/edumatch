/**
 * Homepage
 *
 * Landing page for EduMatch platform.
 * Shows welcome message and login button for unauthenticated users.
 */

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Prism from '@/components/Prism';
import TextType from '@/components/TextType';
import ElectricBorder from '@/components/ElectricBorder';
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background text-foreground">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">EduMatch</h1>
          <div className="flex items-center gap-3">
            <Link href="/schools/signup">
              <Button variant="secondary" className="border border-white/10 bg-white/5 text-white hover:bg-white/10">
                For Schools
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="absolute -top-0  mx-auto  overflow-auto inset-0 z-0 h-[800px] ">

        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={7.5}
          baseWidth={7}
          scale={2}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={0.4}
        />


      </div>

      <main className="mx-auto flex max-w-7xl flex-col gap-24 bg-background/40 px-4 pb-24 sm:px-6 lg:px-8 relative">
        <section className="   grid items-center gap-16 ">
          <div className="space-y-10 z-20 py-24  text-center ">
            <span className="mx-auto inline-flex items-center justify-center rounded-full bg-primary/15 px-4 py-1 text-sm font-medium text-primary lg:mx-0">
              AI-powered speaking practice
            </span>
            <div className="space-y-6">
              <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Practice English with real conversations and instant AI {" "}
                <TextType
                  as="span"
                  className="text-balance text-accent text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
                  text={[
                    'feedback',
                    'correction',
                    'help',
                  ]}
                  pauseDuration={2200}
                  typingSpeed={100}
                  deletingSpeed={100}
                  cursorClassName="text-accent"
                  cursorCharacter="|"
                />
              </h2>
              <p className="text-lg text-foreground sm:text-xl">
                EduMatch pairs language learners for immersive speaking practice while our AI coach keeps you on track with grammar tips, pronunciation cues, and personalized goals.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6 ">
              <Link href="/login">
                <Button size="lg" className="h-14 rounded-full bg-primary px-10 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/schools/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-white/20 bg-white/5 px-10 text-lg font-semibold text-white hover:bg-white/10"
                >
                  For Schools
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required · Free during beta
            </p>
          </div>


        </section>

        <section className="space-y-12">
          <div className="space-y-4 text-center">
            <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for confident communication</h3>
            <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
              Structured conversation practice and adaptive AI guidance help you progress faster—whether you&apos;re preparing for exams or feeling confident in everyday chats.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border border-white/10 bg-card/40 p-8 backdrop-blur">
              <div className="mb-4 text-4xl">💬</div>
              <h4 className="mb-3 text-xl font-semibold text-foreground">Real-time conversations</h4>
              <p className="text-muted-foreground">
                Practice speaking with matched partners or our AI assistant in safe, structured sessions tailored to your level.
              </p>
            </Card>
            <Card className="border border-white/10 bg-card/40 p-8 backdrop-blur">
              <div className="mb-4 text-4xl">✨</div>
              <h4 className="mb-3 text-xl font-semibold text-foreground">Always-on grammar coach</h4>
              <p className="text-muted-foreground">
                Get instant grammar suggestions, pronunciation cues, and vocabulary prompts while you speak.
              </p>
            </Card>
            <Card className="border border-white/10 bg-card/40 p-8 backdrop-blur">
              <div className="mb-4 text-4xl">📈</div>
              <h4 className="mb-3 text-xl font-semibold text-foreground">Progress you can feel</h4>
              <p className="text-muted-foreground">
                Track your growth with session summaries, speaking time insights, and personalized next steps.
              </p>
            </Card>
          </div>
        </section>

        <section className="space-y-12">
          <h3 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">How EduMatch works</h3>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { step: '1', title: 'Create your profile', copy: 'Sign up with Google or GitHub and tell us your goals.' },
              { step: '2', title: 'Get matched', copy: 'Find partners with similar interests and proficiency levels.' },
              { step: '3', title: 'Start chatting', copy: 'Join guided conversations with AI support and live feedback.' },
              { step: '4', title: 'Review & improve', copy: 'Save transcripts, revisit AI notes, and celebrate your progress.' },
            ].map(({ step, title, copy }) => (
              <div
                key={step}
                className="rounded-2xl border border-white/10 bg-background/60 p-6 text-center shadow-sm shadow-black/30 backdrop-blur"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {step}
                </div>
                <h4 className="mb-2 font-semibold text-foreground">{title}</h4>
                <p className="text-sm text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <ElectricBorder className="rounded-3xl" style={{ borderRadius: '32px' }}>
            <Card className="rounded-3xl bg-background/30 p-12 text-center shadow-lg shadow-primary/20 backdrop-blur-sm">
              <h3 className="mb-4 text-3xl font-semibold text-foreground">Ready to feel fluent?</h3>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-foreground">
                Join language learners practicing every day and unlock AI-powered insights that accelerate your confidence.
              </p>
              <Link href="/login">
                <Button size="lg" className="h-14 rounded-full bg-primary px-10 text-lg font-semibold text-primary-foreground hover:bg-primary/90">
                  Start learning now
                </Button>
              </Link>
            </Card>
          </ElectricBorder>

          <Card className="border border-white/10 bg-background/60 p-12 text-center backdrop-blur">
            <div className="flex flex-col items-center gap-6">
              <div className="text-4xl">🏫</div>
              <div className="space-y-3">
                <h3 className="text-3xl font-semibold text-foreground">Bring EduMatch to your school</h3>
                <p className="text-lg text-muted-foreground">
                  Empower your students with AI-assisted speaking practice, track their progress, and manage sessions in one place.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Manage students
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Track progress
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Additional features
                </span>
              </div>
              <Link href="/schools/signup">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-14 rounded-full border border-white/20 bg-white/10 px-10 text-lg font-semibold text-white hover:bg-white/20"
                >
                  Register your school
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background/70">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          © {new Date().getFullYear()} EduMatch. All rights reserved.
        </div>
      </footer>
    </div >
  );
}
