import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma, KorisnikPjesma, Playlista as PlaylistaType } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Playlista.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';

const Playlista: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { playlistaId } = useLocalSearchParams<{ playlistaId: string }>();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<number | null>(null);
  const [korisnikID, setKorisnikID] = useState<string>('');
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/playlista/[playlistaId]', currentRoute: '/playlista/[playlistaId]' });

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

  const playlistQuery = useQuery({
    queryKey: ['playlist', playlistaId],
    queryFn: async () => {
      if (!playlistaId) throw new Error('No playlist ID');
      const response = await axios.get(`${API_BASE}/playliste/${playlistaId}`);
      return response.data;
    },
    enabled: !!playlistaId,
    staleTime: 10 * 60 * 1000, 
  });

  const songsQuery = useQuery({
    queryKey: ['playlistSongs', playlistaId],
    queryFn: async () => {
      if (!playlistaId) return [];
      
      const songsOrderRes = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistaId}`);
      const songIds: number[] = songsOrderRes.data || [];
      
      if (songIds.length === 0) return [];
      
      const songsPromises = songIds.map(id =>
        axios.get(`${API_BASE}/pjesme/${id}`)
          .then(r => r.data)
          .catch(() => null)
      );
      const songsData = await Promise.all(songsPromises);
      return songsData.filter(Boolean);
    },
    enabled: !!playlistaId,
    staleTime: 5 * 60 * 1000, 
  });

  const likedSongsQuery = useQuery({
    queryKey: ['likedSongs', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return {};
      
      const response = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const userLikedSongs = response.data as KorisnikPjesma[];
      const likeMap: { [pjesmaId: number]: boolean } = {};
      userLikedSongs
        .filter(v => v.korisnikID === korisnikID)
        .forEach(v => { likeMap[v.pjesmaID] = true; });
      return likeMap;
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000,
  });

  const playlistsQuery = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/playliste/`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, 
  });

  const playlistLikeQuery = useQuery({
    queryKey: ['playlistLike', playlistaId, korisnikID],
    queryFn: async () => {
      if (!korisnikID || !playlistaId) return false;
      
      const response = await axios.get(`${API_BASE}/korisnik_playlista/`);
      const userLikedPlaylists = response.data as { korisnikID: string; playlistaID: number }[];
      return !!userLikedPlaylists.find(v => 
        v.korisnikID === korisnikID && String(v.playlistaID) === String(playlistaId)
      );
    },
    enabled: !!(korisnikID && playlistaId),
    staleTime: 5 * 60 * 1000, 
  });

  const likeSongMutation = useMutation({
    mutationFn: async ({ pjesmaId, isLiked }: { pjesmaId: number; isLiked: boolean }) => {
      if (!korisnikID) throw new Error('No user ID');
      
      if (isLiked) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${pjesmaId}`);
        return { pjesmaId, liked: false };
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID,
          pjesmaID: pjesmaId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        return { pjesmaId, liked: true };
      }
    },
    onSuccess: ({ pjesmaId, liked }) => {
      queryClient.setQueryData(['likedSongs', korisnikID], (old: any) => ({
        ...old,
        [pjesmaId]: liked
      }));
      
    },
    onError: (error) => {
      console.error('Error liking/unliking song:', error);
      Alert.alert(t('error'), t('error_favorites'));
    }
  });

  const likePlaylistMutation = useMutation({
    mutationFn: async ({ isLiked }: { isLiked: boolean }) => {
      if (!korisnikID || !playlistaId) throw new Error('Missing data');
      
      if (isLiked) {
        await axios.delete(`${API_BASE}/korisnik_playlista/${korisnikID}/${playlistaId}`);
        return false;
      } else {
        await axios.post(`${API_BASE}/korisnik_playlista/`, {
          korisnikID,
          playlistaID: Number(playlistaId),
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        return true;
      }
    },
    onSuccess: (liked) => {
      queryClient.setQueryData(['playlistLike', playlistaId, korisnikID], liked);
      queryClient.setQueryData(['playlist', playlistaId], (old: any) => ({
        ...old,
        brojLajkova: (old?.brojLajkova || 0) + (liked ? 1 : -1)
      }));
      
    },
    onError: (error) => {
      console.error('Error liking/unliking playlist:', error);
      Alert.alert(t('error'), t('error_favorites'));
    }
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ pjesmaID, playlistaID }: { pjesmaID: number; playlistaID: number }) => {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID,
        playlistaID,
      });
    },
    onSuccess: () => {
      setShowPlaylistModal(null);
      Alert.alert(t('success'), t('song_added_to_playlist') || 'Song added to playlist!');
    },
    onError: (error) => {
      console.error('Error adding song to playlist:', error);
      setShowPlaylistModal(null);
      Alert.alert(t('error'), t('error_adding_to_playlist') || 'Error adding song to playlist');
    }
  });

  const removeSongMutation = useMutation({
    mutationFn: async (pjesmaId: number) => {
      if (!playlistaId) throw new Error('No playlist ID');
      await axios.delete(`${API_BASE}/pjesma_playlista/obrisi-iz-playliste/${pjesmaId}/${playlistaId}`);
      return pjesmaId;
    },
    onSuccess: (pjesmaId) => {
      queryClient.setQueryData(['playlistSongs', playlistaId], (old: any) => 
        old ? old.filter((p: any) => p.id !== pjesmaId) : []
      );
      Alert.alert(t('success'), t('song_removed_from_playlist') || 'Song removed from playlist');
    },
    onError: (error) => {
      console.error('Error removing song from playlist:', error);
      Alert.alert(t('error'), t('error_removing_song') || 'Error removing song from playlist');
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistaId] }),
      queryClient.invalidateQueries({ queryKey: ['playlistSongs', playlistaId] }),
      queryClient.invalidateQueries({ queryKey: ['likedSongs', korisnikID] }),
      queryClient.invalidateQueries({ queryKey: ['playlists'] }),
      queryClient.invalidateQueries({ queryKey: ['playlistLike', playlistaId, korisnikID] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [playlistaId, korisnikID]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    console.log('Playing song:', song.naziv);
  }, [t]);

  const handlePlayPlaylist = useCallback(() => {
    const pjesme = songsQuery.data || [];
    if (pjesme.length === 0) {
      Alert.alert(t('error'), t('empty_playlist') || 'Playlist is empty');
      return;
    }
    
    const firstSong = pjesme[0];
    if (firstSong?.putanjaAudio) {
      handlePlaySong(firstSong);
    }
  }, [songsQuery.data, handlePlaySong, t]);

  const handleLikeSong = useCallback((pjesmaId: number) => {
    const likeMap = likedSongsQuery.data || {};
    const isLiked = likeMap[pjesmaId] || false;
    likeSongMutation.mutate({ pjesmaId, isLiked });
  }, [likedSongsQuery.data, likeSongMutation]);

  const handleLikeThisPlaylist = useCallback(() => {
    const isLiked = playlistLikeQuery.data || false;
    likePlaylistMutation.mutate({ isLiked });
  }, [playlistLikeQuery.data, likePlaylistMutation]);

  const handleAddToPlaylist = useCallback((pjesmaID: number, playlistaID: number) => {
    addToPlaylistMutation.mutate({ pjesmaID, playlistaID });
  }, [addToPlaylistMutation]);

  const handleRemoveSong = useCallback((pjesmaId: number) => {
    Alert.alert(
      t('confirm_action'),
      t('remove_song_from_playlist_confirm') || 'Are you sure you want to remove this song from the playlist?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: () => removeSongMutation.mutate(pjesmaId)
        }
      ]
    );
  }, [removeSongMutation, t]);

  const handleModalClose = useCallback(() => {
    setShowPlaylistModal(null);
  }, []);

  const formatDuration = useCallback((seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const renderSongItem = useCallback(({ item, index }: { item: Pjesma; index: number }) => {
    const likeMap = likedSongsQuery.data || {};
    const isOwner = playlistQuery.data?.korisnikID === korisnikID;
    
    return (
      <View style={styles.songItem}>
        <View style={styles.songHeader}>
          <Text style={styles.songNumber}>{index + 1}</Text>
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {item.naziv}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {item.korisnik?.korisnicko_ime || t('unknown_artist')}
            </Text>
          </View>
          <Text style={styles.songDuration}>
            {formatDuration(item.trajanjeSekunde)}
          </Text>
        </View>
        
        <View style={styles.songActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlaySong(item)}
          >
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              likeMap[item.id] && styles.actionButtonLiked
            ]}
            onPress={() => handleLikeSong(item.id)}
          >
            <MaterialIcons 
              name={likeMap[item.id] ? 'favorite' : 'favorite-border'} 
              size={18} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowPlaylistModal(item.id)}
          >
            <MaterialIcons name="playlist-add" size={20} color="#fff" />
          </TouchableOpacity>
          
          {isOwner && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonRemove]}
              onPress={() => handleRemoveSong(item.id)}
            >
              <MaterialIcons name="delete" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [likedSongsQuery.data, playlistQuery.data, korisnikID, handlePlaySong, handleLikeSong, handleRemoveSong, formatDuration, t]);

  const playlistMeta = useMemo(() => {
    const pjesme = songsQuery.data || [];
    const likeCount = playlistQuery.data?.brojLajkova || 0;
    
    return [
      { label: t('number_of_songs'), value: pjesme.length },
      { label: t('number_of_likes'), value: likeCount },
      { label: t('public_playlist'), value: playlistQuery.data?.javno ? t('yes') : t('no') },
    ];
  }, [songsQuery.data, playlistQuery.data, t]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const filteredPlaylists = useMemo(() => {
    const playlists = playlistsQuery.data || [];
    return playlists.filter((pl: PlaylistaType) => String(pl.id) !== String(playlistaId));
  }, [playlistsQuery.data, playlistaId]);

  const loading = playlistQuery.isLoading || songsQuery.isLoading || likedSongsQuery.isLoading || playlistsQuery.isLoading || playlistLikeQuery.isLoading;
  const playlista = playlistQuery.data;
  const pjesme = songsQuery.data || [];
  const likePlaylist = playlistLikeQuery.data || false;
  const likeCount = playlista?.brojLajkova || 0;

    useScreenCleanup();
  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Back
          title={t('loading_playlist') || 'Loading Playlist...'}
          onBackPress={handleBackPress}
          onProfilePress={() => router.replace('/edit-profile')}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
        <Tabs currentRoute="playlista/[playlistaId" />
      </View>
    );
  }

  if (!playlista) {
    return (
      <View style={styles.notFoundContainer}>
        <Back
          title={t('playlist_not_found') || 'Playlist Not Found'}
          onBackPress={handleBackPress}
          onProfilePress={() => router.replace('/profile')}
          source={from}
        />
        <MaterialIcons name="queue-music" size={64} color="#666" />
        <Text style={styles.notFoundText}>
          {t('playlist_not_found') || 'Playlist not found'}
        </Text>
        <Tabs currentRoute="playlista/[playlistaId]" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Back
        title={playlista.naziv}
        onBackPress={handleBackPress}
        onProfilePress={() => router.replace('/edit-profile')}
        source={from}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <View style={styles.playlistMain}>
            <View style={styles.playlistImageWrap}>
              <Image
                source={{ uri: playlista.putanjaSlika || 'https://via.placeholder.com/300' }}
                style={styles.playlistImage}
                contentFit="cover"
              />
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={handlePlayPlaylist}
                >
                  <MaterialIcons name="play-arrow" size={32} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.likeButton, likePlaylist && styles.likeButtonLiked]}
                  onPress={handleLikeThisPlaylist}
                >
                  <MaterialIcons 
                    name={likePlaylist ? 'favorite' : 'favorite-border'} 
                    size={24} 
                    color="#fff" 
                  />
                  <Text style={styles.likeCount}>{likeCount}</Text>
                </TouchableOpacity>
                
               
              </View>
            </View>

            <View style={styles.playlistInfo}>
              <Text style={styles.playlistTitle}>{playlista.naziv}</Text>
              
              {playlista.opis && (
                <Text style={styles.playlistDescription}>{playlista.opis}</Text>
              )}

              <View style={styles.playlistMeta}>
                {playlistMeta.map((meta, index) => (
                  <View key={index} style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{meta.label}:</Text>
                    <Text style={styles.metaValue}>{meta.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {t('songs_in_playlist') || 'Songs in Playlist'}
          </Text>
          
          {pjesme.length === 0 ? (
            <Text style={styles.noSongs}>
              {t('no_songs_in_playlist') || 'No songs in this playlist'}
            </Text>
          ) : (
            <FlatList
              data={pjesme}
              renderItem={renderSongItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

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
              data={filteredPlaylists}
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

      <Tabs currentRoute="playlista/[playlistaId]" />
    </View>
  );
});

Playlista.displayName = "Playlista";

export default Playlista;
