'use client';
import { toggleTheme } from '@/lib/theme';
import { Icon } from './Icon';

export function ThemeButton({ label = false }: { label?: boolean }) {
  return (
    <button className={label ? 'btn' : 'ib'} onClick={toggleTheme} aria-label="Switch between light and dark theme">
      <span className="t-sun"><Icon name="sun" size={20} /></span><span className="t-moon"><Icon name="moon" size={20} /></span>{label && <span>Theme</span>}
    </button>
  );
}
