import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useNetworkStore } from '@/state/useNetworkStore';
import { Text } from './Text';
import { Icon } from './Icon';

/**
 * Present on every screen, visible only when it has something to say.
 *
 * The copy is reassuring rather than alarming on purpose: everything a
 * passenger needs at a gate already works offline, and this banner's job is to
 * say so - not to make someone in a tunnel think their ticket has stopped
 * working.
 */
export function OfflineBanner() {
  const online = useNetworkStore((s) => s.online);
  const syncing = useNetworkStore((s) => s.syncing);
  const queued = useNetworkStore((s) => s.queued);
  const { palette, space } = useTheme();

  const visible = !online || syncing;
  const height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(height, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [visible, height]);

  const message = !online
    ? queued > 0
      ? `Offline. Tickets and maps still work; ${queued} change${queued === 1 ? '' : 's'} will sync later.`
      : 'Offline. Your tickets and downloaded maps still work.'
    : 'Back online, syncing…';

  return (
    <Animated.View
      style={{
        overflow: 'hidden',
        maxHeight: height.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }),
        opacity: height,
        backgroundColor: online ? palette.infoSoft : palette.warningSoft,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingHorizontal: 24,
          paddingVertical: space.md,
        }}
      >
        <Icon name={online ? 'info' : 'alert'} size={15} color={online ? palette.info : palette.warning} />
        <Text variant="caption" style={{ color: online ? palette.info : palette.warning, flex: 1 }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
