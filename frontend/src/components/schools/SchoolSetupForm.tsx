/**
 * School Setup Form Component
 *
 * Collects school information after OAuth authentication.
 * Simpler version for post-auth flow.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SchoolSetupFormProps {
  userEmail: string;
}

export default function SchoolSetupForm({ userEmail }: SchoolSetupFormProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [maxStudents, setMaxStudents] = useState('50');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolName || !adminName || !maxStudents) {
      showDialog('Missing Information', 'Please fill in all fields');
      return;
    }

    const seats = parseInt(maxStudents);
    if (isNaN(seats) || seats < 1) {
      showDialog('Invalid Input', 'Please enter a valid number of student seats');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          adminName,
          adminEmail: userEmail,
          maxStudents: seats,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register school');
      }

      // Success! Redirect to admin dashboard
      router.push('/admin');
    } catch (error) {
      console.error('School registration error:', error);
      showDialog(
        'Registration Failed',
        error instanceof Error ? error.message : 'Failed to register school. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="schoolName" className="block text-sm font-medium text-foreground mb-1">
            School Name <span className="text-destructive">*</span>
          </label>
          <input
            id="schoolName"
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g., Lincoln High School"
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
          />
        </div>

        <div>
          <label htmlFor="adminName" className="block text-sm font-medium text-foreground mb-1">
            Your Full Name <span className="text-destructive">*</span>
          </label>
          <input
            id="adminName"
            type="text"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="e.g., Jane Smith"
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
          />
        </div>

        <div>
          <label htmlFor="adminEmail" className="block text-sm font-medium text-foreground mb-1">
            Admin Email
          </label>
          <input
            id="adminEmail"
            type="email"
            value={userEmail}
            disabled
            className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Using your authenticated email
          </p>
        </div>

        <div>
          <label htmlFor="maxStudents" className="block text-sm font-medium text-foreground mb-1">
            Number of Student Seats <span className="text-destructive">*</span>
          </label>
          <input
            id="maxStudents"
            type="number"
            value={maxStudents}
            onChange={(e) => setMaxStudents(e.target.value)}
            placeholder="50"
            min="1"
            max="10000"
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1">
            How many students will use EduMatch at your school?
          </p>
        </div>

        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground mb-1">Free During Beta</p>
              <p className="text-muted-foreground">
                All schools get full access during our beta period. No credit card required.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Setting Up School...' : 'Complete Setup'}
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
