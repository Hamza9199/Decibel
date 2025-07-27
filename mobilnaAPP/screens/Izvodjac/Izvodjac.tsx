import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
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
import { Korisnik, Pjesma, Album, Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Izvodjac.styles';

const Izvodjac: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { izvodjacId } = useLocalSearchParams();
  const [artist, setArtist] = useState<Korisnik | null>(null);
  const [songs, setSongs] = useState<Pjesma[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user?.id || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  const loadArtistData = useCallback(async () => {
    if (!izvodjacId) return;

    try {
      setLoading(true);

      // Load artist details
      const artistRes = await axios.get(`${API_BASE}/korisnici/${izvodjacId}`);
      setArtist(artistRes.data);

      // Load artist's songs (owned and featured)
      const songsRes = await axios.get(`${API_BASE}/pjesme/`);
      const ownedSongs = (songsRes.data || []).filter(
        (p: Pjesma) => p.korisnikID === izvodjacId && p.odobreno
      );
      setSongs(ownedSongs);

      // Load featured songs via izvodjac_pjesma relationship
      try {
        const featuredRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
        const featuredLinks = featuredRes.data || [];
        const featuredSongIds = featuredLinks
          .filter((v: { izvodjacID: string }) => v.izvodjacID === izvodjacId)
          .map((v: { pjesmaID: number }) => v.pjesmaID);

        if (featuredSongIds.length > 0) {
          const featuredSongs = await Promise.all(
            featuredSongIds.map((id: number) =>
              axios.get(`${API_BASE}/pjesme/${id}`)
                .then(r => r.data)
                .catch(() => null)
            )
          );
          
          setSongs(prev => {
            const ids = new Set(prev.map(p => p.id));
            return [
              ...prev,
              ...featuredSongs.filter(p => p && !ids.has(p.id) && p.odobreno)
            ];
          });
        }
      } catch (error) {
        console.log('No featured songs found');
      }

      // Load approved albums
      const albumsRes = await axios.get(`${API_BASE}/albumi/`);
      const artistAlbums = (albumsRes.data || []).filter(
        (a: Album) => a.korisnikID === izvodjacId && a.odobreno
      );
      setAlbums(artistAlbums);

      // Load public playlists
      const playlistsRes = await axios.get(`${API_BASE}/playliste/`);
      const artistPlaylists = (playlistsRes.data || []).filter(
        (pl: Playlista) => pl.korisnikID === izvodjacId && pl.javno
      );
      setPlaylists(artistPlaylists);

      // Check if following
      if (currentUserId && izvodjacId) {
        try {
          await axios.get(`${API_BASE}/pratioci/${izvodjacId}/${currentUserId}`);
          setFollowing(true);
        } catch {
          setFollowing(false);
        }
      }

    } catch (error) {
      console.error('Error loading artist data:', error);
      Alert.alert(t('error'), t('error_loading_artist'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [izvodjacId, currentUserId, t]);

  // Load user data and artist data when component mounts or izvodjacId changes
  useMemo(() => {
    loadUserData().then(() => {
      if (izvodjacId) {
        loadArtistData();
      }
    });
  }, [izvodjacId, loadUserData, loadArtistData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadArtistData();
  }, [loadArtistData]);

  const handleFollow = useCallback(async () => {
    if (!currentUserId || !izvodjacId) return;

    try {
      if (following) {
        await axios.delete(`${API_BASE}/pratioci/${izvodjacId}/${currentUserId}`);
        setFollowing(false);
      } else {
        await axios.post(`${API_BASE}/pratioci/`, {
          korisnikID: izvodjacId,
          pratilacID: currentUserId,
        });
        setFollowing(true);
      }
    } catch (error) {
      console.error('Error following/unfollowing artist:', error);
      Alert.alert(t('error'), t('error_follow'));
    }
  }, [currentUserId, izvodjacId, following, t]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file'));
      return;
    }
    
    console.log('Playing song:', song.naziv);
  }, [t]);

  const handlePlayAlbum = useCallback((album: Album) => {
    const albumSongs = songs.filter(s => s.albumID === album.id && s.putanjaAudio);
    if (albumSongs.length === 0) {
      Alert.alert(t('error'), t('no_songs_in_album'));
      return;
    }
    
    console.log('Playing album:', album.naziv);
    // Play first song
    handlePlaySong(albumSongs[0]);
  }, [songs, handlePlaySong, t]);

  const handlePlayPlaylist = useCallback(async (playlist: Playlista) => {
    try {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlist.id}`);
      const songIds: number[] = res.data || [];
      
      if (songIds.length === 0) {
        Alert.alert(t('error'), t('empty_playlist'));
        return;
      }

      const firstSongRes = await axios.get(`${API_BASE}/pjesme/${songIds[0]}`);
      const firstSong = firstSongRes.data;
      
      if (firstSong && firstSong.putanjaAudio) {
        handlePlaySong(firstSong);
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert(t('error'), t('error_playing_playlist'));
    }
  }, [handlePlaySong, t]);

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
          style={styles.itemImage}
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.naziv}
          </Text>
        </View>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlaySong(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [handlePlaySong]);

  const renderAlbumItem = useCallback(({ item }: { item: Album }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
          style={styles.itemImage}
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.naziv}
          </Text>
        </View>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlayAlbum(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [handlePlayAlbum]);

  const renderPlaylistItem = useCallback(({ item }: { item: Playlista }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
          style={styles.itemImage}
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.naziv}
          </Text>
        </View>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlayPlaylist(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [handlePlayPlaylist]);

  // Memoize artist meta information
  const artistMeta = useMemo(() => {
    if (!artist) return [];
    return [
      { label: t('name'), value: artist.ime },
      { label: t('surname'), value: artist.prezime },
      { label: t('followers'), value: artist.brojPratilaca || 0 },
    ];
  }, [artist, t]);

  // Memoize follow button visibility
  const showFollowButton = useMemo(() => {
    return currentUserId && currentUserId !== artist?.id;
  }, [currentUserId, artist?.id]);

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

  if (!artist) {
    return (
      <View style={styles.notFoundContainer}>
        <Header />
        <MaterialIcons name="person" size={64} color="#666" />
        <Text style={styles.notFoundText}>
          {t('artist_not_found') || 'Artist not found'}
        </Text>
        <Tabs currentRoute="artist" />
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
          {/* Artist Header */}
          <View style={styles.artistMain}>
            <Image
              source={{ uri: artist.putanjaProfilneSlike || 'https://via.placeholder.com/120' }}
              style={styles.artistImage}
            />
            
            <View style={styles.artistInfo}>
              <Text style={styles.artistName}>{artist.korisnicko_ime}</Text>
              
              <View style={styles.artistMeta}>
                {artistMeta.map((meta, index) => (
                  <Text key={index} style={styles.metaItem}>
                    {meta.label}: {meta.value}
                  </Text>
                ))}
              </View>
              
              {artist.bio && (
                <Text style={styles.artistBio} numberOfLines={3}>
                  {artist.bio}
                </Text>
              )}
              
              {showFollowButton && (
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    following && styles.followButtonFollowing
                  ]}
                  onPress={handleFollow}
                >
                  <Text style={styles.followButtonText}>
                    {following ? t('follows') : t('follow')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Songs Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('songs')}</Text>
            {songs.length === 0 ? (
              <Text style={styles.noItems}>{t('no_songs')}</Text>
            ) : (
              <FlatList
                data={songs}
                renderItem={renderSongItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            )}
          </View>

          {/* Albums Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('albums')}</Text>
            {albums.length === 0 ? (
              <Text style={styles.noItems}>{t('no_albums')}</Text>
            ) : (
              <FlatList
                data={albums}
                renderItem={renderAlbumItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            )}
          </View>

          {/* Playlists Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('playlists')}</Text>
            {playlists.length === 0 ? (
              <Text style={styles.noItems}>{t('no_playlists')}</Text>
            ) : (
              <FlatList
                data={playlists}
                renderItem={renderPlaylistItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="artist" />
    </View>
  );
});

Izvodjac.displayName = "Izvodjac";

export default Izvodjac;
