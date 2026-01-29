import { useEffect } from 'react';

/**
 * Hook simplificado que NÃO aplica tema dinâmico no sistema administrativo.
 * O sistema administrativo usa exclusivamente paleta neutra (Zinc/Slate).
 * As cores dinâmicas são aplicadas APENAS na página pública.
 */
export function useDynamicTheme() {
  // Este hook não faz mais nada no sistema administrativo
  // As cores personalizadas são aplicadas apenas na página pública
  return {
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
    darkMode: false,
  };
}

/**
 * Converte cor hexadecimal para HSL
 * Usado apenas na página pública
 */
export function hexToHSL(hex: string): string {
  hex = hex.replace(/^#/, '');

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }

  const hue = Math.round(h * 360);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${hue} ${saturation}% ${lightness}%`;
}
