/**
 * Unified Chat Header Component
 *
 * Purpose: Reusable header for all chat interfaces (peer, solo practice, voice practice)
 * Features:
 * - Consistent styling matching PageHeader
 * - Optional avatar display (for peer chat)
 * - Flexible badge and action slots
 * - Back button with navigation
 * - Responsive design
 *
 * Usage:
 * ```tsx
 * // Peer chat with partner avatar
 * <ChatHeader
 *   title="John Doe"
 *   backHref="/dashboard"
 *   avatar={{ src: avatarUrl, name: "John Doe" }}
 *   badges={[<Badge>B1</Badge>, <Badge>Movies</Badge>]}
 *   actions={<Badge>5 messages</Badge>}
 * />
 *
 * // Solo practice
 * <ChatHeader
 *   title="AI Practice Coach"
 *   backHref="/dashboard"
 *   badges={[<Badge>B1</Badge>, <Badge>Travel</Badge>]}
 *   actions={<Button onClick={handleFinish}>Finish Session</Button>}
 * />
 *
 * // Voice practice
 * <ChatHeader
 *   title="Voice Practice"
 *   subtitle="Discussing Travel"
 *   backHref="/dashboard"
 *   badges={[<Badge>B1</Badge>, <Badge className="animate-pulse">Live</Badge>]}
 *   actions={<Button onClick={handleEnd}>End Session</Button>}
 * />
 * ```
 */

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ChatHeaderProps {
  /** Main title text */
  title: string;

  /** Optional subtitle (shown below title) */
  subtitle?: string;

  /** Back button destination */
  backHref?: string;

  /** Optional avatar configuration (for peer chat) */
  avatar?: {
    src?: string | null;
    name: string;
  };

  /** Badge elements to display below/beside title */
  badges?: ReactNode;

  /** Action buttons/elements on the right side */
  actions?: ReactNode;

  /** Additional CSS classes */
  className?: string;
}

export function ChatHeader({
  title,
  subtitle,
  backHref = "/dashboard",
  avatar,
  badges,
  actions,
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border/60 bg-background/70 backdrop-blur-md shrink-0",
        className,
      )}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Back button and Title/Avatar */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href={backHref}
              className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>

            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Avatar (for peer chat) */}
              {avatar && (
                <Avatar className="size-10 shrink-0">
                  <AvatarImage
                    src={avatar.src || undefined}
                    alt={avatar.name}
                  />
                  <AvatarFallback className="text-lg font-bold">
                    {avatar.name[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Title and badges */}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-foreground truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
                {badges && (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {badges}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </header>
  );
}
