import { useState, useEffect, useCallback } from 'react';

export type ThemeId = 'dark' | 'light' | 'dracula' | 'nord' | 'midnight' | 'emerald' | 'sunset';

export interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  hover: string;
  primary: string;
  primaryHover: string;
  // RGB format: "r g b" for tailwind alpha compatibility
  bgRgb: string;
  surfaceRgb: string;
  borderRgb: string;
  hoverRgb: string;
  primaryRgb: string;
  primaryHoverRgb: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tag: string;
  description: string;
  isDark: boolean;
  colors: ThemeColors;
  previewSwatches: [string, string, string, string]; // [bg, surface, border, primary]
}

export const THEMES_LIST: ThemeDefinition[] = [
  {
    id: 'dark',
    name: 'Dark Modern',
    tag: 'Padrão Escuro',
    description: 'Cinza grafite sofisticado com azul clássico do Google Drive.',
    isDark: true,
    colors: {
      bg: '#131314',
      surface: '#1e1f20',
      border: '#333537',
      hover: '#282a2c',
      primary: '#1a73e8',
      primaryHover: '#1557b0',
      bgRgb: '19 19 20',
      surfaceRgb: '30 31 32',
      borderRgb: '51 53 55',
      hoverRgb: '40 42 44',
      primaryRgb: '26 115 232',
      primaryHoverRgb: '21 87 176'
    },
    previewSwatches: ['#131314', '#1e1f20', '#333537', '#1a73e8']
  },
  {
    id: 'light',
    name: 'Light Clean',
    tag: 'Claro Elegante',
    description: 'Interface clara, nítida e iluminada com contraste agradável para leitura.',
    isDark: false,
    colors: {
      bg: '#f8fafd',
      surface: '#ffffff',
      border: '#e0e3e7',
      hover: '#f1f3f4',
      primary: '#1a73e8',
      primaryHover: '#1557b0',
      bgRgb: '248 250 253',
      surfaceRgb: '255 255 255',
      borderRgb: '224 227 231',
      hoverRgb: '241 243 244',
      primaryRgb: '26 115 232',
      primaryHoverRgb: '21 87 176'
    },
    previewSwatches: ['#f8fafd', '#ffffff', '#e0e3e7', '#1a73e8']
  },
  {
    id: 'dracula',
    name: 'Dracula',
    tag: 'Vampiro & Roxo',
    description: 'O famoso tema Dracula com fundo azul-escuro, seleções cinzas e acentos roxos.',
    isDark: true,
    colors: {
      bg: '#282a36',
      surface: '#343746',
      border: '#44475a',
      hover: '#4c5067',
      primary: '#bd93f9',
      primaryHover: '#a87be8',
      bgRgb: '40 42 54',
      surfaceRgb: '52 55 70',
      borderRgb: '68 71 90',
      hoverRgb: '76 80 103',
      primaryRgb: '189 147 249',
      primaryHoverRgb: '168 123 232'
    },
    previewSwatches: ['#282a36', '#343746', '#bd93f9', '#ff79c6']
  },
  {
    id: 'nord',
    name: 'Nord Polar',
    tag: 'Gelo Ártico',
    description: 'Paleta inspirada na aurora boreal nórdica com tons azul-frio e ciano gelado.',
    isDark: true,
    colors: {
      bg: '#242933',
      surface: '#2e3440',
      border: '#434c5e',
      hover: '#3b4252',
      primary: '#88c0d0',
      primaryHover: '#81a1c1',
      bgRgb: '36 41 51',
      surfaceRgb: '46 52 64',
      borderRgb: '67 76 94',
      hoverRgb: '59 66 82',
      primaryRgb: '136 192 208',
      primaryHoverRgb: '129 161 193'
    },
    previewSwatches: ['#242933', '#2e3440', '#434c5e', '#88c0d0']
  },
  {
    id: 'midnight',
    name: 'Midnight Neon',
    tag: 'Cyberpunk & OLED',
    description: 'Preto profundo estilo OLED com acentos roxos eletrizantes e estilo futurista.',
    isDark: true,
    colors: {
      bg: '#0a0b10',
      surface: '#141624',
      border: '#282b45',
      hover: '#1e2034',
      primary: '#c084fc',
      primaryHover: '#a855f7',
      bgRgb: '10 11 16',
      surfaceRgb: '20 22 36',
      borderRgb: '40 43 69',
      hoverRgb: '30 32 52',
      primaryRgb: '192 132 252',
      primaryHoverRgb: '168 85 247'
    },
    previewSwatches: ['#0a0b10', '#141624', '#c084fc', '#f43f5e']
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    tag: 'Natureza & Matrix',
    description: 'Verde musgo escuro com destaques esmeralda vivos e atmosfera bio-orgânica.',
    isDark: true,
    colors: {
      bg: '#0b1714',
      surface: '#142622',
      border: '#23423a',
      hover: '#1c362f',
      primary: '#10b981',
      primaryHover: '#059669',
      bgRgb: '11 23 20',
      surfaceRgb: '20 38 34',
      borderRgb: '35 66 58',
      hoverRgb: '28 54 47',
      primaryRgb: '16 185 129',
      primaryHoverRgb: '5 150 105'
    },
    previewSwatches: ['#0b1714', '#142622', '#10b981', '#34d399']
  },
  {
    id: 'sunset',
    name: 'Warm Sunset',
    tag: 'Sépia & Âmbar',
    description: 'Tons terrosos aconchegantes de café, carvalho e âmbar dourado de entardecer.',
    isDark: true,
    colors: {
      bg: '#1a1613',
      surface: '#27221e',
      border: '#423933',
      hover: '#352d27',
      primary: '#f59e0b',
      primaryHover: '#d97706',
      bgRgb: '26 22 19',
      surfaceRgb: '39 34 30',
      borderRgb: '66 57 51',
      hoverRgb: '53 45 39',
      primaryRgb: '245 158 11',
      primaryHoverRgb: '217 119 6'
    },
    previewSwatches: ['#1a1613', '#27221e', '#423933', '#f59e0b']
  }
];

