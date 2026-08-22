"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeSelector() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="glass p-6">
      <h3 className="text-lg font-semibold">Theme Settings</h3>
      <p className="muted mt-1 text-sm">Choose a theme or enable auto-switching for holidays</p>

      <div className="mt-4">
        <label className="block text-sm font-medium">Current Theme</label>
        <select
          className="field mt-2"
          value={theme.id}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="auto">Auto (Holiday-based)</option>
          {availableThemes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon ? `${t.icon} ` : ""}{t.name}
            </option>
          ))}
        </select>
        <p className="muted mt-2 text-xs">{theme.description}</p>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium">Preview Colors</h4>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg p-3" style={{ backgroundColor: theme.colors.primary }}>
            <p className="text-xs font-medium text-white">Primary</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: theme.colors.secondary }}>
            <p className="text-xs font-medium text-white">Secondary</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: theme.colors.accent }}>
            <p className="text-xs font-medium text-white">Accent</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: theme.colors.success }}>
            <p className="text-xs font-medium text-white">Success</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: theme.colors.warning }}>
            <p className="text-xs font-medium text-white">Warning</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: theme.colors.error }}>
            <p className="text-xs font-medium text-white">Error</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium">Available Holiday Themes</h4>
        <div className="mt-3 space-y-2">
          {availableThemes
            .filter((t) => t.startDate && t.endDate)
            .map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                <div className="flex items-center gap-2">
                  {t.icon && <span className="text-xl">{t.icon}</span>}
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="muted text-xs">
                      {t.startDate} to {t.endDate}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTheme(t.id)}
                  className="btn btn-ghost btn-sm"
                >
                  Preview
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
