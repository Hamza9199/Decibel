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
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './SvePjesme.styles';
import { styles as lightStyles } from './SvePjesmeWhite.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';
import { useAudio } from '@/context/AudioContext';
import Loading from '@/komponente/Loading/Loading';

const SvePjesme: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [korisnikID, setKorisnikID] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;
  const { playAudio } = useAudio();

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

  
  const { from } = useLocalSearchParams<{ from?: string }>();
const handleBackPress = useBackPress({ from, defaultRoute: '/svepjesme', currentRoute: '/svepjesme' });

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

  const songsQuery = useQuery({
    queryKey: ['userSongs', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return [];
      
      const response = await axios.get(`${API_BASE}/pjesme/`);
      
      return (response.data || []).filter(
        (p: Pjesma) => p.korisnikID === korisnikID
      );
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, 
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
  }, [korisnikID]);

  const handlePlay = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    setActiveSongId(song.id);
    playAudio(song);

    console.log('Playing song:', song.naziv);
  }, [playAudio, t]);

  const handleEdit = useCallback((songId: number) => {
    navigateWithHistory(`/uredi-pjesmu/${songId}?from=svepjesme`, '/svepjesme');
  }, []);

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
    navigateWithHistory(`/pjesma/${songId}?from=svepjesme`, '/svepjesme');
  }, []);

  const handleNavigateToArtist = useCallback((artistId: string) => {
    navigateWithHistory(`/izvodjac/${artistId}?from=svepjesme`, '/svepjesme');
  }, []);

  const filtriranePjesme = useMemo(() => {
    const pjesme = songsQuery.data || [];
    return pjesme.filter((p: Pjesma) =>
      p.naziv.toLowerCase().includes(search.toLowerCase())
    );
  }, [songsQuery.data, search]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = songsQuery.isLoading;
  const pjesme = songsQuery.data || [];

    useScreenCleanup();
  

  if (loading) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Back
          title={t('loading_songs') || 'Loading Songs...'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile?from=svepjesme', '/svepjesme')}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Loading />
        <Tabs currentRoute="svepjesme" />
      </View>
    );
  }

  return (
    <View style={activeStyles.container}>
      <Back
        title={t('my_songs') || 'My Songs'}
        onBackPress={handleBackPress}
        onProfilePress={() =>   navigateWithHistory('/edit-profile?from=svepjesme', '/svepjesme')}
        source={from}
        />
      <ScrollView
        contentContainerStyle={activeStyles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={activeStyles.content}>
          <Text style={activeStyles.title}>{t('my_songs') || 'My Songs'}</Text>
          
          <TextInput
            style={activeStyles.searchInput}
            placeholder={t('search_songs') || 'Search songs...'}
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

          {filtriranePjesme.length === 0 ? (
            <Text style={activeStyles.noSongs}>
              {pjesme.length === 0
                ? t('no_songs_user') || 'You have no songs'
                : t('no_results') || 'No results found'}
            </Text>
          ) : (
            <View style={activeStyles.songGrid}>
              {filtriranePjesme.map((song: Pjesma) => {
                const veze = allVezeQuery.data?.filter((v: any) => v.pjesmaID === song.id) || [];
                const izvodjaci = veze.map((v: any) => allKorisniciQuery.data?.find((k: any) => k.id === v.izvodjacID)).filter(Boolean);
                return (
                <View
                  key={song.id}
                  style={[activeStyles.card, activeSongId === song.id && activeStyles.activeCard]}
                >
                  <View style={activeStyles.cardImageWrap}>
                    <Image
                      source={{ 
                        uri: song.putanjaSlika || 'https://via.placeholder.com/150' 
                      }}
                      style={activeStyles.cardImage}
                      contentFit="cover"
                    />
                    {song.putanjaAudio && (
                      <TouchableOpacity
                        style={activeStyles.playButton}
                        onPress={() => handlePlay(song)}
                      >
                        <MaterialIcons name="play-arrow" size={24} color="black" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TouchableOpacity onPress={() => handleNavigateToSong(song.id)}>
                    <Text style={activeStyles.cardTitle} numberOfLines={2}>
                      {song.naziv}
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
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
                        onPress={() => {
                          if (song.korisnikID) handleNavigateToArtist(song.korisnikID);
                        }}
                        disabled={!song.korisnikID}
                      >
                        <Text style={activeStyles.cardDesc} numberOfLines={1}>
                          {song.korisnik?.korisnicko_ime || t('unknown_artist')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={activeStyles.cardActions}>
                    <TouchableOpacity
                      style={activeStyles.editButton}
                      onPress={() => handleEdit(song.id)}
                    >
                      <Text style={activeStyles.buttonText}>{t('edit')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={activeStyles.deleteButton}
                      onPress={() => handleDelete(song.id)}
                      disabled={deleteSongMutation.isPending}
                    >
                      <Text style={activeStyles.buttonText}>
                        {deleteSongMutation.isPending ? t('deleting') : t('delete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Tabs currentRoute="svepjesme" />
    </View>
  );
});

SvePjesme.displayName = "SvePjesme";

export default SvePjesme;