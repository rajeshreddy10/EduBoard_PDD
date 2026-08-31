const THEME_KEY = 'eduboard-theme';
const ACCENT_KEY = 'eduboard-accent';

export type ThemeId = 'light' | 'dark' | 'midnight' | 'sunset' | 'emerald' | 'cyberpunk';

const VALID_THEMES: ThemeId[] = ['light', 'dark', 'midnight', 'sunset', 'emerald', 'cyberpunk'];

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY) as ThemeId;
  return VALID_THEMES.includes(stored) ? stored : 'light';
}

export function getStoredAccent(): string {
  if (typeof window === 'undefined') return '#3b82f6';
  return localStorage.getItem(ACCENT_KEY) || '#3b82f6';
}

export function applyTheme(theme: ThemeId) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const safeTheme = VALID_THEMES.includes(theme) ? theme : 'light';

  // Clear existing theme classes
  VALID_THEMES.forEach(t => {
    root.classList.remove(t);
    root.classList.remove(`theme-${t}`);
  });

  root.setAttribute('data-theme', safeTheme);

  if (safeTheme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.add('dark');
    root.classList.add(`theme-${safeTheme}`);
    root.classList.add(safeTheme);
  }

  localStorage.setItem(THEME_KEY, safeTheme);

  // Broadcast event for all components
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: safeTheme } }));
}

export function applyAccent(color: string) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary-500', color);
  root.style.setProperty('--color-primary-400', shadeHex(color, 18));
  root.style.setProperty('--color-primary-600', shadeHex(color, -12));
  localStorage.setItem(ACCENT_KEY, color);

  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { accent: color } }));
}

function shadeHex(hex: string, percent: number) {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function initTheme() {
  const theme = getStoredTheme();
  const accent = getStoredAccent();
  applyTheme(theme);
  applyAccent(accent);
}
