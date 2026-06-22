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
import { useQuery, useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Korisnik, Pjesma, Album, Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './Izvodjac.styles';
import { styles as lightStyles } from './IzvodjacWhite.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';
import { useAudio } from '@/context/AudioContext';

const Izvodjac: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { playAudio, playPlaylist } = useAudio();
  const { izvodjacId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const styles = theme === 'light' ? lightStyles : darkStyles;
  const { from } = useLocalSearchParams<{ from?: string }>();
  const currentRoute = useMemo(() => izvodjacId ? `/izvodjac/${izvodjacId}` : '/izvodjac/[izvodjacId]', [izvodjacId]);
  const handleBackPress = useBackPress({ from, defaultRoute: currentRoute, currentRoute });

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('decibel_tema');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch { }
  }, []);
  

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
      setCurrentUserId(userId);
    };
    
    initializeUser();
  }, [loadUserData]);

  useEffect(() => { loadTheme(); }, [loadTheme]);
  useEffect(() => {
    const interval = setInterval(loadTheme, 3000);
    return () => clearInterval(interval);
  }, [loadTheme]);

  const artistQuery = useQuery({
    queryKey: ['artist', izvodjacId],
    queryFn: async () => {
      if (!izvodjacId) throw new Error('No artist ID');
      const response = await axios.get(`${API_BASE}/korisnici/${izvodjacId}`);
      return response.data;
    },
    enabled: !!izvodjacId,
    staleTime: 10 * 60 * 1000, 
  });

  const songsQuery = useQuery({
    queryKey: ['artistSongs', izvodjacId],
    queryFn: async () => {
      if (!izvodjacId) return [];
      
      const songsRes = await axios.get(`${API_BASE}/pjesme/`);
      const ownedSongs = (songsRes.data || []).filter(
        (p: Pjesma) => p.korisnikID === izvodjacId && p.odobreno
      );

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
    staleTime: 10 * 60 * 1000, 
  });

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
    staleTime: 10 * 60 * 1000,
  });

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
    staleTime: 10 * 60 * 1000, 
  });

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
    staleTime: 5 * 60 * 1000, 
  });

  const artist = artistQuery.data;
  const songs = useMemo(() => songsQuery.data || [], [songsQuery.data]);
  const albums = albumsQuery.data || [];
  const playlists = playlistsQuery.data || [];
  const following = followQuery.data || false;

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
    onSuccess: (_, vars) => {
      queryClient.setQueryData(['followStatus', izvodjacId, currentUserId], vars.follow);
      queryClient.invalidateQueries({ queryKey: ['artist', izvodjacId] });
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
  }, [izvodjacId, currentUserId]);

  const handleFollow = useCallback(() => {
    const isFollowing = followQuery.data || false;
    followMutation.mutate({ follow: !isFollowing });
  }, [followQuery.data, followMutation]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file'));
      return;
    }
    playAudio(song);
  }, [t, playAudio]);

  const handlePlayAlbum = useCallback((album: Album) => {
    const albumSongs = songs.filter((s: Pjesma) => s.albumID === album.id && s.putanjaAudio);
    if (albumSongs.length === 0) {
      Alert.alert(t('error'), t('no_songs_in_album'));
      return;
    }
    playPlaylist(albumSongs, 0);
  }, [songs, playPlaylist, t]);

  const handlePlayPlaylist = useCallback(async (playlist: Playlista) => {
    try {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlist.id}`);
      const songIds: number[] = res.data || [];
      
      if (songIds.length === 0) {
        Alert.alert(t('error'), t('empty_playlist'));
        return;
      }
      const songResponses = await Promise.all(songIds.map((id: number) => axios.get(`${API_BASE}/pjesme/${id}`)));
      const playlistSongs = songResponses.map(r => r.data).filter((p: Pjesma) => p && p.putanjaAudio);
      if (playlistSongs.length === 0) {
        Alert.alert(t('error'), t('empty_playlist'));
        return;
      }
      playPlaylist(playlistSongs, 0);
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert(t('error'), t('error_playing_playlist'));
    }
  }, [playPlaylist, t]);

  const handleNavigateToSong = useCallback((songId: number) => {
    navigateWithHistory(`/pjesma/${songId}?from=izvodjac`, currentRoute);
  }, [currentRoute]);

  const handleNavigateToAlbum = useCallback((albumId: number) => {
    navigateWithHistory(`/album/${albumId}?from=izvodjac`, currentRoute);
  }, [currentRoute]);

  const handleNavigateToPlaylist = useCallback((playlistId: number) => {
    navigateWithHistory(`/playlista/${playlistId}?from=izvodjac`, currentRoute);
  }, [currentRoute]);

   useScreenCleanup();
 

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
          style={styles.itemImage}
        />
        
        <View style={styles.itemInfo}>
          <TouchableOpacity onPress={() => handleNavigateToSong(item.id)}>
            <Text style={styles.itemTitle} numberOfLines={2}>{item.naziv}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonRight]} onPress={() => handlePlaySong(item)}>
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [styles.itemCard, styles.itemHeader, styles.itemImage, styles.itemInfo, styles.itemTitle, styles.actionButton, styles.actionButtonRight, handleNavigateToSong, handlePlaySong]);

  const renderAlbumItem = useCallback(({ item }: { item: Album }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
          style={styles.itemImage}
        />
        
        <View style={styles.itemInfo}>
          <TouchableOpacity onPress={() => handleNavigateToAlbum(item.id)}>
            <Text style={styles.itemTitle} numberOfLines={2}>{item.naziv}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonRight]}
          onPress={() => handlePlayAlbum(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [styles.itemCard, styles.itemHeader, styles.itemImage, styles.itemInfo, styles.itemTitle, styles.actionButton, styles.actionButtonRight, handleNavigateToAlbum, handlePlayAlbum]);

  const renderPlaylistItem = useCallback(({ item }: { item: Playlista }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
          style={styles.itemImage}
        />
        
        <View style={styles.itemInfo}>
          <TouchableOpacity onPress={() => handleNavigateToPlaylist(item.id)}>
            <Text style={styles.itemTitle} numberOfLines={2}>{item.naziv}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonRight]}
          onPress={() => handlePlayPlaylist(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [styles.itemCard, styles.itemHeader, styles.itemImage, styles.itemInfo, styles.itemTitle, styles.actionButton, styles.actionButtonRight, handleNavigateToPlaylist, handlePlayPlaylist]);

  const artistMeta = useMemo(() => {
    if (!artistQuery.data) return [];
    const artist = artistQuery.data;
    return [
      { value: artist.ime },
      { value: artist.prezime },
    ];
  }, [artistQuery.data]);

  const showFollowButton = useMemo(() => {
    return currentUserId && currentUserId !== artistQuery.data?.id;
  }, [currentUserId, artistQuery.data?.id]);

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
         <Back 
          title={t('artist_not_found') || 'Artist Not Found'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory(`/edit-profile?from=izvodjac/${izvodjacId}`, currentRoute)}
                  source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
                <Tabs currentRoute="artist" />

      </View>
    );
  }

  if (error || !artistQuery.data) {
    return (
      <View style={styles.notFoundContainer}>
        <Back 
          title={t('artist_not_found') || 'Artist Not Found'}
        onBackPress={handleBackPress}
        onProfilePress={() =>  navigateWithHistory(`/edit-profile?from=izvodjac/${izvodjacId}`, currentRoute)}
                  source={from}
        />
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
      <Back 
        title={artistQuery.data.korisnicko_ime || t('artist')}
        onBackPress={handleBackPress}
       onProfilePress={() => navigateWithHistory(`/edit-profile?from=izvodjac/${izvodjacId}`, currentRoute)}
               source={from}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <View style={styles.artistMain}>
            <Image
              source={{ uri: artist.putanjaProfilneSlike || 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.iconfinder.com%2Fdata%2Ficons%2Fflaticons-solid%2F16%2Fprofile-1-512.png&f=1&nofb=1&ipt=6b148c0994b76fe50e9a2fbb9e360cc3858b81f150251aca12a5ca51d932aca8' }}
              style={styles.artistImage}
            />
            
            <View style={styles.artistInfo}>
              <Text style={styles.artistName}>{artist.korisnicko_ime}</Text>
              
              <View style={styles.artistMeta}>
                {artistMeta.map((meta, index) => (
                  <Text key={index} style={styles.metaItem}>
                    {meta.value}
                  </Text>
                ))}
              </View>
              
             
              
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
                    {following ? t('follows') : t('follow')} ( {artist.brojPratilaca || 0} )
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

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

      <Tabs currentRoute={currentRoute} />
    </View>
  );
});

Izvodjac.displayName = "Izvodjac";

export default Izvodjac;
