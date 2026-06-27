import React from 'react';
import { Sun, Moon, Eye } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      className="flex items-center justify-center w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-red-600 focus:outline-none cursor-pointer"
      title={`Current Theme: ${theme.toUpperCase()} (Click to cycle themes)`}
      aria-label={`Current Theme: ${theme}. Click to cycle between Light, Dark, and Night-Watch themes`}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
};

const ThemeIcon: React.FC<{ theme: string }> = ({ theme }) => {
  if (theme === 'light') {
    return <Sun size={20} className="text-amber-500 animate-[spin_20s_linear_infinite]" id="theme-icon-light" />;
  }
  if (theme === 'dark') {
    return <Moon size={20} className="text-indigo-400" id="theme-icon-dark" />;
  }
  return <Eye size={20} className="text-red-500 animate-pulse" id="theme-icon-night-watch" />;
};
