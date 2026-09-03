import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useScreenCleanup({
    stateCleanup: () => {
      console.log('Cleaning up tabs layout');
    }
  });

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const userData = await AsyncStorage.getItem('korisnik');
        const user = userData ? JSON.parse(userData) : null;
        setIsLoggedIn(!!user?.id);
      } catch {
        setIsLoggedIn(false);
      }
    };

    checkAuthState();
  }, []);


  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: '#181818' }}>
      <Tabs
        screenOptions={{
          headerShown: false, 
          tabBarStyle: {
            backgroundColor: '#232323',
            borderTopColor: '#333333',
            borderTopWidth: 1,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 65,
            paddingBottom: 8,
            paddingTop: 5,
          },
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: '#888',
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          lazy: true,
          freezeOnBlur: true,
          
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('home'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: t('search'),
            href: isLoggedIn ? undefined : null,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="search" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="library"
          options={{
            title: t('library'),
            href: isLoggedIn ? undefined : null,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="library-music" size={size} color={color} />
            ),
          }}
        />

      </Tabs>
    </View>
  );
}