import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, createContext, useContext, type ReactNode, type ReactElement } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments, Stack } from 'expo-router';
import { AppState, InteractionManager, View } from 'react-native';
import { PanGestureHandler, State,GestureHandlerRootView } from 'react-native-gesture-handler';
import '../i18n'; 
import { AudioProvider, useAudio } from '@/context/AudioContext';
import AudioPlayer from '@/komponente/AudioPlayer/AudioPlayer';
import Sidebar from '@/komponente/Sidebar/Sidebar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';

interface SidebarContextType {
  showSidebar: () => void;
  hideSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useGlobalSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useGlobalSidebar must be used within SidebarProvider');
  }
  return context;
};

function GlobalSwipeHandler({ children }: { children: ReactNode }): ReactElement {
  const [showSidebar, setShowSidebar] = useState(false);
  const segments = useSegments();
  
  const isAuthScreen = segments.includes('login') || segments.includes('register');
  
  const onGestureEvent = (event: any) => {
    if (isAuthScreen) return;
    
    const { translationX, translationY, absoluteX } = event.nativeEvent;
    
    if (absoluteX <= 12 && Math.abs(translationY) < 8 && translationX > 140) {
      setShowSidebar(true);
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (isAuthScreen) return;
    
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, translationY, absoluteX, velocityX } = event.nativeEvent;
      
      if (absoluteX <= 12 && Math.abs(translationY) < 10 && (translationX > 160 || velocityX > 1200)) {
        setShowSidebar(true);
      }
    }
  };

  const handleSidebarClose = () => {
    setShowSidebar(false);
  };

  const showSidebarFn = () => {
    setShowSidebar(true);
  };

  const hideSidebarFn = () => {
    setShowSidebar(false);
  };

  const getCurrentSource = () => {
    const currentRoute = segments.join('/');
    
    const routeMapping: { [key: string]: string } = {
      '(tabs)': 'home',
      '(tabs)/library': 'library', 
      '(tabs)/search': 'search',
      'pjesma/[pjesmaId]': 'pjesme',
      'album/[albumId]': 'album', 
      'playlista/[playlistaId]': 'playlista',
      'izvodjac/[artistId]': 'izvodjac',
      'history': 'history',
      'statistika': 'statistika',
      'edit-profile': 'edit-profile',
      'settings': 'settings',
      'pretplata': 'pretplata',
      'admin-panel': 'admin-panel',
      'offline': 'offline',
      'svi-korisnici': 'svi-korisnici',
      'svi-albumi': 'svi-albumi',
      'sve-playliste': 'sve-playliste',
      'nova-pjesma': 'nova-pjesma',
      'novi-album': 'novi-album',
      'nova-playlista': 'nova-playlista',
      'nova-pretplata': 'nova-pretplata',
      'uredi-pjesmu': 'uredi-pjesmu',
      'uredi-album': 'uredi-album',
      'uredi-playlistu': 'uredi-playlistu',
      'omiljeno': 'omiljeno',
      'svepjesme': 'svepjesme',
      'login': 'login',
      'register': 'register'
    };
    
    return routeMapping[currentRoute] || 'home';
  };

  const currentSource = getCurrentSource();

  return (
    <SidebarContext.Provider value={{ showSidebar: showSidebarFn, hideSidebar: hideSidebarFn }}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[80, 9999]}
        failOffsetY={[-4, 4]}
        minPointers={1}
        maxPointers={1}
        shouldCancelWhenOutside={true}
        enabled={!isAuthScreen}
        simultaneousHandlers={[]}
        hitSlop={{ left: 0, width: 12 }}
      >
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </PanGestureHandler>
      
      {!isAuthScreen && (
        <View style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          elevation: 9999,
          pointerEvents: showSidebar ? 'auto' : 'none'
        }}>
          <Sidebar 
            visible={showSidebar} 
            onClose={handleSidebarClose}
            source={currentSource}
          />
        </View>
      )}
    </SidebarContext.Provider>
  );
}

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AudioProvider>
            <StatusBar style="dark" />
            <View style={{ flex: 1, position: 'relative' }}>
              <GlobalSwipeHandler>
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
              </GlobalSwipeHandler>
              <AudioPlayerWrapper />
            </View>
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

