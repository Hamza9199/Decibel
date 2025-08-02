import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import axios, { isCancel } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import { useAudio } from '@/context/AudioContext';
import { Korisnik, Pjesma, Album, Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Biblioteka.styles';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';

type LibraryFilter = 'prateci' | 'pjesme' | 'albumi' | 'playliste';

const SkeletonItem: React.FC = React.memo(() => (
  <View style={[styles.itemCard, { opacity: 0.6 }]}>
    <View style={styles.itemHeader}>
      <View style={[styles.itemImage, { backgroundColor: '#333' }]} />
      <View style={styles.itemInfo}>
        <View style={[styles.skeletonLine, { width: '70%', height: 16, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 12 }]} />
      </View>
    </View>
    <View style={styles.itemActions}>
      <View style={[styles.actionButton, { backgroundColor: '#333' }]} />
      <View style={[styles.actionButton, { backgroundColor: '#333', marginLeft: 8 }]} />
    </View>
  </View>
));
SkeletonItem.displayName = "SkeletonItem";

const SkeletonLoader: React.FC = React.memo(() => (
  <View>
    {Array.from({ length: 5 }).map((_, index) => (
      <SkeletonItem key={`skeleton-${index}`} />
    ))}
  </View>
));

SkeletonLoader.displayName = "SkeletonLoader";

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000, 
});

