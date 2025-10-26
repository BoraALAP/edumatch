/**
 * Selection Button Component
 *
 * Reusable button for selecting options in forms and interfaces.
 * Supports:
 * - Single action mode (click to trigger action)
 * - Multi-selection mode (toggleable with selected state)
 * - Optional badge display
 * - Disabled states
 */

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SelectionButtonProps {
  /** The text label to display */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the item is selected (for multi-select mode) */
  isSelected?: boolean;
  /** Optional description text to display below the label */
  description?: string;
  /** Optional badge to display */
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  };
  /** Additional className for customization */
  className?: string;
  /** Unique key for the button */
  testId?: string;
}

export function SelectionButton({
  label,
  onClick,
  disabled = false,
  isSelected = false,
  description,
  badge,
  className,
  testId,
}: SelectionButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      variant="outline"
      className={cn(
        'p-4 border-2 rounded-lg text-left transition-all h-auto justify-start relative',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50',
        disabled && !isSelected && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-start justify-between w-full gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="font-semibold text-foreground text-wrap">{label}</span>
          {description && (
            <span className="text-xs text-muted-foreground text-wrap leading-tight">{description}</span>
          )}
          {badge && (
            <Badge
              variant={badge.variant || 'secondary'}
              className={cn('text-xs w-fit', badge.className)}
            >
              {badge.text}
            </Badge>
          )}
        </div>
        {isSelected && (
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              className="w-3 h-3 text-primary-foreground"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </Button>
  );
}
