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
import { Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './SvePlayliste.styles';

const SvePlayliste: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
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
      setPlayliste([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/playliste/`);
      
      // Filter playlists by current user
      const mojePlayliste = (response.data || []).filter(
        (pl: Playlista) => pl.korisnikID === currentUserId
      );
      setPlayliste(mojePlayliste);
    } catch (error) {
      console.error('Error loading playlists:', error);
      Alert.alert(t('error'), t('error_loading_data') || 'Error loading data');
      setPlayliste([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [korisnikID, t]);

  // Load user data and playlists when component mounts
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

  const handlePlayPlaylist = useCallback(async (playlistId: number) => {
    try {
      // Fetch playlist order from backend
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const songIds: number[] = res.data || [];
      
      if (songIds.length === 0) {
        Alert.alert(t('info'), t('empty_playlist') || 'Playlist is empty');
        return;
      }
      
      const songsPromises = songIds.map(id =>
        axios.get(`${API_BASE}/pjesme/${id}`)
          .then(r => r.data)
          .catch(() => null)
      );
      
      const playlistSongs = (await Promise.all(songsPromises)).filter(Boolean);
      
      if (playlistSongs.length === 0) {
        Alert.alert(t('info'), t('no_playable_songs') || 'No playable songs in playlist');
        return;
      }
      
      // Play first song from playlist
      const firstSong = playlistSongs[0];
      if (firstSong?.putanjaAudio) {
        console.log('Playing playlist:', playlistId, 'First song:', firstSong.naziv);
        // Add audio player integration here
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert(t('error'), t('error_playing_playlist') || 'Error playing playlist');
    }
  }, [t]);

  const handleEdit = useCallback((playlistId: number) => {
    router.push(`/uredi-playlistu/${playlistId}`);
  }, [router]);

  const handleDelete = useCallback((playlistId: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('confirm_delete_playlist') || 'Are you sure you want to delete this playlist?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/playliste/${playlistId}`);
              setPlayliste(prev => prev.filter(pl => pl.id !== playlistId));
              Alert.alert(t('success'), t('playlist_deleted') || 'Playlist deleted successfully');
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert(t('error'), t('error_deleting_playlist') || 'Error deleting playlist');
            }
          }
        }
      ]
    );
  }, [t]);

  const handleNavigateToPlaylist = useCallback((playlistId: number) => {
    router.push(`/playlista/${playlistId}`);
  }, [router]);

  const handleNavigateToUser = useCallback((userId: string) => {
    router.push(`/izvodjac/${userId}`);
  }, [router]);

  // Memoize filtered playlists
  const filtriranePlayliste = useMemo(() => 
    playliste.filter(pl =>
      pl.naziv.toLowerCase().includes(search.toLowerCase())
    ),
    [playliste, search]
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
          <Text style={styles.title}>{t('my_playlists') || 'My Playlists'}</Text>
          
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_playlists') || 'Search playlists...'}
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

          {filtriranePlayliste.length === 0 ? (
            <Text style={styles.noPlaylists}>
              {playliste.length === 0
                ? t('no_playlists_user') || 'You have no playlists'
                : t('no_results') || 'No results found'}
            </Text>
          ) : (
            <View style={styles.playlistGrid}>
              {filtriranePlayliste.map((playlist) => (
                <View key={playlist.id} style={styles.card}>
                  <View style={styles.cardImageWrap}>
                    <Image
                      source={{ 
                        uri: playlist.putanjaSlika || 'https://via.placeholder.com/150' 
                      }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => handlePlayPlaylist(playlist.id)}
                    >
                      <MaterialIcons name="play-arrow" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity onPress={() => handleNavigateToPlaylist(playlist.id)}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {playlist.naziv}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => handleNavigateToUser(playlist.korisnikID ?? '')} disabled={!playlist.korisnikID}>
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {playlist.korisnik?.korisnicko_ime || t('unknown_user')}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(playlist.id)}
                    >
                      <Text style={styles.buttonText}>{t('edit')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(playlist.id)}
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

      <Tabs currentRoute="playlists" />
    </View>
  );
});

SvePlayliste.displayName = "SvePlayliste";

export default SvePlayliste;
