import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import { useAudio } from '@/context/AudioContext';
import { Korisnik, Pjesma, Album, Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Biblioteka.styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type LibraryFilter = 'prateci' | 'pjesme' | 'albumi' | 'playliste';

interface LibraryData {
  prateci: Korisnik[];
  pjesme: Pjesma[];
  albumi: Album[];
  playliste: Playlista[];
}

const Biblioteka: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const { playAudio, playPlaylist } = useAudio();
  
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('prateci');
  const [data, setData] = useState<LibraryData>({
    prateci: [],
    pjesme: [],
    albumi: [],
    playliste: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [korisnik, setKorisnik] = useState<Korisnik | null>(null);
  const [loadedFilters, setLoadedFilters] = useState<Set<LibraryFilter>>(new Set());

  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setKorisnik(user);
        return user;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return null;
  }, []);

  // Load only specific filter data
  const loadFilterData = useCallback(async (filter: LibraryFilter, user?: Korisnik) => {
    const currentUser = user || korisnik;
    if (!currentUser?.id) return;

    if (loadedFilters.has(filter)) return; // Already loaded

    try {
      switch (filter) {
        case 'prateci': {
          const followingRes = await axios.get(`${API_BASE}/pratioci/`);
          const followingLinks = followingRes.data || [];
          const followedIds = followingLinks
            .filter((p: any) => p.pratilacID === currentUser.id)
            .map((p: any) => p.korisnikID);

          if (followedIds.length > 0) {
            // Load in batches of 5 to avoid overwhelming the server
            const batchSize = 5;
            const followedArtists: Korisnik[] = [];
            
            for (let i = 0; i < followedIds.length; i += batchSize) {
              const batch = followedIds.slice(i, i + batchSize);
              const artistPromises = batch.map((id: string) =>
                axios.get(`${API_BASE}/korisnici/${id}`)
                  .then(res => res.data)
                  .catch(() => null)
              );
              const artists = await Promise.all(artistPromises);
              followedArtists.push(...artists.filter(Boolean));
            }
            
            setData(prev => ({ ...prev, prateci: followedArtists }));
          }
          break;
        }

        case 'pjesme': {
          const likedSongsRes = await axios.get(`${API_BASE}/korisnik_pjesma/`);
          const likedSongLinks = likedSongsRes.data || [];
          const likedSongIds = likedSongLinks
            .filter((l: any) => l.korisnikID === currentUser.id)
            .map((l: any) => l.pjesmaID);

          if (likedSongIds.length > 0) {
            const batchSize = 10;
            const likedSongs: Pjesma[] = [];
            
            for (let i = 0; i < likedSongIds.length; i += batchSize) {
              const batch = likedSongIds.slice(i, i + batchSize);
              const songPromises = batch.map((id: number) =>
                axios.get(`${API_BASE}/pjesme/${id}`)
                  .then(res => res.data)
                  .catch(() => null)
              );
              const songs = await Promise.all(songPromises);
              likedSongs.push(...songs.filter(s => s && s.odobreno));
            }
            
            setData(prev => ({ ...prev, pjesme: likedSongs }));
          }
          break;
        }

        case 'albumi': {
          const likedAlbumsRes = await axios.get(`${API_BASE}/korisnik_album/`);
          const likedAlbumLinks = likedAlbumsRes.data || [];
          const likedAlbumIds = likedAlbumLinks
            .filter((l: any) => l.korisnikID === currentUser.id)
            .map((l: any) => l.albumID);

          if (likedAlbumIds.length > 0) {
            const batchSize = 10;
            const likedAlbums: Album[] = [];
            
            for (let i = 0; i < likedAlbumIds.length; i += batchSize) {
              const batch = likedAlbumIds.slice(i, i + batchSize);
              const albumPromises = batch.map((id: number) =>
                axios.get(`${API_BASE}/albumi/${id}`)
                  .then(res => res.data)
                  .catch(() => null)
              );
              const albums = await Promise.all(albumPromises);
              likedAlbums.push(...albums.filter(a => a && a.odobreno));
            }
            
            setData(prev => ({ ...prev, albumi: likedAlbums }));
          }
          break;
        }

        case 'playliste': {
          const likedPlaylistsRes = await axios.get(`${API_BASE}/korisnik_playlista/`);
          const likedPlaylistLinks = likedPlaylistsRes.data || [];
          const likedPlaylistIds = likedPlaylistLinks
            .filter((l: any) => l.korisnikID === currentUser.id)
            .map((l: any) => l.playlistaID);

          if (likedPlaylistIds.length > 0) {
            const batchSize = 10;
            const likedPlaylists: Playlista[] = [];
            
            for (let i = 0; i < likedPlaylistIds.length; i += batchSize) {
              const batch = likedPlaylistIds.slice(i, i + batchSize);
              const playlistPromises = batch.map((id: number) =>
                axios.get(`${API_BASE}/playliste/${id}`)
                  .then(res => res.data)
                  .catch(() => null)
              );
              const playlists = await Promise.all(playlistPromises);
              likedPlaylists.push(...playlists.filter(p => p && p.javno));
            }
            
            setData(prev => ({ ...prev, playliste: likedPlaylists }));
          }
          break;
        }
      }

      setLoadedFilters(prev => new Set([...prev, filter]));
    } catch (error) {
      console.error(`Error loading ${filter} data:`, error);
    }
  }, [korisnik, loadedFilters]);

  // Replace useMemo with useEffect for initial data loading
  useEffect(() => {
    const initializeData = async () => {
      const user = await loadUserData();
      if (user) {
        await loadFilterData(activeFilter, user);
        setLoading(false);
      }
    };
    
    initializeData();
  }, [loadUserData, loadFilterData, activeFilter]);

  // Load data when filter changes
  const handleFilterChange = useCallback((filter: LibraryFilter) => {
    setActiveFilter(filter);
    if (!loadedFilters.has(filter)) {
      loadFilterData(filter);
    }
  }, [loadedFilters, loadFilterData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setLoadedFilters(new Set());
    setData({
      prateci: [],
      pjesme: [],
      albumi: [],
      playliste: [],
    });
    loadFilterData(activeFilter).finally(() => {
      setRefreshing(false);
    });
  }, [loadFilterData, activeFilter]);

  // Add query client for invalidating queries
  const queryClient = useQueryClient();

  // Mutation for unfollowing artists
  const unfollowMutation = useMutation({
    mutationFn: async (artistId: string) => {
      if (!korisnik?.id) throw new Error('No user ID');
      await axios.delete(`${API_BASE}/pratioci/${artistId}/${korisnik.id}`);
      return artistId;
    },
    onSuccess: (artistId) => {
      setData(prev => ({
        ...prev,
        prateci: prev.prateci.filter(a => a.id !== artistId)
      }));
      Alert.alert(t('success'), t('unfollowed_artist'));
    },
    onError: (error) => {
      console.error('Error unfollowing artist:', error);
      Alert.alert(t('error'), t('error_unfollowing'));
    }
  });

  // Mutation for unliking songs
  const unlikeSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      if (!korisnik?.id) throw new Error('No user ID');
      await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnik.id}/${songId}`);
      return songId;
    },
    onSuccess: (songId) => {
      setData(prev => ({
        ...prev,
        pjesme: prev.pjesme.filter(s => s.id !== songId)
      }));
      Alert.alert(t('success'), t('removed_from_favorites'));
    },
    onError: (error) => {
      console.error('Error unliking song:', error);
      Alert.alert(t('error'), t('error_removing_favorite'));
    }
  });

  // Mutation for unliking albums
  const unlikeAlbumMutation = useMutation({
    mutationFn: async (albumId: number) => {
      if (!korisnik?.id) throw new Error('No user ID');
      await axios.delete(`${API_BASE}/korisnik_album/${korisnik.id}/${albumId}`);
      return albumId;
    },
    onSuccess: (albumId) => {
      setData(prev => ({
        ...prev,
        albumi: prev.albumi.filter(a => a.id !== albumId)
      }));
      Alert.alert(t('success'), t('removed_from_favorites'));
    },
    onError: (error) => {
      console.error('Error unliking album:', error);
      Alert.alert(t('error'), t('error_removing_favorite'));
    }
  });

  // Mutation for unliking playlists
  const unlikePlaylistMutation = useMutation({
    mutationFn: async (playlistId: number) => {
      if (!korisnik?.id) throw new Error('No user ID');
      await axios.delete(`${API_BASE}/korisnik_playlista/${korisnik.id}/${playlistId}`);
      return playlistId;
    },
    onSuccess: (playlistId) => {
      setData(prev => ({
        ...prev,
        playliste: prev.playliste.filter(p => p.id !== playlistId)
      }));
      Alert.alert(t('success'), t('removed_from_favorites'));
    },
    onError: (error) => {
      console.error('Error unliking playlist:', error);
      Alert.alert(t('error'), t('error_removing_favorite'));
    }
  });

  // Query for album songs when playing album
  const useAlbumSongs = (albumId: number, enabled: boolean = false) => {
    return useQuery({
      queryKey: ['albumSongs', albumId],
      queryFn: async () => {
        const response = await axios.get(`${API_BASE}/pjesme/`);
        return (response.data as Pjesma[])
          .filter(s => s.albumID === albumId && s.odobreno && s.putanjaAudio)
          .sort((a, b) => a.id - b.id);
      },
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Query for playlist songs when playing playlist
  const usePlaylistSongs = (playlistId: number, enabled: boolean = false) => {
    return useQuery({
      queryKey: ['playlistSongs', playlistId],
      queryFn: async () => {
        const response = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
        const songIds: number[] = response.data || [];

        if (songIds.length === 0) return [];

        const songPromises = songIds.map(id => axios.get(`${API_BASE}/pjesme/${id}`));
        const songResponses = await Promise.all(songPromises);
        return songResponses
          .map(res => res.data)
          .filter(song => song && song.odobreno && song.putanjaAudio);
      },
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Update handlers to use mutations
  const handleUnfollow = useCallback((artistId: string) => {
    Alert.alert(
      t('confirm_action'),
      t('confirm_unfollow'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('unfollow'),
          style: 'destructive',
          onPress: () => unfollowMutation.mutate(artistId)
        }
      ]
    );
  }, [unfollowMutation, t]);

  const handleUnlikeSong = useCallback((songId: number) => {
    unlikeSongMutation.mutate(songId);
  }, [unlikeSongMutation]);

  const handleUnlikeAlbum = useCallback((albumId: number) => {
    unlikeAlbumMutation.mutate(albumId);
  }, [unlikeAlbumMutation]);

  const handleUnlikePlaylist = useCallback((playlistId: number) => {
    unlikePlaylistMutation.mutate(playlistId);
  }, [unlikePlaylistMutation]);

  // Update album play handler to use query
  const [playingAlbumId, setPlayingAlbumId] = useState<number | null>(null);
  const albumSongsQuery = useAlbumSongs(playingAlbumId || 0, !!playingAlbumId);

  const handlePlayAlbum = useCallback((album: Album) => {
    setPlayingAlbumId(album.id);
  }, []);

  useEffect(() => {
    if (albumSongsQuery.data && playingAlbumId) {
      if (albumSongsQuery.data.length === 0) {
        Alert.alert(t('error'), t('no_songs_in_album'));
      } else {
        playPlaylist(albumSongsQuery.data, 0);
      }
      setPlayingAlbumId(null);
    }
    if (albumSongsQuery.error && playingAlbumId) {
      console.error('Error playing album:', albumSongsQuery.error);
      Alert.alert(t('error'), t('error_playing_album'));
      setPlayingAlbumId(null);
    }
  }, [albumSongsQuery.data, albumSongsQuery.error, playingAlbumId, playPlaylist, t]);

  // Update playlist play handler to use query
  const [playingPlaylistId, setPlayingPlaylistId] = useState<number | null>(null);
  const playlistSongsQuery = usePlaylistSongs(playingPlaylistId || 0, !!playingPlaylistId);

  const handlePlayPlaylist = useCallback((playlist: Playlista) => {
    setPlayingPlaylistId(playlist.id);
  }, []);

  useEffect(() => {
    if (playlistSongsQuery.data && playingPlaylistId) {
      if (playlistSongsQuery.data.length === 0) {
        Alert.alert(t('error'), t('empty_playlist'));
      } else {
        playPlaylist(playlistSongsQuery.data, 0);
      }
      setPlayingPlaylistId(null);
    }
    if (playlistSongsQuery.error && playingPlaylistId) {
      console.error('Error playing playlist:', playlistSongsQuery.error);
      Alert.alert(t('error'), t('error_playing_playlist'));
      setPlayingPlaylistId(null);
    }
  }, [playlistSongsQuery.data, playlistSongsQuery.error, playingPlaylistId, playPlaylist, t]);

  // Memoize filters
  const filters = useMemo(() => [
    { key: 'prateci' as LibraryFilter, label: t('following'), icon: 'people' },
    { key: 'pjesme' as LibraryFilter, label: t('liked_songs'), icon: 'favorite' },
    { key: 'albumi' as LibraryFilter, label: t('liked_albums'), icon: 'album' },
    { key: 'playliste' as LibraryFilter, label: t('liked_playlists'), icon: 'queue-music' },
  ], [t]);

  const renderFilterButton = useCallback(({ item }: { item: typeof filters[0] }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === item.key && styles.filterButtonActive,
      ]}
      onPress={() => handleFilterChange(item.key)}
    >
      <Text
        style={[
          styles.filterButtonText,
          activeFilter === item.key && styles.filterButtonTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  ), [activeFilter, handleFilterChange]);

  const renderArtistItem = useCallback(({ item }: { item: Korisnik }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity 
        style={styles.itemHeader}
        onPress={() => router.push(`/izvodjac/${item.id}`)}
      >
        <Image
          source={{ uri: item.putanjaProfilneSlike || 'https://via.placeholder.com/60' }}
          style={[styles.itemImage, styles.artistImage]}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.korisnicko_ime}
          </Text>
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {item.ime && item.prezime ? `${item.ime} ${item.prezime}` : t('artist')}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.unfollowButton]}
          onPress={() => handleUnfollow(item.id)}
        >
          <MaterialIcons name="person-remove" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [router, t, handleUnfollow]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    playAudio(song);
  }, [playAudio]);

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity 
        style={styles.itemHeader}
        onPress={() => router.push(`/pjesma/${item.id}`)}
      >
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.naziv}
          </Text>
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {item.korisnik?.korisnicko_ime || t('unknown_artist')}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlaySong(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleUnlikeSong(item.id)}
        >
          <MaterialIcons name="favorite" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [router, t, handlePlaySong, handleUnlikeSong]);

  const renderAlbumItem = useCallback(({ item }: { item: Album }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity 
        style={styles.itemHeader}
        onPress={() => router.push(`/album/${item.id}`)}
      >
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.naziv}
          </Text>
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {item.korisnik?.korisnicko_ime || t('unknown_artist')}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlayAlbum(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleUnlikeAlbum(item.id)}
        >
          <MaterialIcons name="favorite" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [router, t, handlePlayAlbum, handleUnlikeAlbum]);

  const renderPlaylistItem = useCallback(({ item }: { item: Playlista }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity 
        style={styles.itemHeader}
        onPress={() => router.push(`/playlista/${item.id}`)}
      >
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.naziv}
          </Text>
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {item.korisnik?.korisnicko_ime || t('unknown_user')}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlayPlaylist(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleUnlikePlaylist(item.id)}
        >
          <MaterialIcons name="favorite" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  ), [router, t, handlePlayPlaylist, handleUnlikePlaylist]);

  // Memoize current data and empty state
  const currentData = useMemo(() => data[activeFilter], [data, activeFilter]);
  
  const emptyStateConfig = useMemo(() => {
    const activeFilterData = filters.find(f => f.key === activeFilter);
    return {
      icon: activeFilterData?.icon || 'inbox',
      title: {
        'prateci': t('no_following'),
        'pjesme': t('no_liked_songs'),
        'albumi': t('no_liked_albums'),
        'playliste': t('no_liked_playlists'),
      }[activeFilter],
      subtitle: {
        'prateci': t('no_following_description'),
        'pjesme': t('no_liked_songs_description'),
        'albumi': t('no_liked_albums_description'),
        'playliste': t('no_liked_playlists_description'),
      }[activeFilter],
    };
  }, [activeFilter, filters, t]);

  const renderContent = useMemo(() => {
    // Show loading indicator if current filter is not loaded yet
    if (!loadedFilters.has(activeFilter) && !loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#b91d95" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      );
    }

    if (currentData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons 
            name={emptyStateConfig.icon as any} 
            size={64} 
            color="#444" 
            style={styles.emptyIcon} 
          />
          <Text style={styles.emptyTitle}>
            {emptyStateConfig.title}
          </Text>
          <Text style={styles.emptySubtitle}>
            {emptyStateConfig.subtitle}
          </Text>
        </View>
      );
    }

    switch (activeFilter) {
      case 'prateci':
        return (
          <FlatList<Korisnik>
            data={data.prateci}
            keyExtractor={(item) => `prateci-${item.id}`}
            renderItem={renderArtistItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'pjesme':
        return (
          <FlatList<Pjesma>
            data={data.pjesme}
            keyExtractor={(item) => `pjesme-${item.id}`}
            renderItem={renderSongItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'albumi':
        return (
          <FlatList<Album>
            data={data.albumi}
            keyExtractor={(item) => `albumi-${item.id}`}
            renderItem={renderAlbumItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'playliste':
        return (
          <FlatList<Playlista>
            data={data.playliste}
            keyExtractor={(item) => `playliste-${item.id}`}
            renderItem={renderPlaylistItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        );
      default:
        return null;
    }
  }, [loadedFilters, activeFilter, loading, currentData, data, emptyStateConfig, renderArtistItem, renderSongItem, renderAlbumItem, renderPlaylistItem, t]);

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
          <Text style={styles.title}>{t('my_library')}</Text>

          {/* Filters */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
            data={filters}
            keyExtractor={(item) => item.key}
            renderItem={renderFilterButton}
          />

          {/* Content */}
          {renderContent}
        </View>
      </ScrollView>
    </View>
  );
});

Biblioteka.displayName = "Biblioteka";

export default Biblioteka;
