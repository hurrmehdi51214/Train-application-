import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import {
  darkPalette,
  duration,
  lightPalette,
  Palette,
  radius,
  shadow,
  space,
  spring,
  zIndex,
} from './tokens';
import { fontFamily, type as typeScale } from './typography';
import { useSettingsStore } from '@/state/useSettingsStore';

export interface Theme {
  palette: Palette;
  space: typeof space;
  radius: typeof radius;
  duration: typeof duration;
  spring: typeof spring;
  shadow: typeof shadow;
  zIndex: typeof zIndex;
  type: typeof typeScale;
  font: typeof fontFamily;
  isDark: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const preference = useSettingsStore((s) => s.appearance);

  const theme = useMemo<Theme>(() => {
    const mode = preference === 'system' ? (system ?? 'light') : preference;
    const isDark = mode === 'dark';
    return {
      palette: isDark ? darkPalette : lightPalette,
      space,
      radius,
      duration,
      spring,
      shadow,
      zIndex,
      type: typeScale,
      font: fontFamily,
      isDark,
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}
