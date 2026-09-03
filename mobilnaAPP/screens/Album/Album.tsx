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
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Album, Pjesma, Playlista, KorisnikPjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './Album.styles';
import { styles as lightStyles } from './AlbumWhite.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress, getRoutePathFromSource } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';
import { useAudio } from '@/context/AudioContext';
import Loading from '@/komponente/Loading/Loading';


const AlbumScreen: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { playAudio, playPlaylist } = useAudio();
  const { albumId } = useLocalSearchParams();
  const [selectedSong, setSelectedSong] = useState<Pjesma | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const styles = theme === 'light' ? lightStyles : darkStyles;
  const { from } = useLocalSearchParams<{ from?: string }>();
  const currentRoute = useMemo(() => albumId ? `/album/${albumId}` : '/album/[albumId]', [albumId]);
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);
  
const handleBackPress = useBackPress({
    from,
    defaultRoute: getRoutePathFromSource(from) || '/(tabs)',
    currentRoute,
  });

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

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('decibel_tema');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch { }
  }, []);

  useEffect(() => { loadTheme(); }, [loadTheme]);
  useEffect(() => {
    const interval = setInterval(loadTheme, 3000);
    return () => clearInterval(interval);
  }, [loadTheme]);

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
      const playlistsRes = await axios.get(`${API_BASE}/playliste/korisnik/${userData.id}`);
      return playlistsRes.data || [];
    },
    enabled: !!userData?.id,
    staleTime: 2 * 60 * 1000, 
  });

    const [albumLikedLocal, setAlbumLikedLocal] = useState<boolean | null>(null);
    const [songLikesLocal, setSongLikesLocal] = useState<Record<number, boolean>>({});
    const [albumLikeCountLocal, setAlbumLikeCountLocal] = useState<number | null>(null);

  const { data: albumLiked = false } = useQuery({
    queryKey: ['album-like', albumId, userData?.id],
    queryFn: async () => {
      if (!albumId || !userData?.id) return false;
      const res = await axios.get(`${API_BASE}/korisnik_album/${userData.id}/${albumId}`);
      return !!res.data?.liked;
    },
    enabled: !!albumId && !!userData?.id,
    staleTime: 30 * 1000, 
  });
  const albumLikedValue = albumLikedLocal ?? albumLiked;
  const albumLikeCountValue = albumLikeCountLocal ?? album?.brojLajkova ?? 0;

  const { data: songLikes = {} } = useQuery({
    queryKey: ['song-likes', userData?.id],
    queryFn: async () => {
      if (!userData?.id) return {};
      const map: { [pjesmaId: number]: boolean } = {};
      await Promise.all(
        songs.map(async (p: Pjesma) => {
          try {
            const res = await axios.get(`${API_BASE}/korisnik_pjesma/${userData.id}/${p.id}`);
            map[p.id] = !!res.data?.liked;
          } catch {
            map[p.id] = false;
          }
        })
      );
      return map;
    },
    enabled: !!userData?.id && songs.length > 0,
    staleTime: 30 * 1000, 
  });
  const songLikesValue = useMemo(() => ({ ...songLikes, ...songLikesLocal }), [songLikes, songLikesLocal]);

  const { data: allVeze = [] } = useQuery({
    queryKey: ['izvodjac_pjesma_all'],
    queryFn: async () => (await axios.get(`${API_BASE}/izvodjac_pjesma/`)).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['sviKorisnici_all'],
    queryFn: async () => (await axios.get(`${API_BASE}/korisnici/`)).data ?? [],
    staleTime: 5 * 60 * 1000,
  });



  const albumLikeMutation = useMutation({
    mutationFn: async ({ action, albumId, userId }: { action: 'like' | 'unlike', albumId: string, userId: string }) => {
      if (!userId) throw new Error('No user ID');
      if (action === 'like') {
        await axios.post(`${API_BASE}/korisnik_album/`, {
          korisnikID: userId,
          albumID: Number(albumId),
          kreiranDatumVrijeme: new Date().toISOString(),
        });
      } else {
        await axios.delete(`${API_BASE}/korisnik_album/${userId}/${albumId}`);
      }
      return { action, albumId, userId };
    },
    onMutate: ({ action }) => {
      setAlbumLikedLocal(action === 'like');
      setAlbumLikeCountLocal(prev => {
        const base = prev ?? album?.brojLajkova ?? 0;
        return Math.max(0, base + (action === 'like' ? 1 : -1));
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['album-like', variables.albumId, variables.userId] });
      Alert.alert(
        t('success'),
        variables.action === 'like' ? t('added_to_favorites') : t('removed_from_favorites')
      );
    },
    onError: (error) => {
      console.warn('Album like error:', error);
    },
  });

  const songLikeMutation = useMutation({
    mutationFn: async ({ action, songId, userId }: { action: 'like' | 'unlike', songId: number, userId: string }) => {
      if (!userId) throw new Error('No user ID');
      if (action === 'like') {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID: userId,
          pjesmaID: songId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
      } else {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${userId}/${songId}`);
      }
      return { action, songId, userId };
    },
    onMutate: ({ songId, action }) => {
      setSongLikesLocal(prev => ({ ...prev, [songId]: action === 'like' }));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['song-likes', variables.userId] });
      Alert.alert(
        t('success'),
        variables.action === 'like' ? t('added_to_favorites') : t('removed_from_favorites')
      );
    },
    onError: (error) => {
      console.warn('Song like error:', error);
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
      setSelectedSong(null);
      Alert.alert(t('success'), t('song_added_to_playlist') || 'Song added to playlist!');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.detail || t('error_adding_to_playlist') || 'Error adding song to playlist';
      Alert.alert(t('error'), errorMsg);
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

    playAudio(song);

    
    console.log('Playing song:', song.naziv);
  }, [playAudio, t]);

  const handlePlayAlbum = useCallback(() => {
    const albumSongs = songs.filter((s: Pjesma) => s.putanjaAudio);
    if (albumSongs.length === 0) {
      Alert.alert(t('error'), t('no_songs_in_album') || 'No songs in this album');
      return;
    }
    playPlaylist(albumSongs, 0);
  }, [songs, playPlaylist, t]);

  const handleLikeAlbum = useCallback(async () => {
    if (!album || !userData?.id) return;
    
    const action = albumLikedValue ? 'unlike' : 'like';
    albumLikeMutation.mutate({ action, albumId: String(album.id), userId: userData.id });
  }, [album, userData, albumLikedValue, albumLikeMutation]);

  const handleLikeSong = useCallback(async (songId: number) => {
    if (!userData?.id) return;
    
    const action = songLikesValue[songId] ? 'unlike' : 'like';
    songLikeMutation.mutate({ action, songId, userId: userData.id });
  }, [userData, songLikesValue, songLikeMutation]);



  const handleNavigateToArtist = useCallback((artistId: string | undefined) => {
    navigateWithHistory(`/izvodjac/${artistId}?from=album`, `/album/${albumId}`);
  }, [albumId]);

  const handleNavigateToSong = useCallback((songId: string | number) => {
    navigateWithHistory(`/pjesma/${songId}?from=album`, `/album/${albumId}`);
  }, [albumId]);

  const handleSelectPlaylist = useCallback(async (playlistId: number) => {
    if (!selectedSong) return;
    
    addToPlaylistMutation.mutate({ songId: selectedSong.id, playlistId });
  }, [selectedSong, addToPlaylistMutation]);

  const handleOpenPlaylistSheet = useCallback((song: Pjesma) => {
    setSelectedSong(song);
    bottomSheetRef.current?.expand();
  }, []);


  const renderSongItem = useCallback(({ item, index }: { item: Pjesma; index: number }) => (
    <View style={styles.songCard}>
      <View style={styles.songHeader}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/50' }}
          style={styles.songImage}
        />
        <View style={styles.songInfo}>
          <TouchableOpacity onPress={() => handleNavigateToSong(item.id)}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {item.naziv}
            </Text>
          </TouchableOpacity>
          <View style={styles.songArtistRow}>
            {(
              allVeze
                .filter((v: any) => String(v.pjesmaID) === String(item.id))
                .map((v: any) => allUsers.find((u: any) => u.id === v.izvodjacID))
                .filter(Boolean) as any[]
            ).length > 0 ? (
              (allVeze
                .filter((v: any) => String(v.pjesmaID) === String(item.id))
                .map((v: any) => allUsers.find((u: any) => u.id === v.izvodjacID))
                .filter(Boolean) as any[]).map((izv: any, idx: number, arr: any[]) => (
                <TouchableOpacity key={izv.id} onPress={() => handleNavigateToArtist(izv.id)}>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {izv.korisnicko_ime}{idx < arr.length - 1 ? ' & ' : ''}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity onPress={() => handleNavigateToArtist(item.korisnik?.id)}>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {item.korisnik?.korisnicko_ime || t('unknown_artist')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.songActionsHeader}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlaySong(item)}
          >
            <MaterialIcons name="play-arrow" size={20} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              songLikesValue[item.id] && styles.actionButtonLiked
            ]}
            onPress={() => handleLikeSong(item.id)}
          >
            <MaterialIcons
              name={songLikesValue[item.id] ? "favorite" : "favorite-border"}
              size={18}
              color="black"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleOpenPlaylistSheet(item)}
          >
            <MaterialIcons name="playlist-add" size={20} color="black" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [styles.songCard, styles.songHeader, styles.songImage, styles.songInfo, styles.songTitle, styles.songArtistRow, styles.songArtist, styles.songActionsHeader, styles.actionButton, styles.actionButtonLiked, allVeze, t, songLikesValue, handleNavigateToSong, allUsers, handleNavigateToArtist, handlePlaySong, handleLikeSong, handleOpenPlaylistSheet]);



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
        <Back 
          title={t('loading_album') || 'Loading Album...'}
          onBackPress={handleBackPress} 
           onProfilePress={() => navigateWithHistory(`/edit-profile?from=album/${albumId}`, `/album/${albumId}`)}
                          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Loading />
        <Tabs currentRoute={currentRoute} />
      </View>
    );
  }

  if (!album) {
    return (
      <View style={styles.notFoundContainer}>
         <Back 
        title={t('album_not_found') || 'Album Not Found'}
        onBackPress={handleBackPress} 
        onProfilePress={() => navigateWithHistory(`/edit-profile?from=album/${albumId}`, `/album/${albumId}`)}
                          source={from}
                />
      
        <MaterialIcons name="album" size={64} color="#666" />
        <Text style={styles.notFoundText}>
          {t('album_not_found') || 'Album not found'}
        </Text>
        <Tabs currentRoute={currentRoute}/>
      </View>
    );
  }

  return (
    <View style={styles.container}>
       <Back 
        title={album.naziv}
        onBackPress={handleBackPress} 
         onProfilePress={() => navigateWithHistory(`/edit-profile?from=album/${albumId}`, `/album/${albumId}`)}
                          source={from}
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
                  <MaterialIcons name="play-arrow" size={28} color="black" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.likeButton, albumLikedValue && styles.likeButtonLiked]} 
                  onPress={handleLikeAlbum}
                >
                  <MaterialIcons 
                    name={albumLikedValue ? "favorite" : "favorite-border"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.likeCount}>{albumLikeCountValue}</Text>
                </TouchableOpacity>
                
                
              </View>
            </View>
            
            <View style={styles.albumInfo}>
              <Text style={styles.albumTitle} numberOfLines={2}>
                {album?.naziv}
              </Text>
             
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
              <FlatList<Pjesma>
                data={songs}
                renderItem={renderSongItem}
                keyExtractor={(item: Pjesma) => item.id.toString()}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>{t('add_to_playlist') || 'Add to Playlist'}</Text>
          <BottomSheetFlatList
            data={playlists}
            keyExtractor={(item: Playlista) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.playlistItem} onPress={() => handleSelectPlaylist(item.id)}>
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
        </BottomSheetView>
      </BottomSheet>

      <Tabs currentRoute={currentRoute}/>
    </View>
  );
});

AlbumScreen.displayName = "AlbumScreen";

export default AlbumScreen;

