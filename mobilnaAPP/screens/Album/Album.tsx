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
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Album, Pjesma, Playlista, KorisnikPjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Album.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';


const AlbumScreen: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { albumId } = useLocalSearchParams();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Pjesma | null>(null);
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/album' });

  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, 
  });

  const { data: album, isLoading: albumLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      if (!albumId) return null;
      const albumRes = await axios.get(`${API_BASE}/albumi/${albumId}`);
      return albumRes.data;
    },
    enabled: !!albumId,
    staleTime: 5 * 60 * 1000, 
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['album-songs', albumId],
    queryFn: async () => {
      if (!albumId) return [];
      const songsRes = await axios.get(`${API_BASE}/pjesme/`);
      const albumSongs = (songsRes.data || []).filter(
        (p: Pjesma) => String(p.albumID) === String(albumId)
      );
      return albumSongs;
    },
    enabled: !!albumId,
    staleTime: 2 * 60 * 1000, 
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ['playlists', userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      const playlistsRes = await axios.get(`${API_BASE}/playliste/`);
      return playlistsRes.data || [];
    },
    enabled: !!userData?.id,
    staleTime: 2 * 60 * 1000, 
  });

  const { data: albumLiked = false } = useQuery({
    queryKey: ['album-like', albumId, userData?.id],
    queryFn: async () => {
      if (!albumId || !userData?.id) return false;
      const albumLikesRes = await axios.get(`${API_BASE}/korisnik_album/`);
      const albumLikes = albumLikesRes.data as { korisnikID: string; albumID: number }[];
      return !!albumLikes.find(v => v.korisnikID === userData.id && String(v.albumID) === String(albumId));
    },
    enabled: !!albumId && !!userData?.id,
    staleTime: 30 * 1000, 
  });

  const { data: songLikes = {} } = useQuery({
    queryKey: ['song-likes', userData?.id],
    queryFn: async () => {
      if (!userData?.id) return {};
      const songLikesRes = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const songLikes = songLikesRes.data as KorisnikPjesma[];
      const map: { [pjesmaId: number]: boolean } = {};
      songLikes.filter(v => v.korisnikID === userData.id).forEach(v => {
        map[v.pjesmaID] = true;
      });
      return map;
    },
    enabled: !!userData?.id,
    staleTime: 30 * 1000, 
  });

  const albumLikeMutation = useMutation({
    mutationFn: async ({ action, albumId, userId }: { action: 'like' | 'unlike', albumId: string, userId: string }) => {
      if (action === 'like') {
        return axios.post(`${API_BASE}/korisnik_album/`, {
          korisnikID: userId,
          albumID: albumId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
      } else {
        return axios.delete(`${API_BASE}/korisnik_album/${userId}/${albumId}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['album-like', variables.albumId, variables.userId] });
      Alert.alert(
        t('success'),
        variables.action === 'like' ? t('added_to_favorites') : t('removed_from_favorites')
      );
    },
    onError: () => {
      Alert.alert(t('error'), t('error_liking_album') || 'Error updating favorites');
    },
  });

  const songLikeMutation = useMutation({
    mutationFn: async ({ action, songId, userId }: { action: 'like' | 'unlike', songId: number, userId: string }) => {
      if (action === 'like') {
        return axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID: userId,
          pjesmaID: songId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
      } else {
        return axios.delete(`${API_BASE}/korisnik_pjesma/${userId}/${songId}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['song-likes', variables.userId] });
      Alert.alert(
        t('success'),
        variables.action === 'like' ? t('added_to_favorites') : t('removed_from_favorites')
      );
    },
    onError: () => {
      Alert.alert(t('error'), t('error_liking_song') || 'Error updating favorites');
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ songId, playlistId }: { songId: number, playlistId: number }) => {
      return axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID: songId,
        playlistaID: playlistId,
      });
    },
    onSuccess: () => {
      setShowPlaylistModal(false);
      setSelectedSong(null);
      Alert.alert(t('success'), t('song_added_to_playlist') || 'Song added to playlist!');
    },
    onError: (error: any) => {
      console.error('Error adding song to playlist:', error);
      const errorMsg = error.response?.data?.detail || t('error_adding_to_playlist') || 'Error adding song to playlist';
      Alert.alert(t('error'), errorMsg);
      setShowPlaylistModal(false);
      setSelectedSong(null);
    },
  });

  const loading = albumLoading;
  const refreshing = albumLikeMutation.isPending || songLikeMutation.isPending || addToPlaylistMutation.isPending;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    queryClient.invalidateQueries({ queryKey: ['album-songs', albumId] });
    queryClient.invalidateQueries({ queryKey: ['album-like', albumId, userData?.id] });
    queryClient.invalidateQueries({ queryKey: ['song-likes', userData?.id] });
  }, [albumId, userData?.id]);

  useEffect(() => {
    if (userData?.id && albumId) {
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      queryClient.invalidateQueries({ queryKey: ['album-songs', albumId] });
      queryClient.invalidateQueries({ queryKey: ['album-like', albumId, userData.id] });
      queryClient.invalidateQueries({ queryKey: ['song-likes', userData.id] });
    }
  }, [userData, albumId]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    console.log('Playing song:', song.naziv);
  }, [t]);

  const handlePlayAlbum = useCallback(() => {
    if (songs.length === 0) {
      Alert.alert(t('error'), t('no_songs_in_album') || 'No songs in this album');
      return;
    }
    
    const firstSong = songs[0];
    if (firstSong?.putanjaAudio) {
      handlePlaySong(firstSong);
    }
  }, [songs, handlePlaySong, t]);

  const handleLikeAlbum = useCallback(async () => {
    if (!album || !userData?.id) return;
    
    const action = albumLiked ? 'unlike' : 'like';
    albumLikeMutation.mutate({ action, albumId: String(album.id), userId: userData.id });
  }, [album, userData, albumLiked, albumLikeMutation]);

  const handleLikeSong = useCallback(async (songId: number) => {
    if (!userData?.id) return;
    
    const action = songLikes[songId] ? 'unlike' : 'like';
    songLikeMutation.mutate({ action, songId, userId: userData.id });
  }, [userData, songLikes, songLikeMutation]);

  const handleAddToPlaylist = useCallback((song: Pjesma) => {
    setSelectedSong(song);
    setShowPlaylistModal(true);
  }, []);

  const handleSelectPlaylist = useCallback(async (playlistId: number) => {
    if (!selectedSong) return;
    
    addToPlaylistMutation.mutate({ songId: selectedSong.id, playlistId });
  }, [selectedSong, addToPlaylistMutation]);


  const handleModalClose = useCallback(() => {
    setShowPlaylistModal(false);
  }, []);

  const formatDuration = useCallback((seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const renderSongItem = useCallback(({ item, index }: { item: Pjesma; index: number }) => (
    <View style={styles.songCard}>
      <View style={styles.songHeader}>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {index + 1}. {item.naziv}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.korisnik?.korisnicko_ime || t('unknown_artist')}
          </Text>
          <Text style={styles.songDuration}>
            {formatDuration(item.trajanjeSekunde)}
          </Text>
        </View>
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
            songLikes[item.id] && styles.actionButtonLiked
          ]}
          onPress={() => handleLikeSong(item.id)}
        >
          <MaterialIcons 
            name={songLikes[item.id] ? "favorite" : "favorite-border"} 
            size={18} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleAddToPlaylist(item)}
        >
          <MaterialIcons name="playlist-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [handlePlaySong, handleLikeSong, handleAddToPlaylist, songLikes, formatDuration, t]);

  const albumMeta = useMemo(() => [
    { label: t('songs'), value: songs.length },
    { label: t('likes'), value: album?.brojLajkova || 0 },
  ], [songs.length, album?.brojLajkova, t]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

    useScreenCleanup();
  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  if (!album) {
    return (
      <View style={styles.notFoundContainer}>
         <Back 
        title={t('album_not_found') || 'Album Not Found'}
        onBackPress={handleBackPress} 
        onProfilePress={() => router.push('/profile')} 
      />
        <MaterialIcons name="album" size={64} color="#666" />
        <Text style={styles.notFoundText}>
          {t('album_not_found') || 'Album not found'}
        </Text>
        <Tabs currentRoute="album" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
       <Back 
        title={album.naziv}
        onBackPress={handleBackPress} 
        onProfilePress={() => router.push('/profile')} 
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <View style={styles.albumMain}>
            <View style={styles.albumImageWrap}>
              <Image
                source={{ uri: album?.putanjaSlika || 'https://via.placeholder.com/300' }}
                style={styles.albumImage}
                contentFit="cover"
              />
              <View style={styles.controlsRow}>
                <TouchableOpacity 
                  style={styles.playButton} 
                  onPress={handlePlayAlbum}
                >
                  <MaterialIcons name="play-arrow" size={28} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.likeButton, albumLiked && styles.likeButtonLiked]} 
                  onPress={handleLikeAlbum}
                >
                  <MaterialIcons 
                    name={albumLiked ? "favorite" : "favorite-border"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.likeCount}>{album?.brojLajkova || 0}</Text>
                </TouchableOpacity>
                
                
              </View>
            </View>
            
            <View style={styles.albumInfo}>
              <Text style={styles.albumTitle} numberOfLines={2}>
                {album?.naziv}
              </Text>
              {album?.opis && (
                <Text style={styles.albumDescription} numberOfLines={3}>
                  {album.opis}
                </Text>
              )}
              <View style={styles.albumMeta}>
                {albumMeta.map((meta, index) => (
                  <Text key={index} style={styles.metaItem}>
                    {meta.label}: {meta.value}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.songsSection}>
            <Text style={styles.sectionTitle}>
              {t('songs_on_album') || 'Songs on Album'}
            </Text>
            
            {songs.length === 0 ? (
              <Text style={styles.noSongs}>
                {t('no_songs_on_album') || 'No songs on this album'}
              </Text>
            ) : (
              <FlatList
                data={songs}
                renderItem={renderSongItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showPlaylistModal}
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
              data={playlists}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playlistItem}
                  onPress={() => handleSelectPlaylist(item.id)}
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

      <Tabs currentRoute="album" />
    </View>
  );
});

AlbumScreen.displayName = "AlbumScreen";

export default AlbumScreen;

