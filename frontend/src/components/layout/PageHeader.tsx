/**
 * Page Header Component
 *
 * Reusable header for all pages with flexible configuration.
 *
 * Features:
 * - Optional back button with customizable destination
 * - Title with optional subtitle/badge
 * - Right-side actions (buttons, forms, custom content)
 * - Modern design with backdrop blur and border
 *
 * Usage:
 * ```tsx
 * // Simple header with title
 * <PageHeader title="Dashboard" />
 *
 * // With back button
 * <PageHeader title="Profile" backHref="/dashboard" />
 *
 * // With actions on right
 * <PageHeader
 *   title="Settings"
 *   backHref="/dashboard"
 *   actions={<Button>Save</Button>}
 * />
 *
 * // With sign out
 * <PageHeader
 *   title="Dashboard"
 *   actions={
 *     <form action="/auth/signout" method="post">
 *       <Button type="submit">Sign Out</Button>
 *     </form>
 *   }
 * />
 * ```
 */

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Main title text */
  title: string;

  /** Optional subtitle or description */
  subtitle?: string;

  /** Optional back button destination */
  backHref?: string;

  /** Optional back button label (defaults to "Back") */
  backLabel?: string;

  /** Actions to display on the right side (buttons, forms, etc.) */
  actions?: ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Whether to use sticky positioning (default: false) */
  sticky?: boolean;

  /** Custom container max width (default: 7xl) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  actions,
  className,
  sticky = false,
  maxWidth = '7xl',
}: PageHeaderProps) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <header
      className={cn(
        'border-b border-border/60 bg-background/70 backdrop-blur-md fixed z-20 w-full',
        sticky && 'sticky top-0 z-40',
        className
      )}
    >
      <div className={cn(maxWidthClass, 'mx-auto px-4 sm:px-6 lg:px-8 py-4')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left side - Back button and Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {backHref && (
              <Link
                href={backHref}
                className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-medium hidden sm:inline">
                  {backLabel} || "Back"
                </span>
              </Link>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
