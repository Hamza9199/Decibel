import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Korisnik, Pjesma, Album, Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Izvodjac.styles';

const Izvodjac: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { izvodjacId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  

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
      setCurrentUserId(userId);
    };
    
    initializeUser();
  }, [loadUserData]);

  // Query for artist details
  const artistQuery = useQuery({
    queryKey: ['artist', izvodjacId],
    queryFn: async () => {
      if (!izvodjacId) throw new Error('No artist ID');
      const response = await axios.get(`${API_BASE}/korisnici/${izvodjacId}`);
      return response.data;
    },
    enabled: !!izvodjacId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for artist's songs
  const songsQuery = useQuery({
    queryKey: ['artistSongs', izvodjacId],
    queryFn: async () => {
      if (!izvodjacId) return [];
      
      // Load owned songs
      const songsRes = await axios.get(`${API_BASE}/pjesme/`);
      const ownedSongs = (songsRes.data || []).filter(
        (p: Pjesma) => p.korisnikID === izvodjacId && p.odobreno
      );

      // Load featured songs
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
          
          const ids = new Set(ownedSongs.map((p: Pjesma) => p.id));
          const validFeaturedSongs = featuredSongs.filter(p => p && !ids.has(p.id) && p.odobreno);
          
          return [...ownedSongs, ...validFeaturedSongs];
        }
      } catch  {
        console.log('No featured songs found');
      }

      return ownedSongs;
    },
    enabled: !!izvodjacId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for artist's albums
  const albumsQuery = useQuery({
    queryKey: ['artistAlbums', izvodjacId],
    queryFn: async () => {
      if (!izvodjacId) return [];
      
      const response = await axios.get(`${API_BASE}/albumi/`);
      return (response.data || []).filter(
        (a: Album) => a.korisnikID === izvodjacId && a.odobreno
      );
    },
    enabled: !!izvodjacId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for artist's playlists
  const playlistsQuery = useQuery({
    queryKey: ['artistPlaylists', izvodjacId],
    queryFn: async () => {
      if (!izvodjacId) return [];
      
      const response = await axios.get(`${API_BASE}/playliste/`);
      return (response.data || []).filter(
        (pl: Playlista) => pl.korisnikID === izvodjacId && pl.javno
      );
    },
    enabled: !!izvodjacId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for follow status
  const followQuery = useQuery({
    queryKey: ['followStatus', izvodjacId, currentUserId],
    queryFn: async () => {
      if (!currentUserId || !izvodjacId) return false;
      
      try {
        await axios.get(`${API_BASE}/pratioci/${izvodjacId}/${currentUserId}`);
        return true;
      } catch {
        return false;
      }
    },
    enabled: !!(currentUserId && izvodjacId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const artist = artistQuery.data;
  const songs = useMemo(() => songsQuery.data || [], [songsQuery.data]);
  const albums = albumsQuery.data || [];
  const playlists = playlistsQuery.data || [];
  const following = followQuery.data || false;

  // Mutation for follow/unfollow
  const followMutation = useMutation({
    mutationFn: async ({ follow }: { follow: boolean }) => {
      if (!currentUserId || !izvodjacId) throw new Error('Missing IDs');
      
      if (follow) {
        await axios.post(`${API_BASE}/pratioci/`, {
          korisnikID: izvodjacId,
          pratilacID: currentUserId,
        });
        return true;
      } else {
        await axios.delete(`${API_BASE}/pratioci/${izvodjacId}/${currentUserId}`);
        return false;
      }
    },
    onSuccess: (isFollowing) => {
      queryClient.setQueryData(['followStatus', izvodjacId, currentUserId], isFollowing);
    },
    onError: (error) => {
      console.error('Error following/unfollowing artist:', error);
      Alert.alert(t('error'), t('error_follow'));
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['artist', izvodjacId] }),
      queryClient.invalidateQueries({ queryKey: ['artistSongs', izvodjacId] }),
      queryClient.invalidateQueries({ queryKey: ['artistAlbums', izvodjacId] }),
      queryClient.invalidateQueries({ queryKey: ['artistPlaylists', izvodjacId] }),
      queryClient.invalidateQueries({ queryKey: ['followStatus', izvodjacId, currentUserId] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [queryClient, izvodjacId, currentUserId]);

  const handleFollow = useCallback(() => {
    const isFollowing = followQuery.data || false;
    followMutation.mutate({ follow: !isFollowing });
  }, [followQuery.data, followMutation]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file'));
      return;
    }
    
    console.log('Playing song:', song.naziv);
  }, [t]);

  const handlePlayAlbum = useCallback((album: Album) => {
    const albumSongs = songs.filter((s: Pjesma) => s.albumID === album.id && s.putanjaAudio);
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
    if (!artistQuery.data) return [];
    const artist = artistQuery.data;
    return [
      { label: t('name'), value: artist.ime },
      { label: t('surname'), value: artist.prezime },
      { label: t('followers'), value: artist.brojPratilaca || 0 },
    ];
  }, [artistQuery.data, t]);

  // Memoize follow button visibility
  const showFollowButton = useMemo(() => {
    return currentUserId && currentUserId !== artistQuery.data?.id;
  }, [currentUserId, artistQuery.data?.id]);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = artistQuery.isLoading || songsQuery.isLoading || albumsQuery.isLoading || playlistsQuery.isLoading;
  const error = artistQuery.error || songsQuery.error || albumsQuery.error || playlistsQuery.error;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  if (error || !artistQuery.data) {
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
                  disabled={followMutation.isPending}
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
