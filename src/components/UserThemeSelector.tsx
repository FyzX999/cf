"use client";

import { useTheme } from "@/components/ThemeProvider";

export function UserThemeSelector() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="glass p-6">
      <h3 className="text-lg font-semibold">Appearance</h3>
      <p className="muted mt-1 text-sm">Customize your theme preference</p>

      <div className="mt-4">
        <label className="block text-sm font-medium">Theme</label>
        <select
          className="field mt-2"
          value={theme.id}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="auto">Auto (Holiday themes)</option>
          {availableThemes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon ? `${t.icon} ` : ""}{t.name}
            </option>
          ))}
        </select>
        <p className="muted mt-2 text-xs">
          {theme.id === "default" 
            ? "Using the default dark theme" 
            : theme.startDate 
            ? `Active ${theme.startDate} to ${theme.endDate}`
            : theme.description}
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        {[
          { color: theme.colors.primary, label: "Primary" },
          { color: theme.colors.secondary, label: "Secondary" },
          { color: theme.colors.accent, label: "Accent" },
          { color: theme.colors.success, label: "Success" },
        ].map((item) => (
          <div key={item.label} className="flex-1">
            <div
              className="h-12 rounded-lg"
              style={{ backgroundColor: item.color }}
            />
            <p className="muted mt-1 text-center text-xs">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
