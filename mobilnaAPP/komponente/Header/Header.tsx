import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Korisnik } from '@/types';
import { API_BASE } from '@/config/api';
import Sidebar from '@/komponente/Sidebar/Sidebar';
import { styles } from './Header.styles';
import { router } from 'expo-router';

interface HeaderProps {
  onSearchPress?: () => void;
  onProfilePress?: () => void;
  onLogoPress?: () => void;
}

const Header: React.FC<HeaderProps> = React.memo(({ 
  onSearchPress, 
  onProfilePress, 
  onLogoPress 
}) => {
  const { ready } = useTranslation();
  const [showSidebar, setShowSidebar] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const userData = await AsyncStorage.getItem('korisnik');
        if (userData) {
          const user = JSON.parse(userData);
          setUserId(user?.id || null);
        }
      } catch (error) {
        console.error('Failed to load user ID:', error);
        setUserId(null);
      }
    };

    loadUserId();
  }, []);

  const { data: korisnik } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await axios.get(`${API_BASE}/korisnici/${userId}`);
      return response.data as Korisnik;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, 
    retry: 1,
  });

  const handleMenuPress = useCallback(() => {
    setShowSidebar(true);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setShowSidebar(false);
  }, []);

  const handleProfilePress = useCallback(() => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      router.replace('/edit-profile');
    }
  }, [onProfilePress]);

  const handleLogoPress = useCallback(() => {
    if (onLogoPress) {
      onLogoPress();
    } else {
      router.replace('/(tabs)');
    }
  }, [onLogoPress]);

  const profileImageUri = korisnik?.putanjaProfilneSlike || 
    'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.iconfinder.com%2Fdata%2Ficons%2Fflaticons-solid%2F16%2Fprofile-1-512.png&f=1&nofb=1&ipt=6b148c0994b76fe50e9a2fbb9e360cc3858b81f150251aca12a5ca51d932aca8';

  const onSwipeGestureEvent = useCallback((event: any) => {
    // Only detect swipe from left edge
    const { translationX, absoluteX } = event.nativeEvent;
    if (absoluteX < 50 && translationX > 50) {
      setShowSidebar(true);
    }
  }, []);

  const onSwipeHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, absoluteX } = event.nativeEvent;
      
      // Open sidebar if swiped right from left edge
      if (absoluteX < 50 && translationX > 100) {
        setShowSidebar(true);
      }
    }
  }, []);

  if (!ready) {
    return (
      <View style={styles.header}>
        <Text style={styles.logo}>Decibel</Text>
      </View>
    );
  }

  return (
    <>
      <PanGestureHandler
        onGestureEvent={onSwipeGestureEvent}
        onHandlerStateChange={onSwipeHandlerStateChange}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={handleMenuPress}
          >
            <MaterialIcons name="menu" size={24} color="#ffe6ec" />
          </TouchableOpacity>

          <TouchableOpacity  
            style={styles.logoContainer}
            onPress={handleLogoPress}
          >
            <Image
              source={require('../../assets/images/logo.gif')}
              style={styles.logoImg}
              contentFit="contain"
            />
            <Text style={styles.logo}>Decibel</Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            {onSearchPress && (
              <TouchableOpacity 
                style={styles.searchButton} 
                onPress={onSearchPress}
              >
                <MaterialIcons name="search" size={24} color="#ffe6ec" />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={handleProfilePress}
            >
              <Image
                source={{ uri: profileImageUri }}
                style={styles.profileImgMobile}
                contentFit="cover"
              />
            </TouchableOpacity>
          </View>
        </View>
      </PanGestureHandler>

      <Sidebar 
        visible={showSidebar} 
        onClose={handleSidebarClose} 
      />
    </>
  );
});

Header.displayName = "Header";

export default Header;
