import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Album, Pjesma, Playlista, KorisnikPjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Album.styles';

const AlbumScreen: React.FC = () => {
  const { t } = useTranslation();
  const { albumId } = useLocalSearchParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Pjesma[]>([]);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repeatAll, setRepeatAll] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Pjesma | null>(null);
  const [likeMap, setLikeMap] = useState<{ [pjesmaId: number]: boolean }>({});
  const [korisnikID, setKorisnikID] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (albumId) {
      loadAlbumData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, korisnikID]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setKorisnikID(user?.id || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAlbumData = async () => {
    if (!albumId) return;
    
    try {
      setLoading(true);
      
      // Load album details
      const albumRes = await axios.get(`${API_BASE}/albumi/${albumId}`);
      setAlbum(albumRes.data);
      setLikeCount(albumRes.data.brojLajkova || 0);

      // Load songs for this album
      const songsRes = await axios.get(`${API_BASE}/pjesme/`);
      const albumSongs = (songsRes.data || []).filter(
        (p: Pjesma) => String(p.albumID) === String(albumId)
      );
      setSongs(albumSongs);

      if (korisnikID) {
        // Load user's playlists
        const playlistsRes = await axios.get(`${API_BASE}/playliste/`);
        setPlaylists(playlistsRes.data || []);

        // Check if user liked this album
        const albumLikesRes = await axios.get(`${API_BASE}/korisnik_album/`);
        const albumLikes = albumLikesRes.data as { korisnikID: string; albumID: number }[];
        setLiked(!!albumLikes.find(v => v.korisnikID === korisnikID && String(v.albumID) === String(albumId)));

        // Load user's song likes
        const songLikesRes = await axios.get(`${API_BASE}/korisnik_pjesma/`);
        const songLikes = songLikesRes.data as KorisnikPjesma[];
        const map: { [pjesmaId: number]: boolean } = {};
        songLikes.filter(v => v.korisnikID === korisnikID).forEach(v => {
          map[v.pjesmaID] = true;
        });
        setLikeMap(map);
      }
    } catch (error) {
      console.error('Error loading album data:', error);
      Alert.alert(t('error'), t('error_loading_album') || 'Error loading album');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAlbumData();
  };

  const handlePlaySong = (song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    // Dispatch audio play event
    console.log('Playing song:', song.naziv);
  };

  const handlePlayAlbum = () => {
    if (songs.length === 0) {
      Alert.alert(t('error'), t('no_songs_in_album') || 'No songs in this album');
      return;
    }
    
    // Play first song
    const firstSong = songs[0];
    if (firstSong?.putanjaAudio) {
      handlePlaySong(firstSong);
    }
  };

  const handleLikeAlbum = async () => {
    if (!album || !korisnikID) return;
    
    try {
      if (liked) {
        await axios.delete(`${API_BASE}/korisnik_album/${korisnikID}/${album.id}`);
        setLiked(false);
        setLikeCount(prev => prev - 1);
        Alert.alert(t('success'), t('removed_from_favorites') || 'Removed from favorites');
      } else {
        await axios.post(`${API_BASE}/korisnik_album/`, {
          korisnikID,
          albumID: album.id,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLiked(true);
        setLikeCount(prev => prev + 1);
        Alert.alert(t('success'), t('added_to_favorites') || 'Added to favorites');
      }
    } catch (error) {
      console.error('Error liking album:', error);
      Alert.alert(t('error'), t('error_liking_album') || 'Error updating favorites');
    }
  };

  const handleLikeSong = async (songId: number) => {
    if (!korisnikID) return;
    
    try {
      if (likeMap[songId]) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${songId}`);
        setLikeMap(prev => ({ ...prev, [songId]: false }));
        Alert.alert(t('success'), t('removed_from_favorites') || 'Removed from favorites');
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID,
          pjesmaID: songId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLikeMap(prev => ({ ...prev, [songId]: true }));
        Alert.alert(t('success'), t('added_to_favorites') || 'Added to favorites');
      }
    } catch (error) {
      console.error('Error liking song:', error);
      Alert.alert(t('error'), t('error_liking_song') || 'Error updating favorites');
    }
  };

  const handleAddToPlaylist = (song: Pjesma) => {
    setSelectedSong(song);
    setShowPlaylistModal(true);
  };

  const handleSelectPlaylist = async (playlistId: number) => {
    if (!selectedSong) return;
    
    try {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID: selectedSong.id,
        playlistaID: playlistId,
      });
      setShowPlaylistModal(false);
      setSelectedSong(null);
      Alert.alert(t('success'), t('song_added_to_playlist') || 'Song added to playlist!');
    } catch (error: any) {
      console.error('Error adding song to playlist:', error);
      const errorMsg = error.response?.data?.detail || t('error_adding_to_playlist') || 'Error adding song to playlist';
      Alert.alert(t('error'), errorMsg);
      setShowPlaylistModal(false);
      setSelectedSong(null);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSongItem = ({ item, index }: { item: Pjesma; index: number }) => (
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
            likeMap[item.id] && styles.actionButtonLiked
          ]}
          onPress={() => handleLikeSong(item.id)}
        >
          <MaterialIcons 
            name={likeMap[item.id] ? "favorite" : "favorite-border"} 
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
  );

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
        <Header />
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
      <Header />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#b91d95"
          />
        }
      >
        <View style={styles.content}>
          {/* Album Header */}
          <View style={styles.albumMain}>
            <View style={styles.albumImageWrap}>
              <Image
                source={{ uri: album.putanjaSlika || 'https://via.placeholder.com/300' }}
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
                  style={[styles.likeButton, liked && styles.likeButtonLiked]} 
                  onPress={handleLikeAlbum}
                >
                  <MaterialIcons 
                    name={liked ? "favorite" : "favorite-border"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.likeCount}>{likeCount}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.repeatButton} 
                  onPress={() => setRepeatAll(!repeatAll)}
                >
                  <MaterialIcons 
                    name="repeat" 
                    size={20} 
                    color={repeatAll ? "#fff" : "#ccc"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.albumInfo}>
              <Text style={styles.albumTitle} numberOfLines={2}>
                {album.naziv}
              </Text>
              {album.opis && (
                <Text style={styles.albumDescription} numberOfLines={3}>
                  {album.opis}
                </Text>
              )}
              <View style={styles.albumMeta}>
                <Text style={styles.metaItem}>
                  {t('songs')}: {songs.length}
                </Text>
                <Text style={styles.metaItem}>
                  {t('likes')}: {likeCount}
                </Text>
              </View>
            </View>
          </View>

          {/* Songs Section */}
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

      {/* Add to Playlist Modal */}
      <Modal
        visible={showPlaylistModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlaylistModal(false)}
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
              onPress={() => setShowPlaylistModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Tabs currentRoute="album" />
    </View>
  );
};

export default AlbumScreen;

