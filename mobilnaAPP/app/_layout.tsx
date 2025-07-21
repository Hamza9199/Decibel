import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments, Stack } from 'expo-router';
import { AppState } from 'react-native';
import '../i18n'; 
import { AudioProvider, useAudio } from '@/context/AudioContext';
import AudioPlayer from '@/komponente/AudioPlayer/AudioPlayer';

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Pozivaj checkAuthState na mount, promjenu rute i promjenu fokusa aplikacije
  useEffect(() => {
    checkAuthState();

    const subscription = AppState.addEventListener('change', () => {
      checkAuthState();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    checkAuthState();
  }, [segments]);

  useEffect(() => {
    if (isLoggedIn === null) return; 

    const currentRoute = segments.join('/');
    const inAuthGroup = currentRoute === 'login' || currentRoute === 'register';

    // Debug info
    console.log('isLoggedIn:', isLoggedIn, 'segments:', segments, 'currentRoute:', currentRoute);

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)');
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
      <AudioProvider>
        <StatusBar style="light" backgroundColor="#181818" />
        <AudioPlayerWrapper />
        <Stack
          key={isLoggedIn === false ? 'loggedOut' : 'loggedIn'}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#181818' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
        </Stack>
      </AudioProvider>
    </SafeAreaProvider>
  );
}

function AudioPlayerWrapper() {
  const audio = useAudio();
  return (
    <AudioPlayer
      id={audio.audioState.id}
      src={audio.audioState.src}
      title={audio.audioState.title}
      putanjaGif={audio.audioState.putanjaGif}
      putanjaSlika={audio.audioState.putanjaSlika}
      korisnikID={audio.audioState.korisnikID}
      visible={audio.audioState.visible}
      minimized={audio.audioState.minimized}
      onClose={audio.closeAudio}
      onExpand={audio.expandAudio}
    />
  );
}

