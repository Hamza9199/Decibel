import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, createContext, useContext, type ReactNode, type ReactElement, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter, useSegments, Stack } from 'expo-router';
import { AppState, InteractionManager, View, Text, TouchableOpacity } from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import '../i18n';
import { AudioProvider, useAudio } from '@/context/AudioContext';
//import AudioPlayer from '@/komponente/AudioPlayer/AudioPlayer';
import Sidebar from '@/komponente/Sidebar/Sidebar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import axios from 'axios';
import { API_BASE } from '@/config/api';
import AudioPlayerNew from '@/komponente/AudioPlayer/AudioPlayerNew';
import { ROUTE_MAPPING, clearNavigationHistory } from '@/hooks/handleBackPress';

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
  const pathname = usePathname();

  const isAuthScreen = segments.includes('login') || segments.includes('register');

  const onGestureEvent = (event: any) => {
    if (isAuthScreen) return;
    const { translationX, translationY } = event.nativeEvent;
    if (translationX > 10 && Math.abs(translationY) < 25) {
      setShowSidebar(true);
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (isAuthScreen) return;
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, translationY, velocityX } = event.nativeEvent;
      if (Math.abs(translationY) < 25 && (translationX > 25 || velocityX > 500)) {
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
    const currentPath = pathname.replace(/^\/+/, '');

    if (currentRoute.includes('[') && currentPath) {
      return currentPath;
    }

    return ROUTE_MAPPING[currentRoute] || currentPath || '(tabs)/home';
  };

  const currentSource = getCurrentSource();

  return (
    <SidebarContext.Provider value={{ showSidebar: showSidebarFn, hideSidebar: hideSidebarFn }}>
      <View style={{ flex: 1 }}>
        {children}
        {!isAuthScreen && (
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetX={[-10, 18]}
            failOffsetY={[-50, 50]}
            minPointers={1}
            maxPointers={1}
            shouldCancelWhenOutside={false}
            enabled={!isAuthScreen}
            hitSlop={{ left: 0, width: 24 }}
          >
            <View
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, zIndex: 9998, backgroundColor: 'transparent' }}
              pointerEvents="box-only"
            />
          </PanGestureHandler>
        )}
      </View>

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

  const [suspendInfo, setSuspendInfo] = useState<{ poruka: string; vrijemeDo: string } | null>(null);
  const [obrisan, setObrisan] = useState(false);
  const [provjera, setProvjera] = useState(true);
  const blocked = !provjera && (obrisan || !!suspendInfo);

  const handleLogout = useCallback(async () => {
    try { await AsyncStorage.removeItem('korisnik'); } catch { }
    setSuspendInfo(null);
    setObrisan(false);
    setProvjera(false);
    router.replace('/login');
  }, [router]);

  const handleReaktiviraj = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem('korisnik');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const korisnikID = user?.id;
      if (!korisnikID) return;
      const res = await axios.get(`${API_BASE}/korisnici/${korisnikID}`);
      const korisnik = res.data;
      await axios.put(`${API_BASE}/korisnici/${korisnikID}`, {
        ...korisnik,
        statusKorisnika: 'aktivan',
        obrisan: false,
      });
      setObrisan(false);
      setSuspendInfo(null);
      setProvjera(false);
    } catch { }
  }, []);

  const checkAccountFlags = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem('korisnik');
      if (!userStr) { setSuspendInfo(null); setObrisan(false); setProvjera(false); return; }
      const user = JSON.parse(userStr);
      const korisnikID = user?.id;
      if (!korisnikID) { setSuspendInfo(null); setObrisan(false); setProvjera(false); return; }
      const res = await axios.get(`${API_BASE}/korisnici/${korisnikID}`);
      const k = res.data;
      if (k?.obrisan === true || k?.statusKorisnika === 'neaktivan') {
        setObrisan(true);
        setSuspendInfo(null);
        setProvjera(false);
        return;
      }
      if (k?.statusKorisnika === 'suspendovan') {
        try {
          const r = await axios.get(`${API_BASE}/suspendovani/korisnik/${korisnikID}`);
          setSuspendInfo({ poruka: r.data?.poruka || 'Vaš nalog je suspendovan.', vrijemeDo: r.data?.vrijemeDo || '' });
        } catch {
          setSuspendInfo({ poruka: 'Vaš nalog je suspendovan.', vrijemeDo: '' });
        }
        setObrisan(false);
        setProvjera(false);
        return;
      }
      setObrisan(false);
      setSuspendInfo(null);
      setProvjera(false);
    } catch {
      setObrisan(false);
      setSuspendInfo(null);
      setProvjera(false);
    }
  }, []);

  useEffect(() => {
    checkAuthState();

    const subscription = AppState.addEventListener('change', () => {
      checkAuthState();
      if (isLoggedIn) checkAccountFlags();
    });

    return () => {
      subscription.remove();
    };
  }, [checkAccountFlags, isLoggedIn]);

  useEffect(() => {
    clearNavigationHistory();
  }, []);

  useEffect(() => {
    checkAuthState();
    if (isLoggedIn) checkAccountFlags();
  }, [checkAccountFlags, isLoggedIn, segments]);



  useEffect(() => {
    if (isLoggedIn === null) return;
    if (blocked) return;

    const currentRoute = segments.join('/');
    const inAuthGroup = currentRoute === 'login' || currentRoute === 'register';

    console.log('isLoggedIn:', isLoggedIn, 'segments:', segments, 'currentRoute:', currentRoute);

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, router, segments, blocked]);


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
            {blocked ? (
              <View style={{
                position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                backgroundColor: 'rgba(24,24,24,0.97)',
                alignItems: 'center', justifyContent: 'center',
                zIndex: 10000,
              }}>
                <View style={{ backgroundColor: '#232323', borderRadius: 18, padding: 24, width: '84%', maxWidth: 420, alignItems: 'center' }}>
                  <Text style={{ color: '#e754a2', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
                    {obrisan ? 'Vaš nalog je deaktiviran' : 'Vaš nalog je suspendovan'}
                  </Text>
                  {suspendInfo && !obrisan && (
                    <>
                      <Text style={{ color: '#fff', marginBottom: 8 }}>Razlog:</Text>
                      <View style={{ backgroundColor: '#181818', borderRadius: 6, padding: 10, marginBottom: 12, width: '100%' }}>
                        <Text style={{ color: '#ffe6ec' }}>{suspendInfo.poruka}</Text>
                      </View>
                      {!!suspendInfo.vrijemeDo && (
                        <Text style={{ color: '#fff', marginBottom: 16 }}>
                          Suspenzija traje do: <Text style={{ color: '#ffe6ec' }}>{new Date(suspendInfo.vrijemeDo).toLocaleString()}</Text>
                        </Text>
                      )}
                    </>
                  )}
                  {obrisan && (
                    <Text style={{ color: '#fff', marginBottom: 16, textAlign: 'center' }}>
                      Vaš nalog je postavljen kao neaktivan. Ne možete koristiti aplikaciju dok ga ne reaktivirate.
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    {obrisan && (
                      <TouchableOpacity onPress={handleReaktiviraj} style={{ backgroundColor: '#b91d95', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginRight: 10 }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Reaktiviraj nalog</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: obrisan ? '#444' : '#b91d95', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>Logout</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <>
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
              </>
            )}
          </View>
        </AudioProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function AudioPlayerWrapper() {
  const audio = useAudio();
  return (
    <AudioPlayerNew
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
