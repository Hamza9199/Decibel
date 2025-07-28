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
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Album, Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './SviAlbumi.styles';

const SviAlbumi: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [korisnikID, setKorisnikID] = useState<string>('');

  const queryClient = useQueryClient();

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

  // Replace useMemo with useEffect for initial user data loading
  useEffect(() => {
    const initializeUser = async () => {
      const userId = await loadUserData();
      setKorisnikID(userId);
    };
    
    initializeUser();
  }, [loadUserData]);

  // Query for user albums
  const albumsQuery = useQuery({
    queryKey: ['userAlbums', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return [];
      
      const response = await axios.get(`${API_BASE}/albumi/`);
      // Filter albums by current user
      return (response.data || []).filter(
        (a: Album) => a.korisnikID === korisnikID
      );
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for songs data for album playback
  const songsQuery = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pjesme/`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for deleting albums
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
  }, [queryClient, korisnikID]);

  const handlePlayAlbum = useCallback(async (albumId: number) => {
    try {
      const pjesme = songsQuery.data || [];
      const albumSongs = pjesme.filter((p: Pjesma) => p.albumID === albumId && p.putanjaAudio);
      
      if (albumSongs.length === 0) {
        Alert.alert(t('info'), t('empty_album') || 'Album has no playable songs');
        return;
      }
      
      // Play first song from album
      const firstSong = albumSongs[0];
      if (firstSong?.putanjaAudio) {
        console.log('Playing album:', albumId, 'First song:', firstSong.naziv);
        // Add audio player integration here
      }
    } catch (error) {
      console.error('Error playing album:', error);
      Alert.alert(t('error'), t('error_playing_album') || 'Error playing album');
    }
  }, [songsQuery.data, t]);

  const handleEdit = useCallback((albumId: number) => {
    router.push(`/uredi-album/${albumId}`);
  }, [router]);

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
    router.push(`/album/${albumId}`);
  }, [router]);

  const handleNavigateToArtist = useCallback((artistId: string) => {
    router.push(`/izvodjac/${artistId}`);
  }, [router]);

  // Memoize filtered albums
  const filtriraniAlbumi = useMemo(() => {
    const albumi = albumsQuery.data || [];
    return albumi.filter((a: Album) =>
      a.naziv.toLowerCase().includes(search.toLowerCase())
    );
  }, [albumsQuery.data, search]);

  // Memoize refresh control
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('my_albums') || 'My Albums'}</Text>
          
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_albums') || 'Search albums...'}
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

          {filtriraniAlbumi.length === 0 ? (
            <Text style={styles.noAlbums}>
              {albumi.length === 0
                ? t('no_albums_user') || 'You have no albums'
                : t('no_results') || 'No results found'}
            </Text>
          ) : (
            <View style={styles.albumGrid}>
              {filtriraniAlbumi.map((album: Album) => (
                <View key={album.id} style={styles.card}>
                  <View style={styles.cardImageWrap}>
                    <Image
                      source={{ 
                        uri: album.putanjaSlika || 'https://via.placeholder.com/150' 
                      }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => handlePlayAlbum(album.id)}
                    >
                      <MaterialIcons name="play-arrow" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity onPress={() => handleNavigateToAlbum(album.id)}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {album.naziv}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => handleNavigateToArtist(album.korisnikID ?? '')} disabled={!album.korisnikID}>
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {album.korisnik?.korisnicko_ime || t('unknown_user')}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(album.id)}
                    >
                      <Text style={styles.buttonText}>{t('edit')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(album.id)}
                      disabled={deleteAlbumMutation.isPending}
                    >
                      <Text style={styles.buttonText}>
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

      <Tabs currentRoute="albums" />
    </View>
  );
});

SviAlbumi.displayName = "SviAlbumi";

export default SviAlbumi;
