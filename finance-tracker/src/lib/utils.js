import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — merge conditional class names, with Tailwind conflict resolution.
 * Used by every component under src/components/ui.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
