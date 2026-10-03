// Luminous mode accents on the shared night surfaces.
export const STUDY_THEMES = {
  home: {
    accent: '#BAC9DD', deep: '#9FB3CD', soft: '#283342', wash: '#202937', border: '#4B5E74',
  },
  reading: {
    accent: '#AFC5FF', deep: '#86A7ED', soft: '#25324B', wash: '#1D2739', border: '#44587C',
  },
  writing: {
    accent: '#8DDFC3', deep: '#6AC9AE', soft: '#203B34', wash: '#1A2D29', border: '#426B5D',
  },
  book: {
    accent: '#F0BB9E', deep: '#E6A884', soft: '#3C2D29', wash: '#2D2423', border: '#76584B',
  },
};

export const MEETING_THEMES = {
  2: { accent: '#ADBEFF', soft: '#2B304A' },
  3: { accent: '#93D9C7', soft: '#203A34' },
  4: { accent: '#E6B78C', soft: '#3B2F25' },
  5: { accent: '#DBABD0', soft: '#392C3B' },
  6: { accent: '#A0CFE9', soft: '#253746' },
  7: { accent: '#D7C38D', soft: '#373326' },
};

export function themeStyle(mode) {
  const theme = STUDY_THEMES[mode] ?? STUDY_THEMES.home;
  return {
    '--accent': theme.accent,
    '--accent-deep': theme.deep,
    '--accent-text': theme.accent,
    '--accent-stroke': theme.deep,
    '--blue': theme.accent,
    '--accent-soft': theme.soft,
    '--accent-wash': theme.wash,
    '--accent-border': theme.border,
  };
}

export function meetingStyle(tm) {
  const theme = MEETING_THEMES[tm];
  return { '--tm-accent': theme.accent, '--tm-soft': theme.soft };
}
