import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Image } from 'expo-image';
import { Album, Korisnik, Pjesma, Playlista } from '@/types';
import Header from '@/komponente/Header/Header';
import { useAudio } from '@/context/AudioContext';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './Home.styles';
import { styles as lightStyles } from './HomeWhite.styles';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import Loading from '@/komponente/Loading/Loading';

const Home: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/(tabs)', currentRoute: '/(tabs)' });
  const [refreshing, setRefreshing] = useState(false);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;

  const { playAudio, playPlaylist } = useAudio();

  useScreenCleanup();

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackPress();
        return true;
      });

      return () => backHandler.remove();
    }, [handleBackPress])
  );

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

  const getRandomItems = useCallback(<T,>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, []);

  const songsQuery = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pjesme/`);
      const approvedSongs = (response.data || []).filter((s: Pjesma) => Boolean(s.odobreno));
      return getRandomItems(approvedSongs, 20);
    },
    staleTime: 5 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
  });

  const albumsQuery = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/albumi/`);
      const approvedAlbums = (response.data || []).filter((a: Album) => Boolean(a.odobreno));
      return getRandomItems(approvedAlbums, 20);
    },
    staleTime: 5 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
  });

  const playlistsQuery = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/playliste/`);
      const publicPlaylists = (response.data || []).filter((p: Playlista) => Boolean(p.javno));
      return getRandomItems(publicPlaylists, 20);
    },
    staleTime: 5 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
  });

  const artistsQuery = useQuery({
    queryKey: ['artists'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/korisnici/`);
      const activeArtists = (response.data || []).filter((k: Korisnik) =>
        k.rola === 'izvodac' && k.statusKorisnika !== 'suspendovan'
      );
      return getRandomItems(activeArtists, 20);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const allVezeQuery = useQuery({
    queryKey: ['izvodjac_pjesma_all'],
    queryFn: async () => { const r = await axios.get(`${API_BASE}/izvodjac_pjesma/`); return r.data; },
    staleTime: 5 * 60 * 1000,
  });

  const allKorisniciQuery = useQuery({
    queryKey: ['sviKorisnici_all'],
    queryFn: async () => { const r = await axios.get(`${API_BASE}/korisnici/`); return r.data; },
    staleTime: 5 * 60 * 1000,
  });

  // Garancija da su izvučene SAMO odobrene pjesme
  const approvedSongsList = useMemo<Pjesma[]>(() => {
    if (!songsQuery.data) return [];
    return (songsQuery.data as Pjesma[]).filter((s) => Boolean(s.odobreno));
  }, [songsQuery.data]);

  const spotlightSong = useMemo<Pjesma | null>(() => {
    if (approvedSongsList.length === 0) return null;
    return approvedSongsList[0];
  }, [approvedSongsList]);

  const quickPicks = useMemo<Pjesma[]>(() => {
    if (approvedSongsList.length <= 1) return [];
    return approvedSongsList.slice(1, 7);
  }, [approvedSongsList]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['songs'] }),
        queryClient.invalidateQueries({ queryKey: ['albums'] }),
        queryClient.invalidateQueries({ queryKey: ['playlists'] }),
        queryClient.invalidateQueries({ queryKey: ['artists'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      console.warn('Song has no audio file');
      return;
    }

    setActiveSongId(song.id);
    playAudio(song);
  }, [playAudio]);

  const handleNavigateToSong = useCallback((songId: number) => {
    navigateWithHistory(`/pjesma/${songId}?from=home`, `/(tabs)`);
  }, []);

  const handleNavigateToAlbum = useCallback((albumId: number) => {
    navigateWithHistory(`/album/${albumId}?from=home`, `/(tabs)`);
  }, []);

  const handleNavigateToPlaylist = useCallback((playlistaId: number) => {
    navigateWithHistory(`/playlista/${playlistaId}?from=home`, `/(tabs)`);
  }, []);

  const handleNavigateToArtist = useCallback((artistId: string) => {
    navigateWithHistory(`/izvodjac/${artistId}?from=home`, `/(tabs)`);
  }, []);

  const handlePlayAlbum = useCallback(async (album: Album) => {
    try {
      const albumSongs = approvedSongsList.filter(
        (s: Pjesma) => s.albumID === album.id && Boolean(s.putanjaAudio)
      );
      if (albumSongs.length === 0) {
        console.warn('Album has no playable songs');
        return;
      }
      playPlaylist(albumSongs, 0);
    } catch (error) {
      console.error('Failed to play album:', error);
    }
  }, [approvedSongsList, playPlaylist]);

  const handlePlayPlaylist = useCallback(async (playlist: Playlista) => {
    try {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlist.id}`);
      const songIds: number[] = res.data || [];
      if (songIds.length === 0) {
        console.warn('No playable songs in playlist');
        return;
      }
      const songResponses = await Promise.all(songIds.map(id => axios.get(`${API_BASE}/pjesme/${id}`)));
      const playable = songResponses
        .map(r => r.data)
        .filter((s: Pjesma) => s && Boolean(s.putanjaAudio) && Boolean(s.odobreno));
      if (playable.length === 0) {
        console.warn('No playable songs in playlist');
        return;
      }
      playPlaylist(playable, 0);
    } catch (error) {
      console.error('Failed to play playlist:', error);
    }
  }, [playPlaylist]);

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => {
    if (!item.odobreno) return null;

    const veze = allVezeQuery.data?.filter((v: any) => v.pjesmaID === item.id) || [];
    const izvodjaci = veze.map((v: any) => allKorisniciQuery.data?.find((k: any) => k.id === v.izvodjacID)).filter(Boolean);

    return (
      <TouchableOpacity
        style={[activeStyles.card, activeSongId === item.id && activeStyles.activeCard]}
        onPress={() => handleNavigateToSong(item.id)}
        activeOpacity={0.8}
      >
        <View style={activeStyles.cardImageWrap}>
          <Image
            source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/150' }}
            style={activeStyles.cardImage}
            cachePolicy="memory-disk"
          />
          {item.putanjaAudio && (
            <TouchableOpacity
              style={activeStyles.playButton}
              onPress={(e) => {
                e.stopPropagation();
                handlePlaySong(item);
              }}
            >
              <MaterialIcons name="play-arrow" size={22} color={theme === 'light' ? '#fff' : '#000'} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={activeStyles.cardTitle} numberOfLines={1}>{item.naziv}</Text>
        <View style={activeStyles.artistTextContainer}>
          {izvodjaci.length > 0 ? (
            izvodjaci.map((izv: any, idx: number) => (
              <TouchableOpacity key={izv.id} onPress={() => handleNavigateToArtist(izv.id.toString())}>
                <Text style={activeStyles.cardDesc} numberOfLines={1}>
                  {izv.korisnicko_ime}{idx < izvodjaci.length - 1 ? ' & ' : ''}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              onPress={() => { if (item.korisnikID) handleNavigateToArtist(item.korisnikID.toString()); }}
              disabled={!item.korisnikID}
            >
              <Text style={activeStyles.cardDesc} numberOfLines={1}>{item.korisnik?.korisnicko_ime || t('unknown_artist')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [activeSongId, handleNavigateToSong, handlePlaySong, handleNavigateToArtist, t, activeStyles, theme, allVezeQuery.data, allKorisniciQuery.data]);

  const renderAlbumItem = useCallback(({ item }: { item: Album }) => (
    <TouchableOpacity style={activeStyles.card} onPress={() => handleNavigateToAlbum(item.id)} activeOpacity={0.8}>
      <View style={activeStyles.cardImageWrap}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={activeStyles.cardImage}
          cachePolicy="memory-disk"
        />
        <TouchableOpacity
          style={activeStyles.playButton}
          onPress={(e) => { e.stopPropagation(); handlePlayAlbum(item); }}
        >
          <MaterialIcons name="play-arrow" size={22} color={theme === 'light' ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>
      <Text style={activeStyles.cardTitle} numberOfLines={1}>{item.naziv}</Text>
      <TouchableOpacity
        onPress={() => { if (item.korisnikID) handleNavigateToArtist(item.korisnikID); }}
        disabled={!item.korisnikID}
      >
        <Text style={activeStyles.cardDesc} numberOfLines={1}>{item.korisnik?.korisnicko_ime || t('unknown_artist')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [handleNavigateToAlbum, handlePlayAlbum, handleNavigateToArtist, t, activeStyles, theme]);

  const renderPlaylistItem = useCallback(({ item }: { item: Playlista }) => (
    <TouchableOpacity style={activeStyles.card} onPress={() => handleNavigateToPlaylist(item.id)} activeOpacity={0.8}>
      <View style={activeStyles.cardImageWrap}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={activeStyles.cardImage}
          cachePolicy="memory-disk"
        />
        <TouchableOpacity
          style={activeStyles.playButton}
          onPress={(e) => { e.stopPropagation(); handlePlayPlaylist(item); }}
        >
          <MaterialIcons name="play-arrow" size={22} color={theme === 'light' ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>
      <Text style={activeStyles.cardTitle} numberOfLines={1}>{item.naziv}</Text>
      <TouchableOpacity
        onPress={() => { if (item.korisnikID) handleNavigateToArtist(item.korisnikID); }}
        disabled={!item.korisnikID}
      >
        <Text style={activeStyles.cardDesc} numberOfLines={1}>{item.korisnik?.korisnicko_ime || t('unknown_user')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [handleNavigateToPlaylist, handlePlayPlaylist, handleNavigateToArtist, t, activeStyles, theme]);

  const renderArtistItem = useCallback(({ item }: { item: Korisnik }) => (
    <TouchableOpacity style={[activeStyles.card, activeStyles.artistCard]} onPress={() => handleNavigateToArtist(item.id)} activeOpacity={0.8}>
      <View style={activeStyles.cardImageWrap2}>
        <Image
          source={{ uri: item.putanjaProfilneSlike || 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.iconfinder.com%2Fdata%2Ficons%2Fflaticons-solid%2F16%2Fprofile-1-512.png&f=1&nofb=1&ipt=6b148c0994b76fe50e9a2fbb9e360cc3858b81f150251aca12a5ca51d932aca8' }}
          style={activeStyles.cardImage}
          cachePolicy="memory-disk"
        />
      </View>
      <Text style={[activeStyles.cardTitle, { textAlign: 'center' }]} numberOfLines={1}>{item.korisnicko_ime}</Text>
      <Text style={[activeStyles.cardDesc, { textAlign: 'center' }]}>{t('artist') || 'Izvođač'}</Text>
    </TouchableOpacity>
  ), [handleNavigateToArtist, activeStyles, t]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme === 'light' ? '#111' : '#fff'}
    />
  ), [refreshing, onRefresh, theme]);

  const loading = songsQuery.isLoading || albumsQuery.isLoading || playlistsQuery.isLoading || artistsQuery.isLoading;
  const error = songsQuery.error || albumsQuery.error || playlistsQuery.error || artistsQuery.error;

  if (loading) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Header source="home" />
        <Loading />
      </View>
    );
  }

  if (error) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Header source="home" />
        <Text style={activeStyles.loadingText}>{t('connection_error')}</Text>
        <TouchableOpacity onPress={onRefresh} style={{ marginTop: 10 }}>
          <Text style={activeStyles.cardDesc}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={activeStyles.container}>
      <Header source="home" />

      <ScrollView
        style={activeStyles.scrollContainer}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        <View style={activeStyles.content}>
          
          <View style={activeStyles.header}>
            <Text style={activeStyles.headerTitle}>{t('welcome_to_decibel')}</Text>
            <Text style={activeStyles.headerSubtitle}>{t('discover_new_music') || 'Otkrijte novu muziku danas'}</Text>
          </View>

          {spotlightSong && (
            <TouchableOpacity 
              style={activeStyles.heroBanner} 
              activeOpacity={0.9}
              onPress={() => handleNavigateToSong(spotlightSong.id)}
            >
              <View style={activeStyles.heroBadgeWrap}>
                <Text style={activeStyles.heroBadge}>SPOTLIGHT</Text>
              </View>
              <View style={activeStyles.heroContent}>
                <Image
                  source={{ uri: spotlightSong.putanjaSlika || 'https://via.placeholder.com/300' }}
                  style={activeStyles.heroImage}
                  cachePolicy="memory-disk"
                />
                <View style={activeStyles.heroInfo}>
                  <Text style={activeStyles.heroTitle} numberOfLines={1}>{spotlightSong.naziv}</Text>
                  <Text style={activeStyles.heroSub} numberOfLines={1}>
                    {spotlightSong.korisnik?.korisnicko_ime || (spotlightSong as any)?.korisnik_ime || t('unknown_artist')}
                  </Text>
                  <TouchableOpacity
                    style={activeStyles.heroPlayBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handlePlaySong(spotlightSong);
                    }}
                  >
                    <MaterialIcons name="play-arrow" size={20} color={theme === 'light' ? '#fff' : '#000'} />
                    <Text style={activeStyles.heroPlayText}>{t('play') || 'Slušaj'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {quickPicks.length > 0 && (
            <View style={activeStyles.quickSection}>
              <Text style={activeStyles.sectionTitle}>{t('quick_picks') || 'Brze opcije'}</Text>
              <View style={activeStyles.quickGrid}>
                {quickPicks.map((song: Pjesma) => (
                  <TouchableOpacity
                    key={song.id}
                    style={activeStyles.quickCard}
                    onPress={() => handleNavigateToSong(song.id)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: song.putanjaSlika || 'https://via.placeholder.com/100' }}
                      style={activeStyles.quickImage}
                      cachePolicy="memory-disk"
                    />
                    <View style={activeStyles.quickTextWrap}>
                      <Text style={activeStyles.quickTitle} numberOfLines={1}>{song.naziv}</Text>
                      <Text style={activeStyles.quickSub} numberOfLines={1}>{song.korisnik?.korisnicko_ime || t('unknown_artist')}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={activeStyles.section}>
            <View style={activeStyles.sectionHeaderRow}>
              <Text style={activeStyles.sectionTitle}>{t('songs')}</Text>
            </View>
            <FlatList
              data={approvedSongsList}
              renderItem={renderSongItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={activeStyles.horizontalList}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
            />
          </View>

          <View style={activeStyles.section}>
            <View style={activeStyles.sectionHeaderRow}>
              <Text style={activeStyles.sectionTitle}>{t('albums')}</Text>
            </View>
            <FlatList
              data={albumsQuery.data as Album[] || []}
              renderItem={renderAlbumItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={activeStyles.horizontalList}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
            />
          </View>

          <View style={activeStyles.section}>
            <View style={activeStyles.sectionHeaderRow}>
              <Text style={activeStyles.sectionTitle}>{t('playlists')}</Text>
            </View>
            <FlatList
              data={playlistsQuery.data as Playlista[] || []}
              renderItem={renderPlaylistItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={activeStyles.horizontalList}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
            />
          </View>

          <View style={activeStyles.section}>
            <View style={activeStyles.sectionHeaderRow}>
              <Text style={activeStyles.sectionTitle}>{t('artists')}</Text>
            </View>
            <FlatList
              data={artistsQuery.data as Korisnik[] || []}
              renderItem={renderArtistItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={activeStyles.horizontalList}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

Home.displayName = "Home";

export default Home;