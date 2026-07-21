import React, { useRef } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useAgentStore } from '@/store/use-agent-store';

const fabIconImage = require('../../../assets/images/ai-agent-fab.png');

export function DraggableAgentButton() {
  const router = useRouter();
  const { isBubbleVisible, bubblePosition, setBubblePosition, quotaRemaining, currentTier } = useAgentStore();

  const pan = useRef(new Animated.ValueXY({ x: bubblePosition.x, y: bubblePosition.y })).current;
  const isDragging = useRef(false);

  const handlePress = () => {
    router.push('/agent-run' as any);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) {
          isDragging.current = true;
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_, gestureState);
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        setBubblePosition({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        if (!isDragging.current) {
          handlePress();
        }
      },
    })
  ).current;

  if (!isBubbleVisible) return null;

  const isUnlimited = currentTier === 'admin' || quotaRemaining >= 999;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress} style={styles.circularButton}>
        <Image source={fabIconImage} style={styles.fabIcon} resizeMode="contain" />
        <View style={[styles.badge, isUnlimited ? styles.badgeAdmin : styles.badgeNormal]}>
          <Text style={styles.badgeText}>{isUnlimited ? '∞' : quotaRemaining}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 9999,
    elevation: 10,
  },
  circularButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'visible',
  },
  fabIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeNormal: {
    backgroundColor: colors.primary,
  },
  badgeAdmin: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
});
