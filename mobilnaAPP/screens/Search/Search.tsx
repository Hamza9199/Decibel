import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pjesma, Album, Playlista, Korisnik } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Search.styles';
import { useQuery } from '@tanstack/react-query';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { router } from 'expo-router';

type SearchFilter = 'sve' | 'pjesme' | 'albumi' | 'playliste' | 'korisnici';


interface ResultItem {
  type: 'song' | 'album' | 'playlist' | 'user';
  data: Pjesma | Album | Playlista | Korisnik;
  id: string;
}

const Search: React.FC = React.memo(() => {
  const { t } = useTranslation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('sve');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [korisnik, setKorisnik] = useState<Korisnik | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        setKorisnik(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const searchQuery = useQuery({
    queryKey: ['search', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) {
        return { pjesme: [], albumi: [], playliste: [], korisnici: [] };
      }

      const [pjesmeRes, albumiRes, playlisteRes, korisniciceRes] = await Promise.all([
        axios.get(`${API_BASE}/pjesme/`),
        axios.get(`${API_BASE}/albumi/`),
        axios.get(`${API_BASE}/playliste/`),
        axios.get(`${API_BASE}/korisnici/`),
      ]);

      const termLower = debouncedSearchTerm.toLowerCase();

      const filteredSongs = (pjesmeRes.data as Pjesma[])
        .filter(s => 
          s.odobreno && 
          (s.naziv?.toLowerCase().includes(termLower) ||
           s.korisnik?.korisnicko_ime?.toLowerCase().includes(termLower) ||
           s.zanr?.toLowerCase().includes(termLower))
        )
        .sort((a, b) => (b.brojReprodukcija || 0) - (a.brojReprodukcija || 0));

      const filteredAlbums = (albumiRes.data as Album[])
        .filter(a => 
          a.odobreno && 
          (a.naziv?.toLowerCase().includes(termLower) ||
           a.korisnik?.korisnicko_ime?.toLowerCase().includes(termLower))
        )
        .sort((a, b) => (b.brojLajkova || 0) - (a.brojLajkova || 0));

      const filteredPlaylists = (playlisteRes.data as Playlista[])
        .filter(p => 
          p.javno && 
          (p.naziv?.toLowerCase().includes(termLower) ||
           p.korisnik?.korisnicko_ime?.toLowerCase().includes(termLower))
        )
        .sort((a, b) => (b.brojLajkova || 0) - (a.brojLajkova || 0));

      const filteredUsers = (korisniciceRes.data as Korisnik[])
        .filter(k => 
          k.statusKorisnika !== 'suspendovan' &&
          (k.korisnicko_ime?.toLowerCase().includes(termLower) ||
           k.ime?.toLowerCase().includes(termLower) ||
           k.prezime?.toLowerCase().includes(termLower))
        )
        .sort((a, b) => (b.brojPratilaca || 0) - (a.brojPratilaca || 0));

      return {
        pjesme: filteredSongs,
        albumi: filteredAlbums,
        playliste: filteredPlaylists,
        korisnici: filteredUsers,
      };
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, 
  });

  

  

  

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);

  const handleFilterPress = useCallback((key: SearchFilter) => {
    setActiveFilter(key);
  }, []);

  const filters = useMemo(() => [
    { key: 'sve' as SearchFilter, label: t('all') },
    { key: 'pjesme' as SearchFilter, label: t('songs') },
    { key: 'albumi' as SearchFilter, label: t('albums') },
    { key: 'playliste' as SearchFilter, label: t('playlists') },
    { key: 'korisnici' as SearchFilter, label: t('users') },
  ], [t]);

  const getFilteredResults = useCallback((): ResultItem[] => {
    const results = searchQuery.data || { pjesme: [], albumi: [], playliste: [], korisnici: [] };
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
  }, [activeFilter, searchQuery.data, t]);


  const handleNavigate = useCallback((tip: string) => {
    router.replace(`/${tip}?from=search`);
  }, []);

  const filteredResults = useMemo(() => getFilteredResults(), [getFilteredResults]);
  const hasResults = useMemo(() => filteredResults.length > 0, [filteredResults]);

  const renderSongItem = useCallback((item: Pjesma) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleNavigate(`pjesma/${item.id}`)}>
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
     
    </TouchableOpacity>
  ), [handleNavigate, t]);

  const renderAlbumItem = useCallback((item: Album) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleNavigate("album/" + item.id)}>
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
      
    </TouchableOpacity>
  ), [handleNavigate, t]);

  const renderPlaylistItem = useCallback((item: Playlista) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleNavigate("playlista/" + item.id)}>
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
      
    </TouchableOpacity>
  ), [handleNavigate, t]);

  const renderUserItem = useCallback((item: Korisnik) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleNavigate("izvodjac/" + item.id)}>
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
  ), [t, handleNavigate]);

  const renderResultItem = useCallback(({ item }: { item: ResultItem }) => {
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
  }, [renderSongItem, renderAlbumItem, renderPlaylistItem, renderUserItem]);

  const renderEmptyState = useCallback(() => {
    if (searchQuery.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#b91d95" />
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
  }, [searchQuery.isLoading, searchTerm, hasResults, t]);

  const renderFilterButton = useCallback(({ item: filter }: { item: typeof filters[0] }) => (
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
  ), [activeFilter, handleFilterPress]);

  useScreenCleanup();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View>
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
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={renderFilterButton}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        />
      </View>
      <FlatList
        data={hasResults ? filteredResults : []}
        renderItem={renderResultItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={hasResults ? styles.resultsList : { flexGrow: 1 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      />
    </KeyboardAvoidingView>
  );
});

Search.displayName = "Search";

export default Search;
