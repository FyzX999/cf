"use client";

import { AdminShell } from "@/components/AdminShell";
import { ThemeSelector } from "@/components/ThemeSelector";

export default function AdminThemePage() {
  return (
    <AdminShell title="Theme Settings">
      <div className="max-w-3xl">
        <ThemeSelector />

        <div className="glass mt-6 p-6">
          <h3 className="text-lg font-semibold">How Holiday Themes Work</h3>
          <div className="mt-4 space-y-3 text-sm text-[#c5cddc]">
            <p>
              The theme system automatically switches between holiday themes based on the current date.
              When "Auto (Holiday-based)" is selected, the site will display seasonal themes during
              their respective periods.
            </p>
            <p>
              <strong>Available Holiday Themes:</strong>
            </p>
            <ul className="list-inside list-disc space-y-2">
              <li>🎄 <strong>Christmas</strong> (Dec 1 - Dec 26): Festive red and green theme</li>
              <li>🎉 <strong>New Year</strong> (Dec 27 - Jan 5): Celebratory gold and silver theme</li>
              <li>💝 <strong>Valentine's Day</strong> (Feb 10 - Feb 15): Romantic pink and red theme</li>
              <li>🐰 <strong>Easter</strong> (Mar 20 - Apr 30): Spring pastel theme</li>
              <li>☀️ <strong>Summer</strong> (Jun 1 - Aug 31): Bright sunny theme</li>
              <li>🎃 <strong>Halloween</strong> (Oct 15 - Nov 1): Spooky orange and purple theme</li>
              <li>🦃 <strong>Thanksgiving</strong> (Nov 15 - Nov 30): Autumn warm colors theme</li>
            </ul>
            <p>
              Outside of these periods, the default dark theme is used. Users can also manually
              select any theme to override the automatic switching.
            </p>
          </div>
        </div>

        <div className="glass mt-6 p-6">
          <h3 className="text-lg font-semibold">Theme Customization</h3>
          <p className="muted mt-1 text-sm">
            Theme colors are applied using CSS variables throughout the application. Each theme
            includes primary, secondary, accent, success, warning, and error colors that maintain
            consistency across all pages.
          </p>
          <div className="mt-4">
            <p className="text-sm font-medium">Current Theme Variables:</p>
            <div className="mt-2 rounded-lg bg-black/20 p-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>--color-primary</div>
                <div>--color-secondary</div>
                <div>--color-accent</div>
                <div>--color-background</div>
                <div>--color-surface</div>
                <div>--color-text</div>
                <div>--color-text-muted</div>
                <div>--color-success</div>
                <div>--color-warning</div>
                <div>--color-error</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
