export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
  };
  gradient?: string;
  icon?: string;
  startDate?: string; // MM-DD format
  endDate?: string; // MM-DD format
}

export const themes: Theme[] = [
  {
    id: "default",
    name: "Default",
    description: "Classic dark theme",
    colors: {
      primary: "#6ea8ff",
      primaryLight: "#8bbaff",
      primaryDark: "#5090e8",
      secondary: "#8b7dff",
      accent: "#6ea8ff",
      background: "#0a0e17",
      surface: "rgba(255, 255, 255, 0.03)",
      text: "#ffffff",
      textMuted: "#9aa3b5",
      success: "#3ddc97",
      warning: "#f5b942",
      error: "#f07167",
    },
  },
  {
    id: "christmas",
    name: "Christmas",
    description: "Festive holiday theme with red and green",
    startDate: "12-01",
    endDate: "12-26",
    icon: "🎄",
    colors: {
      primary: "#c41e3a",
      primaryLight: "#dc3545",
      primaryDark: "#a01628",
      secondary: "#165b33",
      accent: "#ffd700",
      background: "#0d1b0f",
      surface: "rgba(196, 30, 58, 0.05)",
      text: "#ffffff",
      textMuted: "#c8d3d5",
      success: "#28a745",
      warning: "#ffc107",
      error: "#dc3545",
    },
    gradient: "linear-gradient(135deg, #c41e3a 0%, #165b33 100%)",
  },
  {
    id: "halloween",
    name: "Halloween",
    description: "Spooky theme with orange and purple",
    startDate: "10-15",
    endDate: "11-01",
    icon: "🎃",
    colors: {
      primary: "#ff6600",
      primaryLight: "#ff8533",
      primaryDark: "#cc5200",
      secondary: "#7209b7",
      accent: "#ff9500",
      background: "#0a0514",
      surface: "rgba(255, 102, 0, 0.05)",
      text: "#ffffff",
      textMuted: "#b8a8c8",
      success: "#3ddc97",
      warning: "#ff9500",
      error: "#ff0054",
    },
    gradient: "linear-gradient(135deg, #ff6600 0%, #7209b7 100%)",
  },
  {
    id: "valentines",
    name: "Valentine's Day",
    description: "Romantic theme with pink and red",
    startDate: "02-10",
    endDate: "02-15",
    icon: "💝",
    colors: {
      primary: "#ff1493",
      primaryLight: "#ff69b4",
      primaryDark: "#db0074",
      secondary: "#ff6b9d",
      accent: "#ff1493",
      background: "#1a0a14",
      surface: "rgba(255, 20, 147, 0.05)",
      text: "#ffffff",
      textMuted: "#e8c4d8",
      success: "#ff69b4",
      warning: "#ffc0cb",
      error: "#dc143c",
    },
    gradient: "linear-gradient(135deg, #ff1493 0%, #ff6b9d 100%)",
  },
  {
    id: "newyear",
    name: "New Year",
    description: "Celebratory theme with gold and silver",
    startDate: "12-27",
    endDate: "01-05",
    icon: "🎉",
    colors: {
      primary: "#ffd700",
      primaryLight: "#ffe44d",
      primaryDark: "#ccac00",
      secondary: "#c0c0c0",
      accent: "#ffd700",
      background: "#0a0a12",
      surface: "rgba(255, 215, 0, 0.05)",
      text: "#ffffff",
      textMuted: "#d4d4d4",
      success: "#ffd700",
      warning: "#ffed4e",
      error: "#ff6b6b",
    },
    gradient: "linear-gradient(135deg, #ffd700 0%, #c0c0c0 100%)",
  },
  {
    id: "easter",
    name: "Easter",
    description: "Spring theme with pastel colors",
    startDate: "03-20",
    endDate: "04-30",
    icon: "🐰",
    colors: {
      primary: "#b19cd9",
      primaryLight: "#d4c5f9",
      primaryDark: "#9370db",
      secondary: "#ffb3ba",
      accent: "#bae1ff",
      background: "#0f0e14",
      surface: "rgba(177, 156, 217, 0.05)",
      text: "#ffffff",
      textMuted: "#d8d0e8",
      success: "#baffc9",
      warning: "#ffffba",
      error: "#ffb3ba",
    },
    gradient: "linear-gradient(135deg, #b19cd9 0%, #bae1ff 100%)",
  },
  {
    id: "summer",
    name: "Summer",
    description: "Bright theme with sunny colors",
    startDate: "06-01",
    endDate: "08-31",
    icon: "☀️",
    colors: {
      primary: "#ff9933",
      primaryLight: "#ffb366",
      primaryDark: "#e67300",
      secondary: "#00bfff",
      accent: "#ffcc00",
      background: "#0a0e14",
      surface: "rgba(255, 153, 51, 0.05)",
      text: "#ffffff",
      textMuted: "#e8d8c8",
      success: "#32cd32",
      warning: "#ffa500",
      error: "#ff4500",
    },
    gradient: "linear-gradient(135deg, #ff9933 0%, #00bfff 100%)",
  },
  {
    id: "thanksgiving",
    name: "Thanksgiving",
    description: "Autumn theme with warm colors",
    startDate: "11-15",
    endDate: "11-30",
    icon: "🦃",
    colors: {
      primary: "#d2691e",
      primaryLight: "#e89b5a",
      primaryDark: "#a0522d",
      secondary: "#8b4513",
      accent: "#ff8c00",
      background: "#0f0a06",
      surface: "rgba(210, 105, 30, 0.05)",
      text: "#ffffff",
      textMuted: "#d8c8b8",
      success: "#9acd32",
      warning: "#ffa500",
      error: "#cd5c5c",
    },
    gradient: "linear-gradient(135deg, #d2691e 0%, #8b4513 100%)",
  },
];

export function getActiveTheme(): Theme {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const currentDate = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Find theme that matches current date
  const activeTheme = themes.find((theme) => {
    if (!theme.startDate || !theme.endDate) return false;

    // Handle year-wrap case (e.g., Dec 27 to Jan 5)
    const [startMonth, startDay] = theme.startDate.split("-").map(Number);
    const [endMonth, endDay] = theme.endDate.split("-").map(Number);

    if (startMonth > endMonth) {
      // Year wrap case
      return (
        (month === startMonth && day >= startDay) ||
        month > startMonth ||
        (month === endMonth && day <= endDay) ||
        month < endMonth
      );
    } else {
      // Normal case
      return (
        (month === startMonth && day >= startDay && (month < endMonth || (month === endMonth && day <= endDay))) ||
        (month > startMonth && month < endMonth) ||
        (month === endMonth && day <= endDay)
      );
    }
  });

  return activeTheme || themes[0];
}

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) || themes[0];
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = `--color-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });

  if (theme.gradient) {
    root.style.setProperty("--gradient-primary", theme.gradient);
  }
}
