import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments, Stack } from 'expo-router';
import { AppState, InteractionManager } from 'react-native';
import '../i18n'; 
import { AudioProvider, useAudio } from '@/context/AudioContext';
import AudioPlayer from '@/komponente/AudioPlayer/AudioPlayer';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

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

    console.log('isLoggedIn:', isLoggedIn, 'segments:', segments, 'currentRoute:', currentRoute);

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, router, segments]);


  useEffect(() => {
    return () => {
      queryClient.getQueryCache().getAll().forEach(query => {
        if (!query.getObserversCount()) {
          queryClient.removeQueries({ queryKey: query.queryKey });
        }
      });
      
      queryClient.getMutationCache().clear();
      
      if (__DEV__ && typeof (global as any).gc === 'function') {
        setTimeout(() => ((global as any).gc as Function)(), 100);
      }
    };
  }, [segments]); 

  useEffect(() => {
  return () => {
    InteractionManager.runAfterInteractions(() => {
      queryClient.getQueryCache().getAll().forEach(query => {
        if (!query.getObserversCount()) {
          queryClient.removeQueries({ queryKey: query.queryKey });
        }
      });
    });
  };
}, []);

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
      <GestureHandlerRootView  style={{ flex: 1 } }>
        <QueryClientProvider client={queryClient}>
          <AudioProvider>
            <StatusBar style="dark" />
            <Stack
              key={isLoggedIn === false ? 'loggedOut' : 'loggedIn'}
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#181818' },
                freezeOnBlur: true,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
            </Stack>
            <AudioPlayerWrapper />
          </AudioProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
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

