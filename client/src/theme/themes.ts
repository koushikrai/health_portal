export interface ThemeConfig {
  id: string;
  name: string;
  subtitle: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string; // Accent
  secondaryHover: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  surfaceCanvas: string;
  badge: string;
  previewColors: [string, string, string];
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'orange-blue',
    name: 'Expertise Orange & Blue',
    subtitle: 'Signature Corporate Navy with Safety Industrial Orange',
    primary: '#1A1F45',
    primaryDark: '#0A0F1D',
    primaryLight: '#2C356E',
    primaryContainer: '#131B35',
    onPrimaryContainer: '#FFFFFF',
    secondary: '#E97F29',
    secondaryHover: '#D46F1E',
    secondaryContainer: '#FFF3EA',
    onSecondaryContainer: '#9A4603',
    tertiary: '#0284C7',
    tertiaryContainer: '#E0F2FE',
    onTertiaryContainer: '#0369A1',
    surfaceCanvas: '#F8FAFC',
    badge: 'Default Theme',
    previewColors: ['#1A1F45', '#E97F29', '#0284C7']
  },
  {
    id: 'clinical-teal',
    name: 'Clinical Teal & Emerald',
    subtitle: 'Accredited Healthcare Teal with Diagnostic Emerald',
    primary: '#0f766e',
    primaryDark: '#0d5f59',
    primaryLight: '#14b8a6',
    primaryContainer: '#0f766e',
    onPrimaryContainer: '#a3faef',
    secondary: '#059669',
    secondaryHover: '#047857',
    secondaryContainer: '#ecfdf5',
    onSecondaryContainer: '#065f46',
    tertiary: '#0284c7',
    tertiaryContainer: '#f0f9ff',
    onTertiaryContainer: '#0369a1',
    surfaceCanvas: '#f8f9ff',
    badge: 'Client Meeting Spec',
    previewColors: ['#0f766e', '#059669', '#0284c7']
  },
  {
    id: 'petrochem-amber',
    name: 'Petrochem Ocean & Amber',
    subtitle: 'Industrial Marine Petrochem Blue with Amber Warning Accent',
    primary: '#0369a1',
    primaryDark: '#075985',
    primaryLight: '#38bdf8',
    primaryContainer: '#0284c7',
    onPrimaryContainer: '#e0f2fe',
    secondary: '#d97706',
    secondaryHover: '#b45309',
    secondaryContainer: '#fffbeb',
    onSecondaryContainer: '#92400e',
    tertiary: '#0d9488',
    tertiaryContainer: '#ccfbf1',
    onTertiaryContainer: '#115e59',
    surfaceCanvas: '#f0f9ff',
    badge: 'Industrial',
    previewColors: ['#0369a1', '#d97706', '#0d9488']
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Slate & Electric Indigo',
    subtitle: 'Sleek Dark Slate Grid with High-Tech Violet Indigo',
    primary: '#0f172a',
    primaryDark: '#020617',
    primaryLight: '#334155',
    primaryContainer: '#1e293b',
    onPrimaryContainer: '#f8fafc',
    secondary: '#4f46e5',
    secondaryHover: '#4338ca',
    secondaryContainer: '#eef2ff',
    onSecondaryContainer: '#312e81',
    tertiary: '#06b6d4',
    tertiaryContainer: '#cffafe',
    onTertiaryContainer: '#155e75',
    surfaceCanvas: '#f8fafc',
    badge: 'High-Tech',
    previewColors: ['#0f172a', '#4f46e5', '#06b6d4']
  },
  {
    id: 'forest-mint',
    name: 'Bio-Forest & Mint Health',
    subtitle: 'Deep Natural Pine with Vivid Clinical Mint Clearance',
    primary: '#064e3b',
    primaryDark: '#022c22',
    primaryLight: '#047857',
    primaryContainer: '#065f46',
    onPrimaryContainer: '#d1fae5',
    secondary: '#10b981',
    secondaryHover: '#059669',
    secondaryContainer: '#ecfdf5',
    onSecondaryContainer: '#065f46',
    tertiary: '#0891b2',
    tertiaryContainer: '#cffafe',
    onTertiaryContainer: '#164e63',
    surfaceCanvas: '#f0fdf4',
    badge: 'Clean Health',
    previewColors: ['#064e3b', '#10b981', '#0891b2']
  },
  {
    id: 'royal-fuchsia',
    name: 'Royal Amethyst & Fuchsia',
    subtitle: 'Executive Imperial Purple with Vibrant Modern Rose',
    primary: '#3b0764',
    primaryDark: '#240046',
    primaryLight: '#581c87',
    primaryContainer: '#4c1d95',
    onPrimaryContainer: '#ede9fe',
    secondary: '#d946ef',
    secondaryHover: '#c026d3',
    secondaryContainer: '#fdf4ff',
    onSecondaryContainer: '#86198f',
    tertiary: '#3b82f6',
    tertiaryContainer: '#eff6ff',
    onTertiaryContainer: '#1d4ed8',
    surfaceCanvas: '#faf5ff',
    badge: 'Executive',
    previewColors: ['#3b0764', '#d946ef', '#3b82f6']
  },
  {
    id: 'crimson-gold',
    name: 'Crimson Guardian & Safety Gold',
    subtitle: 'Emergency Clinical Ruby with High-Contrast Warning Gold',
    primary: '#7f1d1d',
    primaryDark: '#450a0a',
    primaryLight: '#991b1b',
    primaryContainer: '#881337',
    onPrimaryContainer: '#ffe4e6',
    secondary: '#f59e0b',
    secondaryHover: '#d97706',
    secondaryContainer: '#fffbeb',
    onSecondaryContainer: '#78350f',
    tertiary: '#2563eb',
    tertiaryContainer: '#eff6ff',
    onTertiaryContainer: '#1e40af',
    surfaceCanvas: '#fff1f2',
    badge: 'High-Visibility',
    previewColors: ['#7f1d1d', '#f59e0b', '#2563eb']
  }
];

export const DEFAULT_THEME_ID = 'orange-blue';
