import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useNetworkStore } from '@/state/useNetworkStore';
import { Text } from './Text';
import { Icon } from './Icon';

/**
 * Present on every screen, but only visible when it has something to say.
 * The copy is deliberately reassuring rather than alarming: everything the
 * passenger needs at a barrier already works offline, and the banner's job is
 * to say so, not to make them panic.
 */
export function OfflineBanner() {
  const online = useNetworkStore((s) => s.online);
  const syncing = useNetworkStore((s) => s.syncing);
  const queued = useNetworkStore((s) => s.queued);
  const { palette, space } = useTheme();

  const visible = !online || syncing;
  const height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [visible, height]);

  const message = !online
    ? queued > 0
      ? `Offline. Your tickets and maps still work; ${queued} change${queued === 1 ? '' : 's'} will sync later.`
      : 'Offline. Your tickets and downloaded maps still work.'
    : 'Back online, syncing…';

  return (
    <Animated.View
      style={{
        overflow: 'hidden',
        maxHeight: height.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }),
        opacity: height,
        backgroundColor: online ? palette.infoSoft : palette.warningSoft,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space.xl,
          paddingVertical: space.sm + 2,
          gap: space.sm,
        }}
      >
        <Icon name={online ? 'info' : 'offline'} size={15} color={online ? palette.info : palette.warning} />
        <Text variant="caption" style={{ color: online ? palette.info : palette.warning, flex: 1 }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
