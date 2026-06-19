import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,

} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma, Playlista as PlaylistaType } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './Playlista.styles';
import { styles as lightStyles } from './PlaylistaWhtie.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { useBackPress, navigateWithHistory, getRoutePathFromSource } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';
import { useAudio } from '@/context/AudioContext';
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';

const Playlista: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { playAudio, playPlaylist } = useAudio();
  const { playlistaId } = useLocalSearchParams<{ playlistaId: string }>();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<number | null>(null);
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const snapPoints = React.useMemo(() => ['30%', '60%'], []);
  const [korisnikID, setKorisnikID] = useState<string>('');
  const [localSongs, setLocalSongs] = useState<Pjesma[]>([]);
  const [playlistLocked, setPlaylistLocked] = useState(false);
  const [songLikesLocal, setSongLikesLocal] = useState<
  Record<number, boolean>
>({});
const [playlistLikedLocal, setPlaylistLikedLocal] =
  useState<boolean | null>(null);

  const [playlistLikeCountLocal, setPlaylistLikeCountLocal] =
  useState<number | null>(null);
  const { from } = useLocalSearchParams<{ from?: string }>();
  const currentRoute = useMemo(() => playlistaId ? `/playlista/${playlistaId}` : '/playlista/[playlistaId]', [playlistaId]);
  const handleBackPress = useBackPress({
    from,
    defaultRoute: getRoutePathFromSource(from) || currentRoute,
    currentRoute,
  });

  const handleNavigateToArtist = useCallback((artistId: string | undefined) => {
    navigateWithHistory(`/izvodjac/${artistId}?from=playlista`, `/playlista/${playlistaId}`);
  }, [playlistaId]);

  const handleNavigateToSong = useCallback((songId: string | number) => {
    navigateWithHistory(`/pjesma/${songId}?from=playlista`, `/playlista/${playlistaId}`);
  }, [playlistaId]);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;
  const styles = activeStyles;

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('decibel_tema');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadTheme();
    const interval = setInterval(loadTheme, 3000);
    return () => clearInterval(interval);
  }, [loadTheme]);

  const allArtistsQuery = useQuery({
    queryKey: ['izvodjac_pjesma_all'],
    queryFn: async () => (await axios.get(`${API_BASE}/izvodjac_pjesma/`)).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const allUsersQuery = useQuery({
    queryKey: ['sviKorisnici_all'],
    queryFn: async () => (await axios.get(`${API_BASE}/korisnici/`)).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

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

  useEffect(() => {
    setLocalSongs(songsQuery.data || []);
  }, [songsQuery.data]);

  const pjesme = localSongs.length > 0 ? localSongs : (songsQuery.data || []);

const likedSongsQuery = useQuery({
  queryKey: ['song-likes', korisnikID, pjesme.length],
  queryFn: async () => {
    if (!korisnikID) return {};

    const map: Record<number, boolean> = {};

    await Promise.all(
      pjesme.map(async (p) => {
        try {
          const res = await axios.get(
            `${API_BASE}/korisnik_pjesma/${korisnikID}/${p.id}`
          );
          map[p.id] = !!res.data?.liked;
        } catch {
          map[p.id] = false;
        }
      })
    );

    return map;
  },
  enabled: !!korisnikID && pjesme.length > 0,
  staleTime: 30000,
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

    const res = await axios.get(
      `${API_BASE}/korisnik_playlista/${korisnikID}/${playlistaId}`
    );

    return !!res.data?.liked;
  },

  enabled: !!korisnikID && !!playlistaId,
  staleTime: 30000,
});


  useEffect(() => {
    if (playlistLikeQuery.data !== undefined) {
      setPlaylistLikedLocal(playlistLikeQuery.data);
    }
    if (playlistQuery.data?.brojLajkova !== undefined) {
      setPlaylistLikeCountLocal(playlistQuery.data.brojLajkova);
    }
  }, [playlistLikeQuery.data, playlistQuery.data?.brojLajkova]);

 const likeSongMutation = useMutation({
  mutationFn: async ({
    action,
    songId,
    userId,
  }: {
    action: 'like' | 'unlike';
    songId: number;
    userId: string;
  }) => {
    if (action === 'like') {
      await axios.post(`${API_BASE}/korisnik_pjesma/`, {
        korisnikID: userId,
        pjesmaID: songId,
        kreiranDatumVrijeme: new Date().toISOString(),
      });
    } else {
      await axios.delete(
        `${API_BASE}/korisnik_pjesma/${userId}/${songId}`
      );
    }

    return { action, songId, userId };
  },

  onMutate: ({ songId, action }) => {
    setSongLikesLocal(prev => ({
      ...prev,
      [songId]: action === 'like',
    }));
  },

  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({
      queryKey: ['likedSongs', variables.userId],
    });
  },
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
    onMutate: ({ isLiked }) => {
      const nextLiked = !isLiked;
      setPlaylistLikedLocal(nextLiked);
      setPlaylistLikeCountLocal(prev => {
        const base = prev ?? playlistQuery.data?.brojLajkova ?? 0;
        return Math.max(0, base + (nextLiked ? 1 : -1));
      });
    },
    onSuccess: (liked) => {
      queryClient.setQueryData(['playlistLike', playlistaId, korisnikID], liked);
      queryClient.setQueryData(['playlist', playlistaId], (old: any) => ({
        ...old,
        brojLajkova: (old?.brojLajkova || 0) + (liked ? 1 : -1),
      }));
      queryClient.invalidateQueries({ queryKey: ['playlistLike', playlistaId, korisnikID] });
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistaId] });
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

  const reorderSongMutation = useMutation({
    mutationFn: async ({ pjesmaId, prevId }: { pjesmaId: number; prevId: number | null }) => {
      if (!playlistaId) throw new Error('No playlist ID');
      await axios.post(`${API_BASE}/pjesma_playlista/promjeni-redoslijed/`, {
        playlistaID: Number(playlistaId),
        pjesmaID: pjesmaId,
        nova_pozicija_iza_pjesmeID: prevId,
      });
    },
    onSuccess: () => {
    },
    onError: (error) => {
      console.error('Reorder failed, reverting list', error);
      const original = queryClient.getQueryData<any>(['playlistSongs', playlistaId]);
      if (original) {
        setLocalSongs(original);
      }
      setPlaylistLocked(false);
    },

    onSettled: () => {
      setTimeout(() => {
        setPlaylistLocked(false);
      }, 3000);
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
    playAudio(song);
  }, [t, playAudio]);

  const handlePlayPlaylist = useCallback(() => {
    const loadAndPlay = async () => {
      try {
        if (!playlistaId) return;
        const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistaId}`);
        const songIds: number[] = res.data || [];
        if (songIds.length === 0) {
          Alert.alert(t('error'), t('empty_playlist') || 'Playlist is empty');
          return;
        }
        const songResponses = await Promise.all(songIds.map(id => axios.get(`${API_BASE}/pjesme/${id}`)));
        const playable = songResponses.map(r => r.data).filter((p: Pjesma) => p && p.putanjaAudio);
        if (playable.length === 0) {
          Alert.alert(t('error'), t('empty_playlist') || 'Playlist is empty');
          return;
        }
        playPlaylist(playable, 0);
      } catch {
        Alert.alert(t('error'), t('error_playing_playlist'));
      }
    };
    loadAndPlay();
  }, [playlistaId, playPlaylist, t]);

 const handleLikeSong = useCallback((pjesmaId: number) => {
  const likeMap = {
    ...(likedSongsQuery.data || {}),
    ...songLikesLocal,
  };

  const action = likeMap[pjesmaId]
    ? 'unlike'
    : 'like';

  likeSongMutation.mutate({
    action,
    songId: pjesmaId,
    userId: korisnikID,
  });
}, [
  likedSongsQuery.data,
  songLikesLocal,
  korisnikID,
  likeSongMutation,
]);

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
    bottomSheetRef.current?.close();
  }, []);

  useEffect(() => {
    if (showPlaylistModal !== null) {
      bottomSheetRef.current?.expand();
    }
  }, [showPlaylistModal]);



  const onDragEnd = useCallback(({ data, from, to }: { data: Pjesma[]; from: number; to: number }) => {
    if (playlistLocked) return;
    setLocalSongs(data);
    if (from === to) return;
    const moved = data[to];
    const prevId = to === 0 ? null : data[to - 1].id;
    setPlaylistLocked(true);
    reorderSongMutation.mutate({ pjesmaId: moved.id, prevId });
  }, [reorderSongMutation, playlistLocked]);

  const renderDraggableItem = useCallback((params: RenderItemParams<Pjesma> & { getIndex?: () => number | undefined }) => {
    const { item, drag, isActive } = params;
    const likeMap = {
      ...(likedSongsQuery.data || {}),
      ...songLikesLocal,
    };
    const isOwner = playlistQuery.data?.korisnikID === korisnikID;
    const artistConnections = allArtistsQuery.data || [];
    const users = allUsersQuery.data || [];
    const artists = artistConnections
      .filter((v: any) => v.pjesmaID === item.id)
      .map((v: any) => users.find((u: any) => u.id === v.izvodjacID))
      .filter(Boolean);
    return (
      <View style={[styles.songItem, isActive && styles.draggingSong]}>
        <View style={styles.songHeader}>
          {isOwner && (
            <TouchableOpacity onLongPress={drag} delayLongPress={150} style={styles.dragHandle}>
              <MaterialIcons name="drag-handle" size={24} color="#b3b3b3" />
            </TouchableOpacity>
          )}
          <Image
            source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/50' }}
            style={styles.songImage}
          />
          <View style={styles.songInfo}>
            <TouchableOpacity onPress={() => handleNavigateToSong(item.id)}>
              <Text style={styles.songTitle} numberOfLines={1}>{item.naziv}</Text>
            </TouchableOpacity>
            {artists.length > 0 && (
              <Text style={styles.songArtist} numberOfLines={1}>
                {artists.map((a: any, idx: number) => (
                  <TouchableOpacity key={a.id} onPress={() => handleNavigateToArtist(a.id)}>
                    <Text style={styles.songArtist} numberOfLines={1}>{a.korisnicko_ime || a.ime || 'Artist'}{idx < artists.length - 1 ? ' & ' : ''}</Text>
                  </TouchableOpacity>
                ))}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.songActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handlePlaySong(item)}>
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, likeMap[item.id] && styles.actionButtonLiked]} onPress={() => handleLikeSong(item.id)}>
            <MaterialIcons name={likeMap[item.id] ? 'favorite' : 'favorite-border'} size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowPlaylistModal(item.id)}>
            <MaterialIcons name="playlist-add" size={20} color="#fff" />
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonRemove]} onPress={() => handleRemoveSong(item.id)}>
              <MaterialIcons name="delete" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [likedSongsQuery.data, songLikesLocal, playlistQuery.data?.korisnikID, korisnikID, allArtistsQuery.data, allUsersQuery.data, styles, handlePlaySong, handleLikeSong, handleRemoveSong, handleNavigateToArtist, handleNavigateToSong]);



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
  const likePlaylist =
  playlistLikedLocal ??
  (playlistLikeQuery.data || false);

const likeCount =
  playlistLikeCountLocal ??
  (playlista?.brojLajkova || 0);

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
        <Tabs currentRoute="playlista/[playlistaId]" />
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
      <DraggableFlatList
        data={pjesme}
        keyExtractor={(item: Pjesma) => item.id.toString()}
        renderItem={renderDraggableItem}
        onDragEnd={onDragEnd}
        activationDistance={10}
        refreshControl={refreshControl}
        contentContainerStyle={styles.scrollContainer}
        ListHeaderComponent={
          <View style={styles.content}>
            <View style={styles.playlistMain}>
              <View style={styles.playlistImageWrap}>
                <Image
                  source={{ uri: playlista.putanjaSlika || 'https://via.placeholder.com/300' }}
                  style={styles.playlistImage}
                  contentFit="cover"
                />
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.playButton} onPress={handlePlayPlaylist}>
                    <MaterialIcons name="play-arrow" size={32} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.likeButton, likePlaylist && styles.likeButtonLiked]}
                    onPress={handleLikeThisPlaylist}
                  >
                    <MaterialIcons name={likePlaylist ? 'favorite' : 'favorite-border'} size={24} color="#fff" />
                    <Text style={styles.likeCount}>{likeCount}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistTitle}>{playlista.naziv}</Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>{t('songs_in_playlist') || 'Songs in Playlist'}</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.noSongs}>{t('no_songs_in_playlist') || 'No songs in this playlist'}</Text>
        }
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={showPlaylistModal !== null ? 0 : -1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        onClose={handleModalClose}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>
            {t('add_to_playlist') || 'Add to Playlist'}
          </Text>
          <BottomSheetFlatList
            data={filteredPlaylists as PlaylistaType[]}
            keyExtractor={(item: PlaylistaType) => item.id.toString()}
            renderItem={({ item }: { item: PlaylistaType }) => (
              <TouchableOpacity
                style={styles.playlistItem}
                onPress={() => showPlaylistModal && handleAddToPlaylist(showPlaylistModal, item.id)}
              >
                <View style={styles.playlistItemContent}>
                  <Image
                    source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/40' }}
                    style={styles.playlistItemImage}
                  />
                  <Text style={styles.playlistItemText}>{item.naziv}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#b3b3b3" />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.bottomSheetList}
          />
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={handleModalClose}
          >
            <Text style={styles.modalCloseBtnText}>{t('close')}</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      <Tabs currentRoute="playlista/[playlistaId]" />
    </View>
  );
});

Playlista.displayName = "Playlista";

export default Playlista;
