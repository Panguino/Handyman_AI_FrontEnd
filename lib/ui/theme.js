export function applyThemeFromStorage() {
  try {
    const stored = localStorage.getItem('theme'); // 'light' | 'dark' | 'system' | null
    const root = document.documentElement;
    if (!stored || stored === 'system') {
      root.removeAttribute('data-theme');
      return 'system';
    }
    root.setAttribute('data-theme', stored);
    return stored;
  } catch {
    return 'system';
  }
}

export function setTheme(mode) {
  try {
    if (!['light', 'dark', 'system'].includes(mode)) mode = 'system';
    localStorage.setItem('theme', mode);
    applyThemeFromStorage();
  } catch {}
}

export function getTheme() {
  try {
    return localStorage.getItem('theme') || 'system';
  } catch {
    return 'system';
  }
}

