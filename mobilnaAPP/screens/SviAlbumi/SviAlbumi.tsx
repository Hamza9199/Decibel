import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
import { Album, Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './SviAlbumi.styles';
import { styles as lightStyles } from './SviAlbumiWhite.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';

const SviAlbumi: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [korisnikID, setKorisnikID] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;

  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/svi-albumi', currentRoute: '/svi-albumi' });

  useScreenCleanup();

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


  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        return user?.id || '';
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return '';
  }, []);

  useEffect(() => {
    const initializeUser = async () => {
      const userId = await loadUserData();
      setKorisnikID(userId);
    };
    
    initializeUser();
  }, [loadUserData]);

  const albumsQuery = useQuery({
    queryKey: ['userAlbums', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return [];
      
      const response = await axios.get(`${API_BASE}/albumi/`);
      return (response.data || []).filter(
        (a: Album) => a.korisnikID === korisnikID
      );
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, 
  });

  const songsQuery = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pjesme/`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, 
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: async (albumId: number) => {
      await axios.delete(`${API_BASE}/albumi/${albumId}`);
      return albumId;
    },
    onSuccess: (albumId) => {
      queryClient.setQueryData(['userAlbums', korisnikID], (old: any) => 
        old ? old.filter((a: Album) => a.id !== albumId) : []
      );
      Alert.alert(t('success'), t('album_deleted') || 'Album deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting album:', error);
      Alert.alert(t('error'), t('error_deleting_album') || 'Error deleting album');
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['userAlbums', korisnikID] }),
      queryClient.invalidateQueries({ queryKey: ['songs'] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [korisnikID]);

  const handlePlayAlbum = useCallback(async (albumId: number) => {
    try {
      const pjesme = songsQuery.data || [];
      const albumSongs = pjesme.filter((p: Pjesma) => p.albumID === albumId && p.putanjaAudio);
      
      if (albumSongs.length === 0) {
        Alert.alert(t('info'), t('empty_album') || 'Album has no playable songs');
        return;
      }
      
      const firstSong = albumSongs[0];
      if (firstSong?.putanjaAudio) {
        console.log('Playing album:', albumId, 'First song:', firstSong.naziv);
      }
    } catch (error) {
      console.error('Error playing album:', error);
      Alert.alert(t('error'), t('error_playing_album') || 'Error playing album');
    }
  }, [songsQuery.data, t]);

  const handleEdit = useCallback((albumId: number) => {
    navigateWithHistory(`/uredi-album/${albumId}?from=svi-albumi`, '/svi-albumi');
  }, []);

  const handleDelete = useCallback((albumId: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('confirm_delete_album') || 'Are you sure you want to delete this album?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: () => deleteAlbumMutation.mutate(albumId)
        }
      ]
    );
  }, [deleteAlbumMutation, t]);

  const handleNavigateToAlbum = useCallback((albumId: number) => {
    navigateWithHistory(`/album/${albumId}?from=svi-albumi`, '/svi-albumi');
  }, []);

  const handleNavigateToArtist = useCallback((artistId: string) => {
    navigateWithHistory(`/izvodjac/${artistId}?from=svi-albumi`, '/svi-albumi');
  }, []);

  const filtriraniAlbumi = useMemo(() => {
    const albumi = albumsQuery.data || [];
    return albumi.filter((a: Album) =>
      a.naziv.toLowerCase().includes(search.toLowerCase())
    );
  }, [albumsQuery.data, search]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = albumsQuery.isLoading || songsQuery.isLoading;
  const albumi = albumsQuery.data || [];

  if (loading) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Back
          title={t('loading_albums') || 'Loading Albums...'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile?from=svi-albumi', '/svi-albumi')}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={activeStyles.loadingText}>{t('loading')}</Text>
        <Tabs currentRoute="svi-albumi" />
      </View>
    );
  }

  return (
    <View style={activeStyles.container}>
      <Back
        title={t('my_albums') || 'My Albums'}
        onBackPress={handleBackPress}
        onProfilePress={() => navigateWithHistory('/edit-profile?from=svi-albumi', '/svi-albumi')}
        source={from}
        />
      <ScrollView
        contentContainerStyle={activeStyles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={activeStyles.content}>
          <Text style={activeStyles.title}>{t('my_albums') || 'My Albums'}</Text>
          
          <TextInput
            style={activeStyles.searchInput}
            placeholder={t('search_albums') || 'Search albums...'}
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

          {filtriraniAlbumi.length === 0 ? (
            <Text style={activeStyles.noAlbums}>
              {albumi.length === 0
                ? t('no_albums_user') || 'You have no albums'
                : t('no_results') || 'No results found'}
            </Text>
          ) : (
            <View style={activeStyles.albumGrid}>
              {filtriraniAlbumi.map((album: Album) => (
                <View key={album.id} style={activeStyles.card}>
                  <View style={activeStyles.cardImageWrap}>
                    <Image
                      source={{ 
                        uri: album.putanjaSlika || 'https://via.placeholder.com/150' 
                      }}
                      style={activeStyles.cardImage}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={activeStyles.playButton}
                      onPress={() => handlePlayAlbum(album.id)}
                    >
                      <MaterialIcons name="play-arrow" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity onPress={() => handleNavigateToAlbum(album.id)}>
                    <Text style={activeStyles.cardTitle} numberOfLines={2}>
                      {album.naziv}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => handleNavigateToArtist(album.korisnikID ?? '')} disabled={!album.korisnikID}>
                    <Text style={activeStyles.cardDesc} numberOfLines={1}>
                      {album.korisnik?.korisnicko_ime || t('unknown_user')}
                    </Text>
                  </TouchableOpacity>

                  <View style={activeStyles.cardActions}>
                    <TouchableOpacity
                      style={activeStyles.editButton}
                      onPress={() => handleEdit(album.id)}
                    >
                      <Text style={activeStyles.buttonText}>{t('edit')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={activeStyles.deleteButton}
                      onPress={() => handleDelete(album.id)}
                      disabled={deleteAlbumMutation.isPending}
                    >
                      <Text style={activeStyles.buttonText}>
                        {deleteAlbumMutation.isPending ? t('deleting') : t('delete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Tabs currentRoute="svi-albumi" />
    </View>
  );
});

SviAlbumi.displayName = "SviAlbumi";

export default SviAlbumi;