// Runtime accent theming. The whole app reads its accent from CSS variables
// (--accent-rgb, --accent-strong), so changing these recolors everything at once.
export const ACCENTS = [
  { id: 'emerald', name: 'زمرّدي', rgb: '15 118 110',  hex: '#0f766e', strong: '#0b5d56' },
  { id: 'blue',    name: 'أزرق',   rgb: '29 78 216',   hex: '#1d4ed8', strong: '#1e40af' },
  { id: 'indigo',  name: 'نيلي',   rgb: '67 56 202',   hex: '#4338ca', strong: '#3730a3' },
  { id: 'violet',  name: 'بنفسجي', rgb: '109 40 217',  hex: '#6d28d9', strong: '#5b21b6' },
  { id: 'teal',    name: 'تركوازي',rgb: '13 148 136',  hex: '#0d9488', strong: '#0f766e' },
  { id: 'rose',    name: 'وردي',   rgb: '190 24 93',   hex: '#be185d', strong: '#9d174d' },
  { id: 'red',     name: 'أحمر',   rgb: '185 28 28',   hex: '#b91c1c', strong: '#991b1b' },
  { id: 'amber',   name: 'كهرماني',rgb: '180 83 9',    hex: '#b45309', strong: '#92400e' },
  { id: 'slate',   name: 'رصاصي',  rgb: '51 65 85',    hex: '#334155', strong: '#1e293b' },
];

const KEY = 'rf-accent';

export const getAccentId = () => {
  try { return localStorage.getItem(KEY) || 'emerald'; } catch { return 'emerald'; }
};

export const getAccent = () => ACCENTS.find(a => a.id === getAccentId()) || ACCENTS[0];

export const applyAccent = (id) => {
  const a = ACCENTS.find(x => x.id === id) || ACCENTS[0];
  const root = document.documentElement;
  root.style.setProperty('--accent-rgb', a.rgb);
  root.style.setProperty('--accent-strong', a.strong);
  try { localStorage.setItem(KEY, a.id); } catch { /* ignore */ }
  return a;
};

export const initAccent = () => applyAccent(getAccentId());
