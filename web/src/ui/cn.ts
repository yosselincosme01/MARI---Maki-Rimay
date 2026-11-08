import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Junta clases y, si dos de Tailwind chocan (p. ej. h-12 y h-14), gana la última. */
export function cn(...clases: ClassValue[]): string {
  return twMerge(clsx(clases))
}
