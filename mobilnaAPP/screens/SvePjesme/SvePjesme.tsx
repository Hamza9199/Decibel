import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './SvePjesme.styles';
import { queryClient } from '@/config/queryClient';

const SvePjesme: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [korisnikID, setKorisnikID] = useState<string>('');


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

  // Replace useMemo with useEffect for initial user data loading
  useEffect(() => {
    const initializeUser = async () => {
      const userId = await loadUserData();
      setKorisnikID(userId);
    };
    
    initializeUser();
  }, [loadUserData]);

  // Query for user songs
  const songsQuery = useQuery({
    queryKey: ['userSongs', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return [];
      
      const response = await axios.get(`${API_BASE}/pjesme/`);
      
      // Filter songs by current user
      return (response.data || []).filter(
        (p: Pjesma) => p.korisnikID === korisnikID
      );
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for deleting songs
  const deleteSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      await axios.delete(`${API_BASE}/pjesme/${songId}`);
      return songId;
    },
    onSuccess: (songId) => {
      queryClient.setQueryData(['userSongs', korisnikID], (old: any) => 
        old ? old.filter((p: Pjesma) => p.id !== songId) : []
      );
      Alert.alert(t('success'), t('song_deleted') || 'Song deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting song:', error);
      Alert.alert(t('error'), t('error_deleting_song') || 'Error deleting song');
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['userSongs', korisnikID] }).finally(() => {
      setRefreshing(false);
    });
  }, [queryClient, korisnikID]);

  const handlePlay = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    setActiveSongId(song.id);
    console.log('Playing song:', song.naziv);
    // Add audio player integration here
  }, [t]);

  const handleEdit = useCallback((songId: number) => {
    router.push(`/uredi-pjesmu/${songId}`);
  }, [router]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('delete_song_confirm') || 'Are you sure you want to delete this song?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: () => deleteSongMutation.mutate(id)
        }
      ]
    );
  }, [deleteSongMutation, t]);

  const handleNavigateToSong = useCallback((songId: number) => {
    router.push(`/pjesma/${songId}`);
  }, [router]);

  const handleNavigateToArtist = useCallback((artistId: string) => {
    router.push(`/izvodjac/${artistId}`);
  }, [router]);

  // Memoize filtered songs
  const filtriranePjesme = useMemo(() => {
    const pjesme = songsQuery.data || [];
    return pjesme.filter((p: Pjesma) =>
      p.naziv.toLowerCase().includes(search.toLowerCase())
    );
  }, [songsQuery.data, search]);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = songsQuery.isLoading;
  const pjesme = songsQuery.data || [];

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
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('my_songs') || 'My Songs'}</Text>
          
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_songs') || 'Search songs...'}
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

          {filtriranePjesme.length === 0 ? (
            <Text style={styles.noSongs}>
              {pjesme.length === 0
                ? t('no_songs_user') || 'You have no songs'
                : t('no_results') || 'No results found'}
            </Text>
          ) : (
            <View style={styles.songGrid}>
              {filtriranePjesme.map((song: Pjesma) => (
                <View
                  key={song.id}
                  style={[styles.card, activeSongId === song.id && styles.activeCard]}
                >
                  <View style={styles.cardImageWrap}>
                    <Image
                      source={{ 
                        uri: song.putanjaSlika || 'https://via.placeholder.com/150' 
                      }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                    {song.putanjaAudio && (
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => handlePlay(song)}
                      >
                        <MaterialIcons name="play-arrow" size={24} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TouchableOpacity onPress={() => handleNavigateToSong(song.id)}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {song.naziv}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      if (song.korisnikID) handleNavigateToArtist(song.korisnikID);
                    }}
                    disabled={!song.korisnikID}
                  >
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {song.korisnik?.korisnicko_ime || t('unknown_artist')}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(song.id)}
                    >
                      <Text style={styles.buttonText}>{t('edit')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(song.id)}
                      disabled={deleteSongMutation.isPending}
                    >
                      <Text style={styles.buttonText}>
                        {deleteSongMutation.isPending ? t('deleting') : t('delete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Tabs currentRoute="songs" />
    </View>
  );
});

SvePjesme.displayName = "SvePjesme";

export default SvePjesme;
