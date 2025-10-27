/**
 * School Registration Page
 *
 * Dedicated signup flow for schools.
 * Collects school information and creates school admin account.
 * Separate from individual user signup.
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import SchoolSignupForm from "@/components/schools/SchoolSignupForm";
import { PageHeader } from "@/components/layout/PageHeader";

export default function SchoolSignupPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="EduMatch"
        subtitle="School Registration"
        backHref="/"
        backLabel="Home"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Individual Login</Link>
          </Button>
        }
      />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto pt-30 px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Register Your School
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Set up EduMatch for your institution and start connecting students
            for AI-assisted language practice.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center border-primary/20">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold text-foreground mb-2">
              Manage Students
            </h3>
            <p className="text-sm text-muted-foreground">
              Invite and manage student accounts with ease
            </p>
          </Card>
          <Card className="p-6 text-center border-primary/20">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-semibold text-foreground mb-2">
              Track Progress
            </h3>
            <p className="text-sm text-muted-foreground">
              Monitor student engagement and improvement
            </p>
          </Card>
          <Card className="p-6 text-center border-primary/20">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-semibold text-foreground mb-2">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">
              Real-time grammar assistance and feedback
            </p>
          </Card>
        </div>

        {/* Registration Form */}
        <Card className="p-8">
          <SchoolSignupForm />
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Already have a school account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in here
            </Link>
          </p>
          <p className="mt-2">
            Looking for individual practice?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign up as a student
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
