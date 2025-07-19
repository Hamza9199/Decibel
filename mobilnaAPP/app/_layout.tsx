import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments, Stack } from 'expo-router';
import '../i18n'; 

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuthState();
  }, []);

  useEffect(() => {
    if (isLoggedIn === null) return; 

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';
    
    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/');
    }
  }, [isLoggedIn, router, segments]);

  const checkAuthState = async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setIsLoggedIn(!!user && !!user.id);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setIsLoggedIn(false);
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#232323" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#181818' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen 
          name="settings" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}

