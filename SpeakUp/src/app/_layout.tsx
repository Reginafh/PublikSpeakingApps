import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      
      {/* Replaced <AppTabs /> with a standard Stack Navigator */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="Homepage" />
      </Stack>
      
    </ThemeProvider>
  );
}