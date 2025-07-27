import React, { useState, useCallback, useMemo } from 'react';
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
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Album, Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './SviAlbumi.styles';

const SviAlbumi: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [korisnikID, setKorisnikID] = useState<string>('');

  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setKorisnikID(user?.id || '');
        return user?.id || '';
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return '';
  }, []);

  const loadData = useCallback(async (userId?: string) => {
    const currentUserId = userId || korisnikID;
    if (!currentUserId) {
      setAlbumi([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load user's albums
      const albumsResponse = await axios.get(`${API_BASE}/albumi/`);
      const mojiAlbumi = (albumsResponse.data || []).filter(
        (a: Album) => a.korisnikID === currentUserId
      );
      setAlbumi(mojiAlbumi);

      // Load all songs for album playback
      const songsResponse = await axios.get(`${API_BASE}/pjesme/`);
      setPjesme(songsResponse.data || []);
    } catch (error) {
      console.error('Error loading albums:', error);
      Alert.alert(t('error'), t('error_loading_data') || 'Error loading data');
      setAlbumi([]);
      setPjesme([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [korisnikID, t]);

  // Load user data and albums when component mounts
  useMemo(() => {
    loadUserData().then(userId => {
      if (userId) {
        loadData(userId);
      }
    });
  }, [loadUserData, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handlePlayAlbum = useCallback(async (albumId: number) => {
    try {
      const albumSongs = pjesme.filter(p => p.albumID === albumId && p.putanjaAudio);
      
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
  }, [pjesme, t]);

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
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/albumi/${albumId}`);
              setAlbumi(prev => prev.filter(a => a.id !== albumId));
              Alert.alert(t('success'), t('album_deleted') || 'Album deleted successfully');
            } catch (error) {
              console.error('Error deleting album:', error);
              Alert.alert(t('error'), t('error_deleting_album') || 'Error deleting album');
            }
          }
        }
      ]
    );
  }, [t]);

  const handleNavigateToAlbum = useCallback((albumId: number) => {
    router.push(`/album/${albumId}`);
  }, [router]);

  const handleNavigateToArtist = useCallback((artistId: string) => {
    router.push(`/izvodjac/${artistId}`);
  }, [router]);

  // Memoize filtered albums
  const filtriraniAlbumi = useMemo(() => 
    albumi.filter(a =>
      a.naziv.toLowerCase().includes(search.toLowerCase())
    ),
    [albumi, search]
  );

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

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
              {filtriraniAlbumi.map((album) => (
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
                    >
                      <Text style={styles.buttonText}>{t('delete')}</Text>
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