const Biblioteka: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const { playAudio, playPlaylist } = useAudio();
  
  const abortControllerRef = useRef<AbortController>(null);
  
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('prateci');
  const [korisnik, setKorisnik] = useState<Korisnik | null>(null);
  const [playingAlbumId, setPlayingAlbumId] = useState<number | null>(null);
  const [playingPlaylistId, setPlayingPlaylistId] = useState<number | null>(null);
  useEffect(() => {
    const abortController = abortControllerRef.current;
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);

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

  const loadBatchData = useCallback(async <T,>(
    ids: (string | number)[], 
    endpoint: string,
    signal?: AbortSignal
  ): Promise<T[]> => {
    if (ids.length === 0) return [];
    
    const batchSize = 15; 
    const results: T[] = [];
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      try {
        const response = await apiClient.get(`/${endpoint}`, {
          params: { ids: batch.join(',') },
          signal,
        });
        results.push(...response.data.filter(Boolean));
      } catch (error) {
        if (isCancel(error)) {
          throw error;
        }
        const fallbackResults = await Promise.allSettled(
          batch.map(id => 
            apiClient.get(`/${endpoint}/${id}`, { signal })
              .then(res => res.data)
          )
        );
        const successfulResults = fallbackResults
          .filter((result): result is PromiseFulfilledResult<T> => 
            result.status === 'fulfilled' && result.value
          )
          .map(result => result.value);
        results.push(...successfulResults);
      }
    }
    
    return results;
  }, []);

  const useFollowingArtists = (userId?: string) => useQuery({
    queryKey: ['following', userId],
    queryFn: async ({ signal }) => {
      if (!userId) return [];
      const response = await apiClient.get(`/pratioci/korisnik/${userId}`, { signal });
      const followedIds = (response.data || [])
        .map((p: any) => p.korisnikID)
        .filter(Boolean);

      if (followedIds.length === 0) return [];

      const followedUsers = await loadBatchData<Korisnik>(followedIds, 'korisnici', signal);
      return followedUsers.filter(user => followedIds.includes(user.id));
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

 const useLikedSongs = (userId?: string) => useQuery({
  queryKey: ['likedSongs', userId],
  queryFn: async ({ signal }) => {
    if (!userId) return [];
    const likedResponse = await apiClient.get(`/korisnik_pjesma/korisnik/${userId}`, { signal });
    return (likedResponse.data || [])
      .filter((l: any) => l.pjesma && l.pjesma.odobreno && l.pjesma.putanjaAudio)
      .map((l: any) => ({
        ...l.pjesma,
        korisnik: l.korisnik || l.pjesma.korisnik || null
      }));
  },
  enabled: !!userId,
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  retry: 2,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
});

const useLikedAlbums = (userId?: string) => useQuery({
    queryKey: ['likedAlbums', userId],
    queryFn: async ({ signal }) => {
      if (!userId) return [];
      const likedResponse = await apiClient.get(`/korisnik_album/korisnik/${userId}`, { signal });
      return (likedResponse.data || [])
        .filter((l: any) => l.album && l.album.odobreno)
        .map((l: any) => ({
          ...l.album,
          korisnik: l.korisnik || l.album.korisnik || null
        }));
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const useLikedPlaylists = (userId?: string) => useQuery({
    queryKey: ['likedPlaylists', userId],
    queryFn: async ({ signal }) => {
      if (!userId) return [];
      const likedResponse = await apiClient.get(`/korisnik_playlista/korisnik/${userId}`, { signal });
      return (likedResponse.data || [])
        .filter((l: any) => l.playlista && l.playlista.javno)
        .map((l: any) => ({
          ...l.playlista,
          korisnik: l.korisnik || l.playlista.korisnik || null
        }));
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const followingQuery = useFollowingArtists(korisnik?.id);
  const songsQuery = useLikedSongs(korisnik?.id);
  const albumsQuery = useLikedAlbums(korisnik?.id);
  const playlistsQuery = useLikedPlaylists(korisnik?.id);

  useEffect(() => {
    if (!korisnik?.id) return;

    const prefetchData = () => {
      const prefetches = [
        { 
          key: 'prateci', 
          queryKey: ['following', korisnik.id], 
          queryFn: async ({ signal }: { signal?: AbortSignal }) => {
            const response = await apiClient.get(`/pratioci/korisnik/${korisnik.id}`, { signal });
            return response.data || [];
          }
        },
        { 
          key: 'pjesme', 
          queryKey: ['likedSongs', korisnik.id], 
          queryFn: async ({ signal }: { signal?: AbortSignal }) => {
            const response = await apiClient.get(`/korisnik_pjesma/korisnik/${korisnik.id}`, { signal });
            return (response.data || []).filter((l: any) => l.pjesma && l.pjesma.odobreno && l.pjesma.putanjaAudio)
              .map((l: any) => ({
                ...l.pjesma,
                korisnik: l.korisnik || l.pjesma.korisnik || null
              }));
          }
        },
        { 
          key: 'albumi', 
          queryKey: ['likedAlbums', korisnik.id], 
          queryFn: async ({ signal }: { signal?: AbortSignal }) => {
            const response = await apiClient.get(`/korisnik_album/korisnik/${korisnik.id}`, { signal });
            return (response.data || []).filter((l: any) => l.album && l.album.odobreno)
              .map((l: any) => ({
                ...l.album,
                korisnik: l.korisnik || l.album.korisnik || null
              }));
          }
        },
        { 
          key: 'playliste', 
          queryKey: ['likedPlaylists', korisnik.id], 
          queryFn: async ({ signal }: { signal?: AbortSignal }) => {
            const response = await apiClient.get(`/korisnik_playlista/korisnik/${korisnik.id}`, { signal });
            return (response.data || []).filter((l: any) => l.playlista && l.playlista.javno)
              .map((l: any) => ({
                ...l.playlista,
                korisnik: l.korisnik || l.playlista.korisnik || null
              }));
          }
        },
      ];

      prefetches.forEach(({ key, queryKey, queryFn }) => {
        if (key !== activeFilter) {
          const existingData = queryClient.getQueryData(queryKey);
          if (!existingData) {
            queryClient.prefetchQuery({
              queryKey,
              queryFn: queryFn as any,
              staleTime: 10 * 60 * 1000,
              gcTime: 30 * 60 * 1000,
            });
          }
        }
      });
    };

    const timer = setTimeout(prefetchData, 1000);
    return () => clearTimeout(timer);
  }, [korisnik?.id, activeFilter]);

  const unfollowMutation = useMutation({
    mutationFn: async (artistId: string) => {
      if (!korisnik?.id) throw new Error('No user ID');
      await apiClient.delete(`/pratioci/${artistId}/${korisnik.id}`);
      return artistId;
    },
    onMutate: async (artistId) => {
      await queryClient.cancelQueries({ queryKey: ['following', korisnik?.id] });
      const previousData = queryClient.getQueryData(['following', korisnik?.id]);
      
      queryClient.setQueryData(['following', korisnik?.id], (old: Korisnik[] = []) =>
        old.filter(a => a.id !== artistId)
      );
      
      return { previousData };
    },
    onError: (err, artistId, context) => {
      queryClient.setQueryData(['following', korisnik?.id], context?.previousData);
      Alert.alert(t('error'), t('error_unfollowing'));
    },
    onSuccess: () => {
      Alert.alert(t('success'), t('unfollowed_artist'));
    },
  });

  const unlikeSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      if (!korisnik?.id) throw new Error('No user ID');
      await apiClient.delete(`/korisnik_pjesma/${korisnik.id}/${songId}`);
      return songId;
    },
    onMutate: async (songId) => {
      await queryClient.cancelQueries({ queryKey: ['likedSongs', korisnik?.id] });
      const previousData = queryClient.getQueryData(['likedSongs', korisnik?.id]);
      
      queryClient.setQueryData(['likedSongs', korisnik?.id], (old: Pjesma[] = []) =>
        old.filter(s => s.id !== songId)
      );
      
      return { previousData };
    },
    onError: (err, songId, context) => {
      queryClient.setQueryData(['likedSongs', korisnik?.id], context?.previousData);
      Alert.alert(t('error'), t('error_removing_favorite'));
    },
    onSuccess: () => {
      Alert.alert(t('success'), t('removed_from_favorites'));
    },
  });

  const unlikeAlbumMutation = useMutation({
    mutationFn: async (albumId: number) => {
      if (!korisnik?.id) throw new Error('No user ID');
      await apiClient.delete(`/korisnik_album/${korisnik.id}/${albumId}`);
      return albumId;
    },
    onMutate: async (albumId) => {
      await queryClient.cancelQueries({ queryKey: ['likedAlbums', korisnik?.id] });
      const previousData = queryClient.getQueryData(['likedAlbums', korisnik?.id]);
      
      queryClient.setQueryData(['likedAlbums', korisnik?.id], (old: Album[] = []) =>
        old.filter(a => a.id !== albumId)
      );
      
      return { previousData };
    },
    onError: (err, albumId, context) => {
      queryClient.setQueryData(['likedAlbums', korisnik?.id], context?.previousData);
      Alert.alert(t('error'), t('error_removing_favorite'));
    },
    onSuccess: () => {
      Alert.alert(t('success'), t('removed_from_favorites'));
    },
  });

  const unlikePlaylistMutation = useMutation({
    mutationFn: async (playlistId: number) => {
      if (!korisnik?.id) throw new Error('No user ID');
      await apiClient.delete(`/korisnik_playlista/${korisnik.id}/${playlistId}`);
      return playlistId;
    },
    onMutate: async (playlistId) => {
      await queryClient.cancelQueries({ queryKey: ['likedPlaylists', korisnik?.id] });
      const previousData = queryClient.getQueryData(['likedPlaylists', korisnik?.id]);
      
      queryClient.setQueryData(['likedPlaylists', korisnik?.id], (old: Playlista[] = []) =>
        old.filter(p => p.id !== playlistId)
      );
      
      return { previousData };
    },
    onError: (err, playlistId, context) => {
      queryClient.setQueryData(['likedPlaylists', korisnik?.id], context?.previousData);
      Alert.alert(t('error'), t('error_removing_favorite'));
    },
    onSuccess: () => {
      Alert.alert(t('success'), t('removed_from_favorites'));
    },
  });

  const useAlbumSongs = (albumId: number, enabled: boolean = false) => {
    return useQuery({
      queryKey: ['albumSongs', albumId],
      queryFn: async ({ signal }) => {
        const response = await apiClient.get('/pjesme/', { signal });
        return (response.data as Pjesma[])
          .filter(s => s.albumID === albumId && s.odobreno && s.putanjaAudio)
          .sort((a, b) => a.id - b.id);
      },
      enabled,
      staleTime: 15 * 60 * 1000, 
      gcTime: 60 * 60 * 1000, 
      retry: 2,
    });
  };

  const usePlaylistSongs = (playlistId: number, enabled: boolean = false) => {
    return useQuery({
      queryKey: ['playlistSongs', playlistId],
      queryFn: async ({ signal }) => {
        const response = await apiClient.get(`/pjesma_playlista/redoslijed/${playlistId}`, { signal });
        const songIds: number[] = response.data || [];

        if (songIds.length === 0) return [];

        const songs = await loadBatchData<Pjesma>(songIds, 'pjesme', signal);
        return songs.filter(song => song && song.odobreno && song.putanjaAudio);
      },
      enabled,
      staleTime: 15 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 2,
    });
  };

  const handleFilterChange = useCallback((filter: LibraryFilter) => {
    setActiveFilter(filter);
  }, []);

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

  const albumSongsQuery = useAlbumSongs(playingAlbumId || 0, !!playingAlbumId);
  const playlistSongsQuery = usePlaylistSongs(playingPlaylistId || 0, !!playingPlaylistId);

  const handlePlayAlbum = useCallback((album: Album) => {
    setPlayingAlbumId(album.id);
  }, []);

  const handlePlayPlaylist = useCallback((playlist: Playlista) => {
    setPlayingPlaylistId(playlist.id);
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

  const OptimizedImage = React.memo(({ uri, style, ...props }: any) => (
    <Image
      source={{ uri: uri || 'https://via.placeholder.com/60' }}
      style={style}
      cachePolicy="memory-disk"
      priority="high"
      recyclingKey={`${uri}-${Date.now()}`}
      contentFit="cover"
      transition={200}
      {...props}
    />
  ));
  OptimizedImage.displayName = "OptimizedImage";

  const renderArtistItem = useCallback(({ item }: { item: Korisnik }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity 
        style={styles.itemHeader}
        onPress={() => router.replace(`/izvodjac/${item.id}?from=library`)}
      >
        <OptimizedImage
          uri={item.putanjaProfilneSlike}
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
  ), [OptimizedImage, t, router, handleUnfollow]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    playAudio(song);
  }, [playAudio]);

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => {
    console.log('Rendering song item:', {
      id: item.id,
      naziv: item.naziv,
      putanjaSlika: item.putanjaSlika,
      putanjaAudio: item.putanjaAudio,
      korisnik: item.korisnik,
      korisnikID: item.korisnikID
    });
    
    return (
      <View style={styles.itemCard}>
        <TouchableOpacity 
          style={styles.itemHeader}
          onPress={() => router.replace(`/pjesma/${item.id}?from=library`)}
        >
          <OptimizedImage
            uri={item.putanjaSlika}
            style={styles.itemImage}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.naziv || 'Unknown Song'}
            </Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {item.korisnik?.korisnicko_ime || t('unknown_artist')}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.itemActions}>
          {item.putanjaAudio && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePlaySong(item)}
            >
              <MaterialIcons name="play-arrow" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => handleUnlikeSong(item.id)}
          >
            <MaterialIcons name="favorite" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [OptimizedImage, t, router, handlePlaySong, handleUnlikeSong]);

  const renderAlbumItem = useCallback(({ item }: { item: Album }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity 
        style={styles.itemHeader}
        onPress={() => router.replace(`/album/${item.id}?from=library`)}
      >
        <OptimizedImage
          uri={item.putanjaSlika}
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
  ), [OptimizedImage, t, router, handlePlayAlbum, handleUnlikeAlbum]);

  const renderPlaylistItem = useCallback(({ item }: { item: Playlista }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity 
        style={styles.itemHeader}
        onPress={() => router.replace(`/playlista/${item.id}?from=library`)}
      >
        <OptimizedImage
          uri={item.putanjaSlika}
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
  ), [OptimizedImage, t, router, handlePlayPlaylist, handleUnlikePlaylist]);

  const getCurrentQuery = () => {
    switch (activeFilter) {
      case 'prateci': return followingQuery;
      case 'pjesme': return songsQuery;
      case 'albumi': return albumsQuery;
      case 'playliste': return playlistsQuery;
      default: return followingQuery;
    }
  };

  const currentQuery = getCurrentQuery();
  const isLoading = currentQuery.isLoading;
  const isError = currentQuery.isError;
  
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
    const currentData = currentQuery.data || [];

    if (isLoading) {
      return <SkeletonLoader />;
    }

    if (isError) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color="#ff6b6b" style={styles.errorIcon} />
          <Text style={styles.errorTitle}>{t('error_loading_data')}</Text>
          <Text style={styles.errorSubtitle}>{t('check_connection_retry')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => currentQuery.refetch()}
          >
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
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

    const renderItem = () => {
      switch (activeFilter) {
        case 'prateci': return renderArtistItem;
        case 'pjesme': return renderSongItem;
        case 'albumi': return renderAlbumItem;
        case 'playliste': return renderPlaylistItem;
        default: return renderArtistItem;
      }
    };

    return (
      <FlatList
        data={currentData as any}
        keyExtractor={(item, index) => `${activeFilter}-${item.id || `fallback-${index}`}`}
        renderItem={renderItem() as any}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 80, 
          offset: 80 * index,
          index,
        })}
      />
    );
  }, [isLoading, isError, activeFilter, emptyStateConfig, currentQuery, renderArtistItem, renderSongItem, renderAlbumItem, renderPlaylistItem, t]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [activeFilter.replace('e', 'ed'), korisnik?.id] });
  }, [activeFilter, korisnik?.id]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={currentQuery.isFetching && !isLoading}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [currentQuery.isFetching, isLoading, onRefresh]);

  useScreenCleanup();

  if (!korisnik) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header source="library" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('my_library')}</Text>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
            data={filters}
            keyExtractor={(item) => item.key}
            renderItem={renderFilterButton}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews={true}
          />

          {renderContent}
        </View>
      </ScrollView>
    </View>
  );
});

Biblioteka.displayName = "Biblioteka";

export default Biblioteka;

