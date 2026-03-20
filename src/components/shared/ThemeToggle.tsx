"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-7 h-7" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-3)] transition-colors"
    >
      {isDark ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  );
}
