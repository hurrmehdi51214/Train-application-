import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Icon } from './Icon';
import { Touchable } from './Touchable';

/**
 * The bottom sheet.
 *
 * Three details make this feel like a real sheet rather than a modal that
 * happens to be at the bottom:
 *
 *   1. It is draggable, and the drag tracks the finger one-to-one downwards
 *      while resisting upwards - a sheet that follows your finger *up* past its
 *      stop feels broken.
 *   2. It dismisses on velocity as well as distance, so a quick flick closes it
 *      even if it has barely moved.
 *   3. The backdrop fades with the sheet's position, not on a separate timer,
 *      so a half-dragged sheet has a half-faded backdrop.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  /** Fraction of the screen the sheet may occupy. */
  maxHeight = 0.86,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeight?: number;
}) {
  const { palette, radius, space, spring, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const dragged = useRef(0);

  useEffect(() => {
    if (visible) {
      translateY.setValue(screenHeight);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...spring.sheet }).start();
    }
  }, [visible, screenHeight, translateY, spring.sheet]);

  const close = () => {
    Animated.timing(translateY, {
      toValue: screenHeight,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        // Downward drag tracks the finger; upward is heavily damped.
        dragged.current = gesture.dy > 0 ? gesture.dy : gesture.dy / 4;
        translateY.setValue(dragged.current);
      },
      onPanResponderRelease: (_, gesture) => {
        const flung = gesture.vy > 0.8;
        const far = dragged.current > 110;
        if (flung || far) close();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...spring.sheet }).start();
      },
    }),
  ).current;

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, screenHeight],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ ...StyleSheetAbsolute, opacity: backdropOpacity }}>
          <Pressable
            accessibilityLabel="Close"
            onPress={close}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
          />
        </Animated.View>

        <Animated.View
          {...pan.panHandlers}
          style={[
            {
              maxHeight: screenHeight * maxHeight,
              backgroundColor: palette.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              transform: [{ translateY }],
              paddingBottom: insets.bottom,
            },
            shadow.sheet,
          ]}
        >
          {/* Grabber. Small, centred, and the only affordance the sheet needs. */}
          <View style={{ alignItems: 'center', paddingTop: space.md, paddingBottom: space.sm }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border }} />
          </View>

          {title ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: space.base,
                paddingBottom: space.md,
                borderBottomWidth: 1,
                borderBottomColor: palette.border,
              }}
            >
              <Touchable
                onPress={close}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="close" size={18} />
              </Touchable>
              <Text variant="subheading" style={{ flex: 1, textAlign: 'center', marginRight: 34 }}>
                {title}
              </Text>
            </View>
          ) : null}

          <View style={{ paddingHorizontal: space.xl }}>{children}</View>

          {footer ? (
            <View
              style={{
                paddingHorizontal: space.xl,
                paddingTop: space.base,
                paddingBottom: space.sm,
                borderTopWidth: 1,
                borderTopColor: palette.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const StyleSheetAbsolute = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};
