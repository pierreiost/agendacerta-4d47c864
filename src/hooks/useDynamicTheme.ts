import { useEffect } from 'react';
import { useVenue } from '@/contexts/VenueContext';

/**
 * Converte cor hexadecimal para HSL
 * @param hex - Cor em formato hexadecimal (#RRGGBB ou #RGB)
 * @returns String HSL no formato "H S% L%" (sem hsl() wrapper)
 */
function hexToHSL(hex: string): string {
  // Remover # se presente
  hex = hex.replace(/^#/, '');

  // Expandir formato curto (#RGB -> #RRGGBB)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  // Converter para RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Encontrar min/max
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

  // Converter para formato CSS
  const hue = Math.round(h * 360);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${hue} ${saturation}% ${lightness}%`;
}

/**
 * Gera variações de cor (mais clara e mais escura)
 */
function generateColorVariations(hex: string) {
  const hsl = hexToHSL(hex);
  const [h, s, l] = hsl.split(' ').map((v, i) => (i === 0 ? parseInt(v) : parseInt(v)));

  return {
    base: hsl,
    // Versão mais clara para backgrounds
    light: `${h} ${Math.min(s + 10, 100)}% ${Math.min(l + 35, 95)}%`,
    // Versão mais escura para hover
    dark: `${h} ${s}% ${Math.max(l - 10, 20)}%`,
    // Foreground (texto) - branco ou escuro dependendo da luminosidade
    foreground: l > 50 ? '0 0% 10%' : '0 0% 100%',
  };
}

/**
 * Hook para aplicar tema dinâmico baseado nas configurações do venue
 * Suporta:
 * - Cor primária: botões principais, links, sidebar ativa
 * - Cor secundária: botões secundários, badges
 * - Cor de destaque: notificações, alertas
 * - Modo escuro: tema dark/light
 */
export function useDynamicTheme() {
  const { currentVenue } = useVenue();

  useEffect(() => {
    const root = document.documentElement;
    const primaryColor = currentVenue?.primary_color;
    const secondaryColor = currentVenue?.secondary_color;
    const accentColor = currentVenue?.accent_color;
    const darkMode = currentVenue?.dark_mode;

    // Aplicar modo escuro
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Se não há nenhuma cor definida, limpar customizações
    if (!primaryColor && !secondaryColor && !accentColor) {
      // Remover customizações de cor primária
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--brand');
      root.style.removeProperty('--brand-foreground');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-accent-foreground');
      root.style.removeProperty('--ring');
      // Remover customizações de cor secundária
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--secondary-foreground');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--muted-foreground');
      // Remover customizações de cor de destaque
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
      root.style.removeProperty('--destructive');
      return;
    }

    // Aplicar cor primária
    if (primaryColor && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(primaryColor)) {
      const variations = generateColorVariations(primaryColor);

      // Cor primária principal
      root.style.setProperty('--primary', variations.base);
      root.style.setProperty('--primary-foreground', variations.foreground);

      // Aplicar também como brand para manter consistência com sidebar
      root.style.setProperty('--brand', variations.base);
      root.style.setProperty('--brand-foreground', variations.foreground);

      // Sidebar
      root.style.setProperty('--sidebar-primary', variations.base);
      root.style.setProperty('--sidebar-primary-foreground', variations.foreground);
      root.style.setProperty('--sidebar-accent', variations.light);
      root.style.setProperty('--sidebar-accent-foreground', '0 0% 10%');

      // Ring (focus)
      root.style.setProperty('--ring', variations.base);
    }

    // Aplicar cor secundária
    if (secondaryColor && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(secondaryColor)) {
      const variations = generateColorVariations(secondaryColor);

      root.style.setProperty('--secondary', variations.light);
      root.style.setProperty('--secondary-foreground', '0 0% 10%');
      root.style.setProperty('--muted', variations.light);
      root.style.setProperty('--muted-foreground', variations.dark);
    }

    // Aplicar cor de destaque/accent
    if (accentColor && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(accentColor)) {
      const variations = generateColorVariations(accentColor);

      root.style.setProperty('--accent', variations.light);
      root.style.setProperty('--accent-foreground', variations.dark);
      // Usar accent também para destructive (alertas) quando é vermelho/laranja
      // Caso contrário, manter o padrão
    }

    // Cleanup quando o componente desmonta
    return () => {
      root.classList.remove('dark');
      // Cores primárias
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--brand');
      root.style.removeProperty('--brand-foreground');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-accent-foreground');
      root.style.removeProperty('--ring');
      // Cores secundárias
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--secondary-foreground');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--muted-foreground');
      // Cores de destaque
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
    };
  }, [
    currentVenue?.primary_color,
    currentVenue?.secondary_color,
    currentVenue?.accent_color,
    currentVenue?.dark_mode,
  ]);

  return {
    primaryColor: currentVenue?.primary_color || null,
    secondaryColor: currentVenue?.secondary_color || null,
    accentColor: currentVenue?.accent_color || null,
    darkMode: currentVenue?.dark_mode || false,
  };
}
