import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(
    typeof date === 'string' ? new Date(date) : date
  );
}

export function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function ageFromBirthYear(birthYear: number): number {
  return currentYear() - birthYear;
}
