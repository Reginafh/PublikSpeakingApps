import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/designSystem';

export const BottomNavBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isHome = pathname === '/Homepage';
  const isPractice = pathname === '/recording';
  const isSettings = pathname === '/settings';

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/Homepage')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isHome ? 'home' : 'home-outline'}
          size={22}
          color={isHome ? Colors.primary : Colors.onSurfaceVariant}
        />
        <Text
          style={[
            styles.label,
            { color: isHome ? Colors.primary : Colors.onSurfaceVariant, fontWeight: isHome ? '700' : '500' },
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/recording')}
        activeOpacity={0.8}
      >
        <View style={[styles.micIconWrapper, isPractice && styles.micActive]}>
          <Ionicons
            name="mic"
            size={22}
            color={isPractice ? '#FFFFFF' : Colors.primary}
          />
        </View>
        <Text
          style={[
            styles.label,
            { color: isPractice ? Colors.primary : Colors.onSurfaceVariant, fontWeight: isPractice ? '700' : '500' },
          ]}
        >
          Practice
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/settings')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isSettings ? 'settings' : 'settings-outline'}
          size={22}
          color={isSettings ? Colors.primary : Colors.onSurfaceVariant}
        />
        <Text
          style={[
            styles.label,
            { color: isSettings ? Colors.primary : Colors.onSurfaceVariant, fontWeight: isSettings ? '700' : '500' },
          ]}
        >
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    paddingTop: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  micIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micActive: {
    backgroundColor: Colors.primary,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
});
