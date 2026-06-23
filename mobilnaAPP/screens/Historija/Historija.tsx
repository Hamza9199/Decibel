import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Pjesma, HistorijaSlusanja, Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './Historija.styles';
import { styles as lightStyles } from './HistorijaWhite.styles';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { router, useLocalSearchParams } from 'expo-router';
import Back from '@/komponente/Back/Back';
import { useAudio } from '@/context/AudioContext';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';



const Historija: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [korisnikID, setKorisnikID] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/history', currentRoute: '/history' });
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);

    const { playAudio } = useAudio();
  

  useScreenCleanup();

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('decibel_tema');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTheme(); }, [loadTheme]);
  useEffect(() => {
    const interval = setInterval(loadTheme, 3000);
    return () => clearInterval(interval);
  }, [loadTheme]);


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

  const historyQuery = useQuery({
    queryKey: ['history', korisnikID],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/historija/`);
      const allHistory: HistorijaSlusanja[] = response.data || [];
      
      return allHistory
        .filter((h) => h.korisnikID === korisnikID)
        .sort((a, b) => 
          new Date(b.kreiranDatumVrijeme || '').getTime() - 
          new Date(a.kreiranDatumVrijeme || '').getTime()
        );
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, 
  });

  const songsQuery = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pjesme/`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, 
  });

  const playlistsQuery = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/playliste/`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, 
  });

  const connectionsQuery = useQuery({
    queryKey: ['artistConnections'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
      return res.data ?? [];
    },
      staleTime: 0,
    });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/korisnici/`);
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const artistsMap = useMemo(() => {
    if (!connectionsQuery.data || !usersQuery.data) return {} as Record<number, { id: string; korisnicko_ime: string }[]>;
    const map: Record<number, { id: string; korisnicko_ime: string }[]> = {};
    connectionsQuery.data.forEach((c: any) => {
      const songId = c.pjesmaID;
      const user = usersQuery.data.find((u: any) => u.id === c.izvodjacID);
      if (user) {
        if (!map[songId]) map[songId] = [];
        map[songId].push({ id: user.id, korisnicko_ime: user.korisnicko_ime });
      }
    });
    return map;
  }, [connectionsQuery.data, usersQuery.data]);

  const [likedSongs, setLikedSongs] = useState<Record<number, boolean>>({});

  const likeMutation = useMutation({
    mutationFn: async ({ songId, isLiked }: { songId: number; isLiked: boolean }) => {
      if (!korisnikID) throw new Error('No user ID');
      if (isLiked) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${songId}`);
        return { songId, liked: false };
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID,
          pjesmaID: songId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        return { songId, liked: true };
      }
    },
    onMutate: ({ songId, isLiked }: { songId: number; isLiked: boolean }) => {
      setLikedSongs((prev) => ({
        ...prev,
        [songId]: !isLiked,
      }));
    },
    onSuccess: ({ songId, liked }) => {
      setLikedSongs((prev) => ({
        ...prev,
        [songId]: liked,
      }));
      Alert.alert(
        t('success'),
        liked ? t('added_to_favorites') : t('removed_from_favorites')
      );
    }
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ songId, playlistId }: { songId: number; playlistId: number }) => {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID: songId,
        playlistaID: playlistId,
      });
      return { songId, playlistId };
    },
    onSuccess: () => {
      setSelectedSongId(null);
      Alert.alert(t('success'), t('song_added_to_playlist'));
    },
    onError: (error) => {
      console.error('Error adding song to playlist:', error);
      setSelectedSongId(null);
      Alert.alert(t('error'), t('error_adding_to_playlist'));
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['history', korisnikID] }),
      queryClient.invalidateQueries({ queryKey: ['songs'] }),
      queryClient.invalidateQueries({ queryKey: ['playlists'] }),
      queryClient.invalidateQueries({ queryKey: ['likes', korisnikID] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [korisnikID]);

  const handleLikeSong = useCallback((songId: number) => {
    const isLiked = likedSongs[songId] || false;
    likeMutation.mutate({ songId, isLiked });
  }, [likedSongs, likeMutation]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file'));
      return;
    }

    playAudio(song);
    
    console.log('Playing song:', song.naziv);
  }, [t, playAudio]);

  const handleAddToPlaylist = useCallback((songId: number, playlistId: number) => {
    addToPlaylistMutation.mutate({ songId, playlistId });
    bottomSheetRef.current?.close();
  }, [addToPlaylistMutation]);

  const handleOpenPlaylistSheet = useCallback((songId: number) => {
    setSelectedSongId(songId);
    bottomSheetRef.current?.expand();
  }, []);




  const historySongs = useMemo(() => {
    if (!historyQuery.data || !songsQuery.data) return [];
    
    return historyQuery.data
      .map((h) => ({
        ...h,
        song: songsQuery.data.find((s: Pjesma) => s.id === h.pjesmaID),
      }))
      .filter((h) => h.song && h.song.odobreno);
  }, [historyQuery.data, songsQuery.data]);

  useEffect(() => {
    const loadLiked = async () => {
      if (!korisnikID || historySongs.length === 0) {
        setLikedSongs({});
        return;
      }
      const result: Record<number, boolean> = {};
      await Promise.all(
        historySongs.map(async (h) => {
          try {
            const res = await axios.get(
              `${API_BASE}/korisnik_pjesma/${korisnikID}/${h.pjesmaID}`
            );
            result[h.pjesmaID] = !!res.data.liked;
          } catch {
            result[h.pjesmaID] = false;
          }
        })
      );
      setLikedSongs(result);
    };
    loadLiked();
  }, [korisnikID, historySongs]);

  const activeStyles = theme === 'light' ? lightStyles : darkStyles;

  const handleNavigateToSong = useCallback((songId: number) => {
    navigateWithHistory(`/pjesma/${songId}?from=history`, '/history');
  }, []);

  const handleNavigateToArtist = useCallback((artistId: string) => {
    navigateWithHistory(`/izvodjac/${artistId}?from=history`, '/history');
  }, []);

  const renderHistoryItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <View style={activeStyles.songCard}>
      <View style={activeStyles.songHeader}>
        <Image
          source={{ uri: item.song?.putanjaSlika || 'https://via.placeholder.com/50' }}
          style={activeStyles.songImage}
        />
        
        <View style={activeStyles.songInfo}>
          <TouchableOpacity onPress={() => handleNavigateToSong(item.song?.id)}>
            <Text style={activeStyles.songTitle} numberOfLines={1}>
              {item.song?.naziv}
            </Text>
          </TouchableOpacity>
          <View style={activeStyles.songArtistRow}>
            {(
              artistsMap[item.song?.id || 0] ||
              [{ korisnicko_ime: item.song?.korisnik?.korisnicko_ime }]
            )
              .map((a, idx, arr) => (
                <TouchableOpacity key={a.korisnicko_ime} onPress={() => handleNavigateToArtist(a.id)}>
                  <Text style={activeStyles.songArtist}>{a.korisnicko_ime}{idx < arr.length - 1 ? ' & ' : ''}</Text>
                </TouchableOpacity>
              ))
              .filter(Boolean)
            }
          </View>
        </View>
        <View style={activeStyles.songActionsHeader}>
          <TouchableOpacity
            style={activeStyles.actionButton}
            onPress={() => handlePlaySong(item.song)}
          >
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              activeStyles.actionButton,
              likedSongs[item.pjesmaID] && activeStyles.actionButtonLiked
            ]}
            onPress={() => handleLikeSong(item.pjesmaID)}
          >
            <MaterialIcons 
              name={likedSongs[item.pjesmaID] ? "favorite" : "favorite-border"} 
              size={18} 
              color="#fff" 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={activeStyles.actionButton}
            onPress={() => handleOpenPlaylistSheet(item.pjesmaID)}
          >
            <MaterialIcons name="playlist-add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [handlePlaySong, handleLikeSong, likedSongs, handleOpenPlaylistSheet, artistsMap, activeStyles, handleNavigateToArtist, handleNavigateToSong]);

  const renderPlaylistItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
  style={activeStyles.playlistItem}
      onPress={() => selectedSongId && handleAddToPlaylist(selectedSongId, item.id)}
    >
  <View style={activeStyles.playlistItemContent}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/40' }}
          style={activeStyles.playlistItemImage}
        />
  <Text style={activeStyles.playlistItemText}>{item.naziv}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#b3b3b3" />
    </TouchableOpacity>
  ), [selectedSongId, handleAddToPlaylist, activeStyles]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = historyQuery.isLoading || songsQuery.isLoading || playlistsQuery.isLoading;

  if (loading) {
    return (
    <View style={activeStyles.loadingContainer}>
        <Back 
          title={t('history') || 'History'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile?from=/history', '/history')}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
  <Text style={activeStyles.loadingText}>{t('loading')}</Text>
        <Tabs currentRoute="history" />
      </View>

    );
  }

  return (
  <View style={activeStyles.container}>
      <Back
        title={t('history') || 'History'}
        onBackPress={handleBackPress}
        onProfilePress={() => navigateWithHistory('/edit-profile?from=/history', '/history')}
                source={from}
      />
  <ScrollView
  contentContainerStyle={activeStyles.scrollContainer}
        refreshControl={refreshControl}
      >
          <View style={activeStyles.content}>
            <Text style={activeStyles.title}>{t('history')}</Text>
          
          {historySongs.length === 0 ? (
            <Text style={activeStyles.noSongs}>
              {t('no_history') || 'No listening history'}
            </Text>
          ) : (
            <FlatList
              data={historySongs}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

  <BottomSheet
  ref={bottomSheetRef}
  index={-1}
  snapPoints={snapPoints}
  enablePanDownToClose
  backgroundStyle={activeStyles.bottomSheetBackground}
  handleIndicatorStyle={activeStyles.bottomSheetIndicator}
        style={{ zIndex: 1000, elevation: 1000 }}
      >
  <BottomSheetView style={activeStyles.bottomSheetContent}>
          <Text style={activeStyles.bottomSheetTitle}>
            {t('add_to_playlist') || 'Add to Playlist'}
          </Text>
          <BottomSheetFlatList
            data={playlistsQuery.data || []}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPlaylistItem}
            contentContainerStyle={activeStyles.bottomSheetList}
          />
        </BottomSheetView>
      </BottomSheet>

  <Tabs currentRoute="history" />
    </View>
  );
});

Historija.displayName = "Historija";

export default Historija;