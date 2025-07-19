import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pjesma, Album, Playlista, Korisnik } from '@/types';
import { useAudio } from '@/context/AudioContext';
import { API_BASE } from '@/config/api';
import { styles } from './Search.styles';

type SearchFilter = 'sve' | 'pjesme' | 'albumi' | 'playliste' | 'korisnici';

interface SearchResults {
  pjesme: Pjesma[];
  albumi: Album[];
  playliste: Playlista[];
  korisnici: Korisnik[];
}

interface ResultItem {
  type: 'song' | 'album' | 'playlist' | 'user';
  data: Pjesma | Album | Playlista | Korisnik;
  id: string;
}

const Search: React.FC = () => {
  const { t } = useTranslation();
  const { playAudio, playPlaylist } = useAudio();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('sve');
  const [results, setResults] = useState<SearchResults>({
    pjesme: [],
    albumi: [],
    playliste: [],
    korisnici: [],
  });
  const [loading, setLoading] = useState(false);
  const [korisnik, setKorisnik] = useState<Korisnik | null>(null);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('korisnik');
        if (userData) {
          setKorisnik(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        performSearch(searchTerm.trim());
      } else {
        setResults({ pjesme: [], albumi: [], playliste: [], korisnici: [] });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const performSearch = async (term: string) => {
    if (!term.trim()) return;

    setLoading(true);
    try {
      const [pjesmeRes, albumiRes, playlisteRes, korisniciceRes] = await Promise.all([
        axios.get(`${API_BASE}/pjesme/`),
        axios.get(`${API_BASE}/albumi/`),
        axios.get(`${API_BASE}/playliste/`),
        axios.get(`${API_BASE}/korisnici/`),
      ]);

      const termLower = term.toLowerCase();

      // Filter songs
      const filteredSongs = (pjesmeRes.data as Pjesma[])
        .filter(s => 
          s.odobreno && 
          (s.naziv?.toLowerCase().includes(termLower) ||
           s.korisnik?.korisnicko_ime?.toLowerCase().includes(termLower) ||
           s.zanr?.toLowerCase().includes(termLower))
        )
        .sort((a, b) => (b.brojReprodukcija || 0) - (a.brojReprodukcija || 0));

      // Filter albums
      const filteredAlbums = (albumiRes.data as Album[])
        .filter(a => 
          a.odobreno && 
          (a.naziv?.toLowerCase().includes(termLower) ||
           a.korisnik?.korisnicko_ime?.toLowerCase().includes(termLower))
        )
        .sort((a, b) => (b.brojLajkova || 0) - (a.brojLajkova || 0));

      // Filter playlists
      const filteredPlaylists = (playlisteRes.data as Playlista[])
        .filter(p => 
          p.javno && 
          (p.naziv?.toLowerCase().includes(termLower) ||
           p.korisnik?.korisnicko_ime?.toLowerCase().includes(termLower))
        )
        .sort((a, b) => (b.brojLajkova || 0) - (a.brojLajkova || 0));

      // Filter users
      const filteredUsers = (korisniciceRes.data as Korisnik[])
        .filter(k => 
          k.statusKorisnika !== 'suspendovan' &&
          (k.korisnicko_ime?.toLowerCase().includes(termLower) ||
           k.ime?.toLowerCase().includes(termLower) ||
           k.prezime?.toLowerCase().includes(termLower))
        )
        .sort((a, b) => (b.brojPratilaca || 0) - (a.brojPratilaca || 0));

      setResults({
        pjesme: filteredSongs,
        albumi: filteredAlbums,
        playliste: filteredPlaylists,
        korisnici: filteredUsers,
      });
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert(t('error'), 'Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), 'Song has no audio file');
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
        Alert.alert(t('error'), 'Album has no playable songs');
        return;
      }

      playPlaylist(albumSongs, 0);
    } catch (error) {
      console.error('Error playing album:', error);
      Alert.alert(t('error'), 'Failed to play album');
    }
  }, [playPlaylist, t]);

  const handlePlayPlaylist = useCallback(async (playlist: Playlista) => {
    try {
      const response = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlist.id}`);
      const songIds: number[] = response.data || [];

      if (songIds.length === 0) {
        Alert.alert(t('error'), 'Playlist is empty');
        return;
      }

      const songPromises = songIds.map(id => axios.get(`${API_BASE}/pjesme/${id}`));
      const songResponses = await Promise.all(songPromises);
      const songs = songResponses
        .map(res => res.data)
        .filter(song => song && song.odobreno && song.putanjaAudio);

      if (songs.length === 0) {
        Alert.alert(t('error'), 'No playable songs in playlist');
        return;
      }

      playPlaylist(songs, 0);
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert(t('error'), 'Failed to play playlist');
    }
  }, [playPlaylist, t]);

  const clearSearch = () => {
    setSearchTerm('');
    setResults({ pjesme: [], albumi: [], playliste: [], korisnici: [] });
  };

  const filters: { key: SearchFilter; label: string }[] = [
    { key: 'sve', label: t('all') },
    { key: 'pjesme', label: t('songs') },
    { key: 'albumi', label: t('albums') },
    { key: 'playliste', label: t('playlists') },
    { key: 'korisnici', label: t('users') },
  ];

  const getFilteredResults = (): ResultItem[] => {
    const items: ResultItem[] = [];

    switch (activeFilter) {
      case 'pjesme':
        results.pjesme.forEach(song => {
          items.push({ type: 'song', data: song, id: `song-${song.id}` });
        });
        break;
      case 'albumi':
        results.albumi.forEach(album => {
          items.push({ type: 'album', data: album, id: `album-${album.id}` });
        });
        break;
      case 'playliste':
        results.playliste.forEach(playlist => {
          items.push({ type: 'playlist', data: playlist, id: `playlist-${playlist.id}` });
        });
        break;
      case 'korisnici':
        results.korisnici.forEach(user => {
          items.push({ type: 'user', data: user, id: `user-${user.id}` });
        });
        break;
      default:
        // Add all items with section headers
        if (results.pjesme.length > 0) {
          items.push({ type: 'song', data: { id: -1, naziv: t('songs') } as Pjesma, id: 'header-songs' });
          results.pjesme.forEach(song => {
            items.push({ type: 'song', data: song, id: `song-${song.id}` });
          });
        }
        if (results.albumi.length > 0) {
          items.push({ type: 'album', data: { id: -1, naziv: t('albums') } as Album, id: 'header-albums' });
          results.albumi.forEach(album => {
            items.push({ type: 'album', data: album, id: `album-${album.id}` });
          });
        }
        if (results.playliste.length > 0) {
          items.push({ type: 'playlist', data: { id: -1, naziv: t('playlists') } as Playlista, id: 'header-playlists' });
          results.playliste.forEach(playlist => {
            items.push({ type: 'playlist', data: playlist, id: `playlist-${playlist.id}` });
          });
        }
        if (results.korisnici.length > 0) {
          items.push({ type: 'user', data: { id: '-1', korisnicko_ime: t('users') } as Korisnik, id: 'header-users' });
          results.korisnici.forEach(user => {
            items.push({ type: 'user', data: user, id: `user-${user.id}` });
          });
        }
        break;
    }

    return items;
  };

  const handleFilterPress = (key: SearchFilter) => {
    setActiveFilter(key);
  };

  const filteredResults = getFilteredResults();
  const hasResults = filteredResults.length > 0;

  const renderHeader = () => (
    <View>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_placeholder') || 'Search songs, albums, playlists...'}
          placeholderTextColor="#888"
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <MaterialIcons name="clear" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        data={filters}
        keyExtractor={(item) => item.key}
        renderItem={({ item: filter }) => (
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterPress(filter.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === filter.key && styles.filterButtonTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#b91d95" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      );
    }

    if (searchTerm.trim() === '') {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search" size={64} color="#444" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>{t('search_music')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('search_description') || 'Find your favorite songs, albums, playlists and artists'}
          </Text>
        </View>
      );
    }

    if (!hasResults) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={64} color="#444" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>{t('no_results')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('no_results_description') || `No results found for "${searchTerm}". Try different keywords.`}
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderResultItem = ({ item }: { item: ResultItem }) => {
    // Render section headers
    if (item.id.startsWith('header-')) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {'naziv' in item.data && item.data.naziv
              ? item.data.naziv
              : 'korisnicko_ime' in item.data
              ? item.data.korisnicko_ime
              : ''}
          </Text>
        </View>
      );
    }

    switch (item.type) {
      case 'song':
        return renderSongItem(item.data as Pjesma);
      case 'album':
        return renderAlbumItem(item.data as Album);
      case 'playlist':
        return renderPlaylistItem(item.data as Playlista);
      case 'user':
        return renderUserItem(item.data as Korisnik);
      default:
        return null;
    }
  };

  const renderSongItem = (item: Pjesma) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handlePlaySong(item)}>
      <Image
        source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
        style={styles.resultImage}
      />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.naziv}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.korisnik?.korisnicko_ime || t('unknown_artist')} • {item.zanr || 'Unknown'}
        </Text>
      </View>
      <TouchableOpacity style={styles.playButton} onPress={() => handlePlaySong(item)}>
        <MaterialIcons name="play-arrow" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderAlbumItem = (item: Album) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handlePlayAlbum(item)}>
      <Image
        source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
        style={styles.resultImage}
      />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.naziv}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.korisnik?.korisnicko_ime || t('unknown_artist')} • {t('album')}
        </Text>
      </View>
      <TouchableOpacity style={styles.playButton} onPress={() => handlePlayAlbum(item)}>
        <MaterialIcons name="play-arrow" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPlaylistItem = (item: Playlista) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handlePlayPlaylist(item)}>
      <Image
        source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/60' }}
        style={styles.resultImage}
      />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.naziv}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.korisnik?.korisnicko_ime || t('unknown_user')} • {t('playlist')}
        </Text>
      </View>
      <TouchableOpacity style={styles.playButton} onPress={() => handlePlayPlaylist(item)}>
        <MaterialIcons name="play-arrow" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderUserItem = (item: Korisnik) => (
    <TouchableOpacity style={styles.resultItem}>
      <Image
        source={{ uri: item.putanjaProfilneSlike || 'https://via.placeholder.com/60' }}
        style={[styles.resultImage, styles.artistImage]}
      />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.korisnicko_ime}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.ime && item.prezime ? `${item.ime} ${item.prezime}` : item.rola || t('user')}
        </Text>
      </View>
      <View style={styles.resultActions}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="person" size={20} color="#b91d95" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={hasResults ? filteredResults : []}
        renderItem={renderResultItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={hasResults ? styles.resultsList : { flexGrow: 1 }}
      />
    </View>
  );
};

export default Search;
