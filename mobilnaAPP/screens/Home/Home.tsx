import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
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

const Home: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [playingPlaylistId, setPlayingPlaylistId] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;

  const { playAudio, playPlaylist } = useAudio();

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

  const getRandomItems = useCallback(<T,>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, []);

  const songsQuery = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pjesme/`);
      const approvedSongs = response.data.filter((s: Pjesma) => s.odobreno);
      return getRandomItems(approvedSongs, 20);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const albumsQuery = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/albumi/`);
      const approvedAlbums = response.data.filter((a: Album) => a.odobreno);
      return getRandomItems(approvedAlbums, 20);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,

  });

  const playlistsQuery = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/playliste/`);
      const publicPlaylists = response.data.filter((p: Playlista) => p.javno);
      return getRandomItems(publicPlaylists, 20);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,

  });

  const artistsQuery = useQuery({
    queryKey: ['artists'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/korisnici/`);
      const activeArtists = response.data.filter((k: Korisnik) =>
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

  const playlistSongsQuery = useQuery({
    queryKey: ['playlistSongs', playingPlaylistId],
    queryFn: async () => {
      if (!playingPlaylistId) return [];

      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playingPlaylistId}`);
      const songIds: number[] = res.data || [];

      if (songIds.length === 0) return [];

      const songResponses = await Promise.all(
        songIds.map(id => axios.get(`${API_BASE}/pjesme/${id}`))
      );
      return songResponses
        .map(r => r.data)
        .filter(s => s && s.putanjaAudio && s.odobreno);
    },
    enabled: !!playingPlaylistId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,

  });

  useEffect(() => {
    if (playlistSongsQuery.data && playingPlaylistId) {
      if (playlistSongsQuery.data.length === 0) {
        console.warn('No playable songs in playlist');
      } else {
        playPlaylist(playlistSongsQuery.data, 0);
      }
      setPlayingPlaylistId(null);
    }
    if (playlistSongsQuery.error && playingPlaylistId) {
      console.error('Failed to play playlist:', playlistSongsQuery.error);
      setPlayingPlaylistId(null);
    }
  }, [playlistSongsQuery.data, playlistSongsQuery.error, playingPlaylistId, playPlaylist]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['songs'] }),
      queryClient.invalidateQueries({ queryKey: ['albums'] }),
      queryClient.invalidateQueries({ queryKey: ['playlists'] }),
      queryClient.invalidateQueries({ queryKey: ['artists'] }),
    ]).finally(() => {
      setRefreshing(false);
    });
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
    router.replace(`/pjesma/${songId}?from=home`);
  }, [router]);

  const handleNavigateToAlbum = useCallback((albumId: number) => {
    router.replace(`/album/${albumId}?from=home`);
  }, [router]);

  const handleNavigateToPlaylist = useCallback((playlistaId: number) => {
    router.replace(`/playlista/${playlistaId}?from=home`);
  }, [router]);

  const handleNavigateToArtist = useCallback((artistId: string) => {
    router.replace(`/izvodjac/${artistId}?from=home`);
  }, [router]);

  const handlePlayAlbum = useCallback(async (album: Album) => {
    try {
      const albumSongs = songsQuery.data?.filter(
        (s: any): s is Pjesma =>
          (s as Pjesma).albumID === album.id &&
          !!(s as Pjesma).putanjaAudio &&
          !!(s as Pjesma).odobreno
      ) || [];
      if (albumSongs.length === 0) {
        console.warn('Album has no playable songs');
        return;
      }
      playPlaylist(albumSongs, 0);
    } catch (error) {
      console.error('Failed to play album:', error);
    }
  }, [songsQuery.data, playPlaylist]);

  const handlePlayPlaylist = useCallback((playlist: Playlista) => {
    setPlayingPlaylistId(playlist.id);
  }, []);

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => {
    if (!item.odobreno) return null;

    const veze = allVezeQuery.data?.filter((v: any) => v.pjesmaID === item.id) || [];
    const izvodjaci = veze.map((v: any) => allKorisniciQuery.data?.find((k: any) => k.id === v.izvodjacID)).filter(Boolean);

    return (
      <TouchableOpacity
        style={[activeStyles.card, activeSongId === item.id && activeStyles.activeCard]}
        onPress={() => handleNavigateToSong(item.id)}
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
              <MaterialIcons name="play-arrow" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={activeStyles.cardTitle} numberOfLines={1}>{item.naziv}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', width: '100%', paddingBottom: 5, marginTop: 2 }}>
          {izvodjaci.length > 0 ? (
            izvodjaci.map((izv: any, idx: number) => (
              <TouchableOpacity key={izv.id} onPress={() => handleNavigateToArtist(izv.id.toString())}>
                <Text style={[activeStyles.cardDesc, { textAlign: 'center' }]}>
                  {izv.korisnicko_ime}{idx < izvodjaci.length - 1 ? ' & ' : ''}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              onPress={() => { if (item.korisnikID) handleNavigateToArtist(item.korisnikID.toString()); }}
              disabled={!item.korisnikID}
            >
              <Text style={[activeStyles.cardDesc, { textAlign: 'center' }]}>{item.korisnik?.korisnicko_ime || t('unknown_artist')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [activeSongId, handleNavigateToSong, handlePlaySong, handleNavigateToArtist, t, activeStyles, allVezeQuery.data, allKorisniciQuery.data]);

  const renderAlbumItem = useCallback(({ item }: { item: Album }) => (
    <TouchableOpacity style={activeStyles.card} onPress={() => handleNavigateToAlbum(item.id)}>
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
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
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
  ), [handleNavigateToAlbum, handlePlayAlbum, handleNavigateToArtist, t, activeStyles]);

  const renderPlaylistItem = useCallback(({ item }: { item: Playlista }) => (
    <TouchableOpacity style={activeStyles.card} onPress={() => handleNavigateToPlaylist(item.id)}>
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
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
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
  ), [handleNavigateToPlaylist, handlePlayPlaylist, handleNavigateToArtist, t, activeStyles]);

  const renderArtistItem = useCallback(({ item }: { item: Korisnik }) => (
    <TouchableOpacity style={activeStyles.card} onPress={() => handleNavigateToArtist(item.id)}>
      <View style={activeStyles.cardImageWrap2}>
        <Image
          source={{ uri: item.putanjaProfilneSlike || 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.iconfinder.com%2Fdata%2Ficons%2Fflaticons-solid%2F16%2Fprofile-1-512.png&f=1&nofb=1&ipt=6b148c0994b76fe50e9a2fbb9e360cc3858b81f150251aca12a5ca51d932aca8' }}
          style={activeStyles.cardImage}
          cachePolicy="memory-disk"
        />
      </View>
      <Text style={activeStyles.cardTitle} numberOfLines={1}>{item.korisnicko_ime}</Text>
    </TouchableOpacity>
  ), [handleNavigateToArtist, activeStyles]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95ff"
    />
  ), [refreshing, onRefresh]);

  const loading = songsQuery.isLoading || albumsQuery.isLoading || playlistsQuery.isLoading || artistsQuery.isLoading;
  const error = songsQuery.error || albumsQuery.error || playlistsQuery.error || artistsQuery.error;

  if (loading) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Header source="home" />
        <Text style={activeStyles.loadingText}>{t('loading')}</Text>
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
      >
        <View style={activeStyles.content}>
          <View style={activeStyles.header}>
            <Text style={activeStyles.headerTitle}>{t('welcome_to_decibel')}</Text>
          </View>

          <View style={activeStyles.section}>
            <Text style={activeStyles.sectionTitle}>{t('songs')}</Text>
            <FlatList
              data={(songsQuery.data as Pjesma[]) || []}
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
            <Text style={activeStyles.sectionTitle}>{t('albums')}</Text>
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
            <Text style={activeStyles.sectionTitle}>{t('playlists')}</Text>
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
            <Text style={activeStyles.sectionTitle}>{t('artists')}</Text>
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


