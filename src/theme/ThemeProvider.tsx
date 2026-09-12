import React, { createContext, useContext, useMemo } from 'react';
import { Platform, useColorScheme, ViewStyle } from 'react-native';

import { darkPalette, lightPalette, Palette, radius, space, duration } from './tokens';
import { type as typeScale, fonts } from './typography';
import { useSettingsStore } from '@/state/useSettingsStore';

export interface Elevation {
  card: ViewStyle;
  sheet: ViewStyle;
  floating: ViewStyle;
}

/**
 * Shadows are defined once, per mode. In dark mode a drop shadow reads as mud,
 * so elevation there is carried by a hairline and a lighter surface instead.
 */
function elevationFor(palette: Palette): Elevation {
  if (palette.mode === 'dark') {
    const hairline: ViewStyle = {
      borderWidth: Platform.OS === 'web' ? 1 : StyleSheetHairline,
      borderColor: palette.hairline,
    };
    return { card: hairline, sheet: hairline, floating: hairline };
  }
  return {
    card: {
      shadowColor: '#0B1A22',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    sheet: {
      shadowColor: '#0B1A22',
      shadowOpacity: 0.12,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: -8 },
      elevation: 12,
    },
    floating: {
      shadowColor: '#0B1A22',
      shadowOpacity: 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  };
}

const StyleSheetHairline = Platform.OS === 'android' ? 1 : 0.5;

export interface Theme {
  palette: Palette;
  space: typeof space;
  radius: typeof radius;
  duration: typeof duration;
  type: typeof typeScale;
  fonts: typeof fonts;
  elevation: Elevation;
  hairlineWidth: number;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const preference = useSettingsStore((s) => s.appearance);

  const theme = useMemo<Theme>(() => {
    const mode = preference === 'system' ? (system ?? 'light') : preference;
    const palette = mode === 'dark' ? darkPalette : lightPalette;
    return {
      palette,
      space,
      radius,
      duration,
      type: typeScale,
      fonts,
      elevation: elevationFor(palette),
      hairlineWidth: StyleSheetHairline,
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

/**
 * Style factories receive the theme and are memoised per mode. Keeps StyleSheet
 * creation out of render bodies without forcing every component to thread the
 * theme through by hand.
 */
export function useStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
