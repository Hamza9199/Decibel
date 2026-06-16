import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Korisnik } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './Back.styles';
import { styles as lightStyles } from './BackWhite.styles';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useBackPress } from '@/hooks/handleBackPress';

interface BackProps {
  title: string;
  onBackPress?: () => void;
  onProfilePress?: () => void;
  source?: string;
}

const Back: React.FC<BackProps> = React.memo(({ 
  title,
  onBackPress, 
  onProfilePress,
  source
}) => {
  const { ready } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const { from } = useLocalSearchParams<{ from?: string }>();
  
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const styles = theme === 'light' ? lightStyles : darkStyles;

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('decibel_tema');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTheme(); }, [loadTheme]);
  useEffect(() => {
    const interval = setInterval(loadTheme, 3000);
    return () => clearInterval(interval);
  }, [loadTheme]);
  
  const getCurrentRoute = useCallback(() => {
    const titleToRouteMap: { [key: string]: string } = {
      'History': '/history',
      'Platform Statistics': '/statistika',
      'Statistics': '/statistika', 
      'Offline Mode': '/offline',
      'Settings': '/settings',
      'Edit Profile': '/edit-profile',
      'Admin Panel': '/admin-panel',
      'Subscription': '/pretplata',
      'All Users': '/svi-korisnici',
      'All Albums': '/svi-albumi',
      'All Playlists': '/sve-playliste',
      'New Song': '/nova-pjesma',
      'New Album': '/novi-album',
      'New Playlist': '/nova-playlista',
      'New Subscription': '/nova-pretplata',
      'Edit Song': '/uredi-pjesmu',
      'Edit Album': '/uredi-album',
      'Edit Playlist': '/uredi-playlistu',
      'Favorites': '/omiljeno',
      'All Songs': '/svepjesme'
    };
    
    const routeFromTitle = titleToRouteMap[title];
    if (routeFromTitle) {
      return routeFromTitle;
    }
    
    if (from === 'library') {
      return '/(tabs)/library';
    }
    if (from === 'search') {
      return '/(tabs)/search';
    }
    if (from === 'home') {
      return '/(tabs)';
    }
    
    const fromToRouteMap: { [key: string]: string } = {
      'home': '/(tabs)',
      'library': '/(tabs)/library',
      'search': '/(tabs)/search',
      'history': '/history',
      'statistika': '/statistika',
      'offline': '/offline',
      'settings': '/settings',
      'edit-profile': '/edit-profile',
      'admin-panel': '/admin-panel',
      'pretplata': '/pretplata'
    };
    
    return fromToRouteMap[from || ''] || '/(tabs)';
  }, [title, from]);
  
  const currentRoute = getCurrentRoute();
  const defaultBackPress = useBackPress({ from, defaultRoute: '/(tabs)', currentRoute });

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

  useFocusEffect(() => {
  const backAction = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
    return true; 
  };

  const backHandler = BackHandler.addEventListener(
    'hardwareBackPress',
    backAction
  );

  return () => backHandler.remove();
});


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

  const handleBackPress = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else {
      defaultBackPress();
    }
  }, [onBackPress, defaultBackPress]);

  const handleProfilePress = useCallback(() => {
    if (onProfilePress) {
      router.replace('/edit-profile?from=' + source);

    } else {
      router.replace('/edit-profile?from=' + source);
    }
  }, [onProfilePress, source]);

  const profileImageUri = korisnik?.putanjaProfilneSlike || 
    'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.iconfinder.com%2Fdata%2Ficons%2Fflaticons-solid%2F16%2Fprofile-1-512.png&f=1&nofb=1&ipt=6b148c0994b76fe50e9a2fbb9e360cc3858b81f150251aca12a5ca51d932aca8';

  if (!ready) {
    return (
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <MaterialIcons name="arrow-back" size={24} color="#ffe6ec" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.rightActions}>
          
          
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

      
    </>
  );
});

Back.displayName = "Back";

export default Back;
