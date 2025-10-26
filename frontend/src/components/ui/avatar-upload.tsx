/**
 * Avatar Upload Component
 *
 * Reusable component for uploading profile pictures.
 * Features:
 * - Entire avatar area is clickable for better UX
 * - Shows preview of selected image
 * - Displays initials or upload icon when no image
 * - File validation (type and size)
 * - Hover effects for better discoverability
 */

'use client';

import { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  /** Current avatar URL */
  avatarUrl?: string | null;
  /** Preview URL for newly selected image */
  previewUrl?: string | null;
  /** User's initials to display when no avatar */
  initials?: string;
  /** Callback when file is selected */
  onFileSelect: (file: File) => void;
  /** Size of the avatar (default: 24 = 96px) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Whether upload is disabled */
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

const iconSizes = {
  sm: 'w-6 h-6',
  md: 'w-7 h-7',
  lg: 'w-8 h-8',
  xl: 'w-10 h-10',
};

export function AvatarUpload({
  avatarUrl,
  previewUrl,
  initials,
  onFileSelect,
  size = 'lg',
  className,
  disabled = false,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      e.target.value = ''; // Reset input
      return;
    }

    onFileSelect(file);
    toast.success('Avatar uploaded successfully');
  };

  const displayUrl = previewUrl || avatarUrl;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div
        className={cn(
          'relative cursor-pointer group',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Avatar className={cn(sizeClasses[size], 'transition-all')}>
          <AvatarImage src={displayUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl">
            {initials ? (
              <span className="font-semibold">{initials}</span>
            ) : (
              <Upload className={iconSizes[size]} />
            )}
          </AvatarFallback>
        </Avatar>

        {/* Hover overlay */}
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity',
            isHovering && !disabled ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Upload className={cn(iconSizes[size], 'text-white')} />
        </div>

        {/* Upload badge in bottom-right corner */}
        <div
          className={cn(
            'absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 transition-transform',
            !disabled && 'group-hover:scale-110'
          )}
        >
          <Upload className="w-3 h-3" />
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
          aria-label="Upload avatar"
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {disabled ? 'Upload disabled' : 'Click to upload a profile picture'}
        <br />
        Max 5MB • JPG, PNG, GIF, or WebP
      </p>
    </div>
  );
}
