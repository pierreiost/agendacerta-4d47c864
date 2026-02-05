import { Heart, Scissors, type LucideIcon } from 'lucide-react';

/**
 * Returns true if the venue segment is service-based (beauty or health)
 */
export function isServiceSegment(segment?: string | null): boolean {
  return segment === 'beauty' || segment === 'health' || segment === 'custom';
}

/**
 * Returns true if the venue segment is space-based (sports)
 */
export function isSportsSegment(segment?: string | null): boolean {
  return segment === 'sports';
}

/**
 * Returns true if the venue segment is custom (assistência técnica)
 */
export function isCustomSegment(segment?: string | null): boolean {
  return segment === 'custom';
}

/**
 * Returns the appropriate service icon based on venue segment.
 * - Health segment: Heart icon
 * - Beauty/Other segments: Scissors icon
 */
export function getServiceIcon(segment?: string): LucideIcon {
  return segment === 'health' ? Heart : Scissors;
}

/**
 * Returns the singular client label based on venue segment.
 * - Health segment: "paciente"
 * - Other segments: "cliente"
 */
export function getClientLabel(segment?: string, capitalize = false): string {
  const label = segment === 'health' ? 'paciente' : 'cliente';
  return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

/**
 * Returns the plural clients label based on venue segment.
 * - Health segment: "pacientes"
 * - Other segments: "clientes"
 */
export function getClientsLabel(segment?: string, capitalize = false): string {
  const label = segment === 'health' ? 'pacientes' : 'clientes';
  return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}