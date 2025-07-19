import React, { useEffect, useState, useCallback } from 'react';
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

type LibraryFilter = 'prateci' | 'pjesme' | 'albumi' | 'playliste';

interface LibraryData {
  prateci: Korisnik[];
  pjesme: Pjesma[];
  albumi: Album[];
  playliste: Playlista[];
}

const Biblioteka: React.FC = () => {
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

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (korisnik?.id) {
      loadLibraryData();
    }
  }, [korisnik?.id]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        setKorisnik(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadLibraryData = async () => {
    if (!korisnik?.id) return;

    try {
      setLoading(true);

      // Load followed artists
      const followingRes = await axios.get(`${API_BASE}/pratioci/`);
      const followingLinks = followingRes.data || [];
      const followedIds = followingLinks
        .filter((p: any) => p.pratilacID === korisnik.id)
        .map((p: any) => p.korisnikID);

      const followedArtists = [];
      if (followedIds.length > 0) {
        const artistPromises = followedIds.map((id: string) =>
          axios.get(`${API_BASE}/korisnici/${id}`)
            .then(res => res.data)
            .catch(() => null)
        );
        const artists = await Promise.all(artistPromises);
        followedArtists.push(...artists.filter(Boolean));
      }

      // Load liked songs
      const likedSongsRes = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const likedSongLinks = likedSongsRes.data || [];
      const likedSongIds = likedSongLinks
        .filter((l: any) => l.korisnikID === korisnik.id)
        .map((l: any) => l.pjesmaID);

      const likedSongs = [];
      if (likedSongIds.length > 0) {
        const songPromises = likedSongIds.map((id: number) =>
          axios.get(`${API_BASE}/pjesme/${id}`)
            .then(res => res.data)
            .catch(() => null)
        );
        const songs = await Promise.all(songPromises);
        likedSongs.push(...songs.filter(s => s && s.odobreno));
      }

      // Load liked albums
      const likedAlbumsRes = await axios.get(`${API_BASE}/korisnik_album/`);
      const likedAlbumLinks = likedAlbumsRes.data || [];
      const likedAlbumIds = likedAlbumLinks
        .filter((l: any) => l.korisnikID === korisnik.id)
        .map((l: any) => l.albumID);

      const likedAlbums = [];
      if (likedAlbumIds.length > 0) {
        const albumPromises = likedAlbumIds.map((id: number) =>
          axios.get(`${API_BASE}/albumi/${id}`)
            .then(res => res.data)
            .catch(() => null)
        );
        const albums = await Promise.all(albumPromises);
        likedAlbums.push(...albums.filter(a => a && a.odobreno));
      }

      // Load liked playlists
      const likedPlaylistsRes = await axios.get(`${API_BASE}/korisnik_playlista/`);
      const likedPlaylistLinks = likedPlaylistsRes.data || [];
      const likedPlaylistIds = likedPlaylistLinks
        .filter((l: any) => l.korisnikID === korisnik.id)
        .map((l: any) => l.playlistaID);

      const likedPlaylists = [];
      if (likedPlaylistIds.length > 0) {
        const playlistPromises = likedPlaylistIds.map((id: number) =>
          axios.get(`${API_BASE}/playliste/${id}`)
            .then(res => res.data)
            .catch(() => null)
        );
        const playlists = await Promise.all(playlistPromises);
        likedPlaylists.push(...playlists.filter(p => p && p.javno));
      }

      setData({
        prateci: followedArtists,
        pjesme: likedSongs,
        albumi: likedAlbums,
        playliste: likedPlaylists,
      });

    } catch (error) {
      console.error('Error loading library data:', error);
      Alert.alert(t('error'), t('error_loading_library'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLibraryData();
  };

  const handleUnfollow = async (artistId: string) => {
    if (!korisnik?.id) return;

    Alert.alert(
      t('confirm_action'),
      t('confirm_unfollow'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('unfollow'),
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/pratioci/${artistId}/${korisnik.id}`);
              setData(prev => ({
                ...prev,
                prateci: prev.prateci.filter(a => a.id !== artistId)
              }));
              Alert.alert(t('success'), t('unfollowed_artist'));
            } catch (error) {
              console.error('Error unfollowing artist:', error);
              Alert.alert(t('error'), t('error_unfollowing'));
            }
          }
        }
      ]
    );
  };

  const handleUnlikeSong = async (songId: number) => {
    if (!korisnik?.id) return;

    try {
      await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnik.id}/${songId}`);
      setData(prev => ({
        ...prev,
        pjesme: prev.pjesme.filter(s => s.id !== songId)
      }));
      Alert.alert(t('success'), t('removed_from_favorites'));
    } catch (error) {
      console.error('Error unliking song:', error);
      Alert.alert(t('error'), t('error_removing_favorite'));
    }
  };

  const handleUnlikeAlbum = async (albumId: number) => {
    if (!korisnik?.id) return;

    try {
      await axios.delete(`${API_BASE}/korisnik_album/${korisnik.id}/${albumId}`);
      setData(prev => ({
        ...prev,
        albumi: prev.albumi.filter(a => a.id !== albumId)
      }));
      Alert.alert(t('success'), t('removed_from_favorites'));
    } catch (error) {
      console.error('Error unliking album:', error);
      Alert.alert(t('error'), t('error_removing_favorite'));
    }
  };

  const handleUnlikePlaylist = async (playlistId: number) => {
    if (!korisnik?.id) return;

    try {
      await axios.delete(`${API_BASE}/korisnik_playlista/${korisnik.id}/${playlistId}`);
      setData(prev => ({
        ...prev,
        playliste: prev.playliste.filter(p => p.id !== playlistId)
      }));
      Alert.alert(t('success'), t('removed_from_favorites'));
    } catch (error) {
      console.error('Error unliking playlist:', error);
      Alert.alert(t('error'), t('error_removing_favorite'));
    }
  };

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file'));
      return;
    }
    playAudio(song);
  }, [playAudio, t]);

  const handlePlayAlbum = useCallback(async (album: Album) => {
    try {
      const response = await axios.get(`${API_BASE}/pjesme/`);
      const albumSongs = (response.data as Pjesma[])
        .filter(s => s.albumID === album.id && s.odobreno && s.putanjaAudio)
        .sort((a, b) => a.id - b.id);

      if (albumSongs.length === 0) {
        Alert.alert(t('error'), t('no_songs_in_album'));
        return;
      }

      playPlaylist(albumSongs, 0);
    } catch (error) {
      console.error('Error playing album:', error);
      Alert.alert(t('error'), t('error_playing_album'));
    }
  }, [playPlaylist, t]);

  const handlePlayPlaylist = useCallback(async (playlist: Playlista) => {
    try {
      const response = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlist.id}`);
      const songIds: number[] = response.data || [];

      if (songIds.length === 0) {
        Alert.alert(t('error'), t('empty_playlist'));
        return;
      }

      const songPromises = songIds.map(id => axios.get(`${API_BASE}/pjesme/${id}`));
      const songResponses = await Promise.all(songPromises);
      const songs = songResponses
        .map(res => res.data)
        .filter(song => song && song.odobreno && song.putanjaAudio);

      if (songs.length === 0) {
        Alert.alert(t('error'), t('no_playable_songs'));
        return;
      }

      playPlaylist(songs, 0);
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert(t('error'), t('error_playing_playlist'));
    }
  }, [playPlaylist, t]);

  const filters: { key: LibraryFilter; label: string; icon: string }[] = [
    { key: 'prateci', label: t('following'), icon: 'people' },
    { key: 'pjesme', label: t('liked_songs'), icon: 'favorite' },
    { key: 'albumi', label: t('liked_albums'), icon: 'album' },
    { key: 'playliste', label: t('liked_playlists'), icon: 'queue-music' },
  ];

  const renderFilterButton = ({ item }: { item: typeof filters[0] }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === item.key && styles.filterButtonActive,
      ]}
      onPress={() => setActiveFilter(item.key)}
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
  );

  const renderArtistItem = ({ item }: { item: Korisnik }) => (
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
  );

  const renderSongItem = ({ item }: { item: Pjesma }) => (
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
  );

  const renderAlbumItem = ({ item }: { item: Album }) => (
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
  );

  const renderPlaylistItem = ({ item }: { item: Playlista }) => (
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
  );

  const renderContent = () => {
    const currentData = data[activeFilter];
    
    if (currentData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons 
            name={filters.find(f => f.key === activeFilter)?.icon as any || 'inbox'} 
            size={64} 
            color="#444" 
            style={styles.emptyIcon} 
          />
          <Text style={styles.emptyTitle}>
            {activeFilter === 'prateci' && t('no_following')}
            {activeFilter === 'pjesme' && t('no_liked_songs')}
            {activeFilter === 'albumi' && t('no_liked_albums')}
            {activeFilter === 'playliste' && t('no_liked_playlists')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'prateci' && t('no_following_description')}
            {activeFilter === 'pjesme' && t('no_liked_songs_description')}
            {activeFilter === 'albumi' && t('no_liked_albums_description')}
            {activeFilter === 'playliste' && t('no_liked_playlists_description')}
          </Text>
        </View>
      );
    }

    return (
      <>
        {activeFilter === 'prateci' && (
          <FlatList<Korisnik>
            data={data.prateci}
            keyExtractor={(item) => `prateci-${item.id}`}
            renderItem={renderArtistItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
        {activeFilter === 'pjesme' && (
          <FlatList<Pjesma>
            data={data.pjesme}
            keyExtractor={(item) => `pjesme-${item.id}`}
            renderItem={renderSongItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
        {activeFilter === 'albumi' && (
          <FlatList<Album>
            data={data.albumi}
            keyExtractor={(item) => `albumi-${item.id}`}
            renderItem={renderAlbumItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
        {activeFilter === 'playliste' && (
          <FlatList<Playlista>
            data={data.playliste}
            keyExtractor={(item) => `playliste-${item.id}`}
            renderItem={renderPlaylistItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </>
    );
  };

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#b91d95"
          />
        }
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
          {renderContent()}
        </View>
      </ScrollView>
    </View>
  );
};

export default Biblioteka;