export const THEME_STORAGE_KEY = 'drivegram_theme';
export const THEME_CHANGED_EVENT = 'drivegram-theme-changed';

export function getThemeById(id: string | null | undefined): ThemeDefinition {
  if (!id) return THEMES_LIST[0];
  const found = THEMES_LIST.find(t => t.id === id);
  return found || THEMES_LIST[0];
}

export function getStoredThemeId(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEMES_LIST.some(t => t.id === saved)) {
      return saved as ThemeId;
    }
  } catch (_) {}
  return 'dark';
}

export function applyTheme(id: ThemeId): ThemeDefinition {
  const theme = getThemeById(id);
  
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.id);

    if (theme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Set dynamic CSS properties on document root
    root.style.setProperty('--drive-dark-bg', theme.colors.bgRgb);
    root.style.setProperty('--drive-dark-surface', theme.colors.surfaceRgb);
    root.style.setProperty('--drive-dark-border', theme.colors.borderRgb);
    root.style.setProperty('--drive-dark-hover', theme.colors.hoverRgb);
    root.style.setProperty('--drive-primary', theme.colors.primaryRgb);
    root.style.setProperty('--drive-primary-hover', theme.colors.primaryHoverRgb);

    // Update <meta name="theme-color"> for mobile/Android status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.colors.bg);
    }
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch (_) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: theme.id }));
  }

  return theme;
}

export function useTheme() {
  const [themeId, setThemeId] = useState<ThemeId>(() => getStoredThemeId());

  useEffect(() => {
    // Apply current theme on mount
    applyTheme(themeId);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeId>;
      if (customEvent.detail && customEvent.detail !== themeId) {
        setThemeId(customEvent.detail);
      }
    };

    window.addEventListener(THEME_CHANGED_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, handleThemeChange);
  }, [themeId]);

  const setTheme = useCallback((newId: ThemeId) => {
    setThemeId(newId);
    applyTheme(newId);
  }, []);

  const currentTheme = getThemeById(themeId);

  return {
    themeId,
    currentTheme,
    setTheme,
    isDark: currentTheme.isDark,
    themesList: THEMES_LIST
  };
}
