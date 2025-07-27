import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  Alert,
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
import { styles } from './Home.styles';

const Home: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [songs, setSongs] = useState<Pjesma[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [artists, setArtists] = useState<Korisnik[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  
  const { playAudio, playPlaylist } = useAudio();

  const getRandomItems = useCallback(<T,>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, []);

  const loadData = useCallback(async () => {
    try {
      console.log('Loading data from API...'); // Debug log
      
      const [songsRes, albumsRes, playlistsRes, artistsRes] = await Promise.all([
        axios.get(`${API_BASE}/pjesme/`),
        axios.get(`${API_BASE}/albumi/`),
        axios.get(`${API_BASE}/playliste/`),
        axios.get(`${API_BASE}/korisnici/`),
      ]);

      console.log('Data loaded successfully'); // Debug log

      // Filter and randomize approved content
      const approvedSongs = songsRes.data.filter((s: Pjesma) => s.odobreno);
      const approvedAlbums = albumsRes.data.filter((a: Album) => a.odobreno);
      const publicPlaylists = playlistsRes.data.filter((p: Playlista) => p.javno);
      const activeArtists = artistsRes.data.filter((k: Korisnik) => 
        k.rola === 'izvodac' && k.statusKorisnika !== 'suspendovan'
      );

      setSongs(getRandomItems(approvedSongs, 20));
      setAlbums(getRandomItems(approvedAlbums, 20));
      setPlaylists(getRandomItems(publicPlaylists, 20));
      setArtists(getRandomItems(activeArtists, 20));
    } catch (error) {
      console.error('Failed to load data:', error);
      // Add user-friendly error handling
      Alert.alert(
        t('error'),
        t('connection_error'),
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getRandomItems, t]);

  // Load data when component mounts
  useMemo(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      console.warn('Song has no audio file');
      return;
    }
    
    setActiveSongId(song.id);
    playAudio(song);
  }, [playAudio]);

  const handleNavigateToSong = useCallback((songId: number) => {
    router.push(`/pjesma/${songId}`);
  }, [router]);

  const handleNavigateToAlbum = useCallback((albumId: number) => {
    router.push(`/album/${albumId}`);
  }, [router]);

  const handleNavigateToPlaylist = useCallback((playlistaId: number) => {
    router.push(`/playlista/${playlistaId}`);
  }, [router]);

  const handleNavigateToArtist = useCallback((artistId: string) => {
    router.push(`/izvodjac/${artistId}`);
  }, [router]);

  const handlePlayAlbum = useCallback(async (album: Album) => {
    try {
      // Fetch all songs from this album
      const albumSongs = songs.filter(s => s.albumID === album.id && s.putanjaAudio && s.odobreno);
      if (albumSongs.length === 0) {
        console.warn('Album has no playable songs');
        return;
      }
      // Play cijelu playlistu albuma
      playPlaylist(albumSongs, 0);
    } catch (error) {
      console.error('Failed to play album:', error);
    }
  }, [songs, playPlaylist]);

  const handlePlayPlaylist = useCallback(async (playlist: Playlista) => {
    try {
      // Fetch playlist songs
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlist.id}`);
      const songIds: number[] = res.data || [];
      if (songIds.length === 0) {
        console.warn('Playlist is empty');
        return;
      }
      // Fetch sve pjesme iz playliste
      const songResponses = await Promise.all(songIds.map(id => axios.get(`${API_BASE}/pjesme/${id}`)));
      const playlistSongs = songResponses.map(r => r.data).filter(s => s && s.putanjaAudio && s.odobreno);
      if (playlistSongs.length === 0) {
        console.warn('No playable songs in playlist');
        return;
      }
      // Play cijelu playlistu
      playPlaylist(playlistSongs, 0);
    } catch (error) {
      console.error('Failed to play playlist:', error);
    }
  }, [playPlaylist]);

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => (
    <TouchableOpacity 
      style={[styles.card, activeSongId === item.id && styles.activeCard]} 
      onPress={() => handleNavigateToSong(item.id)}
    >
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={styles.cardImage}
        />
        {item.putanjaAudio && (
          <TouchableOpacity 
            style={styles.playButton} 
            onPress={(e) => {
              e.stopPropagation();
              handlePlaySong(item);
            }}
          >
            <MaterialIcons name="play-arrow" size={24} color="#fff" />
          </TouchableOpacity>
        )}
       
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.naziv}
      </Text>
      <TouchableOpacity
        onPress={() => {
          if (item.korisnikID) handleNavigateToArtist(item.korisnikID);
        }}
        disabled={!item.korisnikID}
      >
        <Text style={styles.cardDesc} numberOfLines={1}>
          {item.korisnik?.korisnicko_ime || t('unknown_artist')}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [activeSongId, handleNavigateToSong, handlePlaySong, handleNavigateToArtist, t]);

  const renderAlbumItem = useCallback(({ item }: { item: Album }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleNavigateToAlbum(item.id)}
    >
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={styles.cardImage}
        />
        <TouchableOpacity 
          style={styles.playButton} 
          onPress={(e) => {
            e.stopPropagation();
            handlePlayAlbum(item);
          }}
        >
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.naziv}
      </Text>
      <TouchableOpacity
        onPress={() => {
          if (item.korisnikID) handleNavigateToArtist(item.korisnikID);
        }}
        disabled={!item.korisnikID}
      >
        <Text style={styles.cardDesc} numberOfLines={1}>
          {item.korisnik?.korisnicko_ime || t('unknown_artist')}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [handleNavigateToAlbum, handlePlayAlbum, handleNavigateToArtist, t]);

  const renderPlaylistItem = useCallback(({ item }: { item: Playlista }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleNavigateToPlaylist(item.id)}
    >
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={styles.cardImage}
        />
        <TouchableOpacity 
          style={styles.playButton} 
          onPress={(e) => {
            e.stopPropagation();
            handlePlayPlaylist(item);
          }}
        >
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.naziv}
      </Text>
      <TouchableOpacity
        onPress={() => {
          if (item.korisnikID) handleNavigateToArtist(item.korisnikID);
        }}
        disabled={!item.korisnikID}
      >
        <Text style={styles.cardDesc} numberOfLines={1}>
          {item.korisnik?.korisnicko_ime || t('unknown_user')}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [handleNavigateToPlaylist, handlePlayPlaylist, handleNavigateToArtist, t]);

  const renderArtistItem = useCallback(({ item }: { item: Korisnik }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleNavigateToArtist(item.id)}
    >
      <View style={styles.cardImageWrap2}>
        <Image
          source={{ uri: item.putanjaProfilneSlike || 'https://via.placeholder.com/150' }}
          style={styles.cardImage}
        />
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.korisnicko_ime}
      </Text>
    </TouchableOpacity>
  ), [handleNavigateToArtist]);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95ff"
    />
  ), [refreshing, onRefresh]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('welcome_to_decibel')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('songs')}</Text>
            <FlatList
              data={songs}
              renderItem={renderSongItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('albums')}</Text>
            <FlatList
              data={albums}
              renderItem={renderAlbumItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('playlists')}</Text>
            <FlatList
              data={playlists}
              renderItem={renderPlaylistItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('artists')}</Text>
            <FlatList
              data={artists}
              renderItem={renderArtistItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

Home.displayName = "Home";

export default Home;


