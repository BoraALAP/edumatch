"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ProfileLike = {
  avatar_url: string | null;
  display_name?: string | null;
  full_name?: string | null;
};

type SizeOption = "sm" | "md" | "lg" | "xl";

const SIZE_STYLES: Record<SizeOption, { container: string; initials: string }> =
  {
    sm: { container: "size-8", initials: "text-sm" },
    md: { container: "size-10", initials: "text-base" },
    lg: { container: "w-16 h-16", initials: "text-xl" },
    xl: { container: "w-20 h-20", initials: "text-2xl" },
  };

export interface ProfileAvatarProps {
  profile: ProfileLike;
  email?: string | null;
  size?: SizeOption;
  className?: string;
}

const getInitial = (profile: ProfileLike, email?: string | null) => {
  const fallbackSource =
    profile.display_name || profile.full_name || email || "U";
  return fallbackSource.slice(0, 1).toUpperCase();
};

export function ProfileAvatar({
  profile,
  email,
  size = "lg",
  className,
}: ProfileAvatarProps) {
  const { container, initials } = SIZE_STYLES[size];

  return (
    <Avatar className={cn(container, className)}>
      <AvatarImage
        src={profile.avatar_url || undefined}
        alt={profile.display_name || profile.full_name || "Profile"}
        className="object-cover"
      />
      <AvatarFallback
        className={cn(
          "bg-linear-to-br from-primary to-secondary text-primary-foreground font-semibold",
          initials
        )}
      >
        {getInitial(profile, email)}
      </AvatarFallback>
    </Avatar>
  );
}
