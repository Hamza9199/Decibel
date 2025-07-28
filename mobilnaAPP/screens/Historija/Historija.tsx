import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Pjesma, HistorijaSlusanja, Playlista, KorisnikPjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Historija.styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Historija: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<number | null>(null);
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

  // Query for history data
  const historyQuery = useQuery({
    queryKey: ['history', korisnikID],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/historija/`);
      const allHistory: HistorijaSlusanja[] = response.data || [];
      
      return allHistory
        .filter((h) => h.korisnikID === korisnikID)
        .sort((a, b) => 
          new Date(b.kreiranDatumVrijeme || '').getTime() - 
          new Date(a.kreiranDatumVrijeme || '').getTime()
        );
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for songs data
  const songsQuery = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pjesme/`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for playlists data
  const playlistsQuery = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/playliste/`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for user's song likes
  const likesQuery = useQuery({
    queryKey: ['likes', korisnikID],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const likes = response.data as KorisnikPjesma[];
      const map: { [pjesmaId: number]: boolean } = {};
      likes.filter(v => v.korisnikID === korisnikID).forEach(v => {
        map[v.pjesmaID] = true;
      });
      return map;
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for liking/unliking songs
  const likeMutation = useMutation({
    mutationFn: async ({ songId, isLiked }: { songId: number; isLiked: boolean }) => {
      if (!korisnikID) throw new Error('No user ID');
      
      if (isLiked) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${songId}`);
        return { songId, liked: false };
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID,
          pjesmaID: songId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        return { songId, liked: true };
      }
    },
    onSuccess: ({ songId, liked }) => {
      queryClient.setQueryData(['likes', korisnikID], (old: any) => ({
        ...old,
        [songId]: liked
      }));
      Alert.alert(
        t('success'), 
        liked ? t('added_to_favorites') : t('removed_from_favorites')
      );
    },
    onError: (error) => {
      console.error('Error liking/unliking song:', error);
      Alert.alert(t('error'), t('error_favorites'));
    }
  });

  // Mutation for adding song to playlist
  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ songId, playlistId }: { songId: number; playlistId: number }) => {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID: songId,
        playlistaID: playlistId,
      });
      return { songId, playlistId };
    },
    onSuccess: () => {
      setShowPlaylistModal(null);
      Alert.alert(t('success'), t('song_added_to_playlist'));
    },
    onError: (error) => {
      console.error('Error adding song to playlist:', error);
      setShowPlaylistModal(null);
      Alert.alert(t('error'), t('error_adding_to_playlist'));
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['history', korisnikID] }),
      queryClient.invalidateQueries({ queryKey: ['songs'] }),
      queryClient.invalidateQueries({ queryKey: ['playlists'] }),
      queryClient.invalidateQueries({ queryKey: ['likes', korisnikID] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [queryClient, korisnikID]);

  const handleLikeSong = useCallback((songId: number) => {
    const isLiked = likesQuery.data?.[songId] || false;
    likeMutation.mutate({ songId, isLiked });
  }, [likesQuery.data, likeMutation]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file'));
      return;
    }
    
    // Play song logic here
    console.log('Playing song:', song.naziv);
  }, [t]);

  const handleAddToPlaylist = useCallback((songId: number, playlistId: number) => {
    addToPlaylistMutation.mutate({ songId, playlistId });
  }, [addToPlaylistMutation]);

  const handleModalClose = useCallback(() => {
    setShowPlaylistModal(null);
  }, []);

  const formatDate = useCallback((dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  // Memoize combined history with song data
  const historySongs = useMemo(() => {
    if (!historyQuery.data || !songsQuery.data) return [];
    
    return historyQuery.data
      .map((h) => ({
        ...h,
        song: songsQuery.data.find((s: Pjesma) => s.id === h.pjesmaID),
      }))
      .filter((h) => h.song && h.song.odobreno);
  }, [historyQuery.data, songsQuery.data]);

  const renderHistoryItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <View style={styles.songCard}>
      <View style={styles.songHeader}>
        <Image
          source={{ uri: item.song?.putanjaSlika || 'https://via.placeholder.com/50' }}
          style={styles.songImage}
        />
        
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {index + 1}. {item.song?.naziv}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.song?.korisnik?.korisnicko_ime || t('unknown_artist')}
          </Text>
          <Text style={styles.songDate}>
            {formatDate(item.kreiranDatumVrijeme)}
          </Text>
        </View>
      </View>
      
      <View style={styles.songActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlaySong(item.song)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            likesQuery.data?.[item.pjesmaID] && styles.actionButtonLiked
          ]}
          onPress={() => handleLikeSong(item.pjesmaID)}
        >
          <MaterialIcons 
            name={likesQuery.data?.[item.pjesmaID] ? "favorite" : "favorite-border"} 
            size={18} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPlaylistModal(item.pjesmaID)}
        >
          <MaterialIcons name="playlist-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [handlePlaySong, handleLikeSong, likesQuery.data, formatDate, t]);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = historyQuery.isLoading || songsQuery.isLoading || playlistsQuery.isLoading || likesQuery.isLoading;

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
          <Text style={styles.title}>{t('history')}</Text>
          
          {historySongs.length === 0 ? (
            <Text style={styles.noSongs}>
              {t('no_history') || 'No listening history'}
            </Text>
          ) : (
            <FlatList
              data={historySongs}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Add to Playlist Modal */}
      <Modal
        visible={showPlaylistModal !== null}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('add_to_playlist') || 'Add to Playlist'}
            </Text>
            <FlatList
              data={playlistsQuery.data || []}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playlistItem}
                  onPress={() => showPlaylistModal && handleAddToPlaylist(showPlaylistModal, item.id)}
                >
                  <Text style={styles.playlistItemText}>{item.naziv}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={handleModalClose}
            >
              <Text style={styles.modalCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Tabs currentRoute="history" />
    </View>
  );
});

Historija.displayName = "Historija";

export default Historija;


