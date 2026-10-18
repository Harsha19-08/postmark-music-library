export function toggleTheme() {
  const r = document.documentElement;
  const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  r.dataset.theme = next;
  try { localStorage.setItem('pm-theme', next); } catch { /* ignore */ }
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', next === 'dark' ? '#09090d' : '#f1f2f8'));
}
