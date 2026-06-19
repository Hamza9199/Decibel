import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { styles as darkStyles } from './Zahtjevi.styles';
import { styles as lightStyles } from './ZahtjeviWhite.styles';
import Back from '@/komponente/Back/Back';
import Tabs from '@/komponente/Tabs/Tabs';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBackPress } from '@/hooks/handleBackPress';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAudio } from '@/context/AudioContext';
import { IzvodjacPjesmaVeza, Pjesma } from '@/types';
import { API_BASE } from '@/config/api';



const Zahtjevi: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/(tabs)', currentRoute: '/zahtjevi' });

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');
  

  const loadUserFromStorage = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (!userData) {
        Alert.alert(t('error'), 'You must be logged in');
        return '';
      }

      const user = JSON.parse(userData);
      const userId = user?.id || '';

      if (!userId) {
        Alert.alert(t('error'), 'You must be logged in');
        return '';
      }

      return userId;
    } catch (error) {
      console.error('Error loading user from storage:', error);
      return '';
    }
  }, [t]);

   useEffect(() => {
      let isMounted = true;
      
      const initializeUser = async () => {
        if (!isMounted) return;
        const userId = await loadUserFromStorage();
        if (isMounted && userId) {
          setKorisnikID(userId);
        }
      };
      
      initializeUser();
      
      return () => {
        isMounted = false;
      };
    }, [loadUserFromStorage]); 

  const zahtjeviQuery = useQuery<IzvodjacPjesmaVeza[]>({
    queryKey: ['zahtjevi', korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      const res = await axios.get(
        `${API_BASE}/izvodjac_pjesma/izvodjac/${korisnikID}`
      );
      return res.data ?? [];
    },
  });

  const prihvatiMut = useMutation({
    mutationFn: async (pjesmaID: number) => {
      await axios.patch(
        `${API_BASE}/izvodjac_pjesma/${korisnikID}/${pjesmaID}`,
        { potvrdjeno: true }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zahtjevi', korisnikID] }),
  });

  const odbijMut = useMutation({
    mutationFn: async (pjesmaID: number) => {
      await axios.delete(
        `${API_BASE}/izvodjac_pjesma/${korisnikID}/${pjesmaID}`
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zahtjevi', korisnikID] }),
  });

  const pending = useMemo(() => {
    return (zahtjeviQuery.data ?? []).filter(v => !v.potvrdjeno);
  }, [zahtjeviQuery.data]);

  const accepted = useMemo(() => {
    return (zahtjeviQuery.data ?? []).filter(v => v.potvrdjeno);
  }, [zahtjeviQuery.data]);

  const allSongsQuery = useQuery<Pjesma[]>({
    queryKey: ['allSongs'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/pjesme/`);
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const allArtistsQuery = useQuery({
    queryKey: ['izvodjac_pjesma_all'],
    queryFn: async () => (await axios.get(`${API_BASE}/izvodjac_pjesma/`)).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const allUsersQuery = useQuery({
    queryKey: ['sviKorisnici_all'],
    queryFn: async () => (await axios.get(`${API_BASE}/korisnici/`)).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const { playAudio } = useAudio();
  const handlePlaySong = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) return;
    playAudio(song);
  }, [playAudio]);

  const getSong = useCallback((pjesmaID: number) =>
    allSongsQuery.data?.find(s => s.id === pjesmaID), [allSongsQuery.data]);

  const getArtists = useCallback((pjesmaID: number) => {
    const users = allUsersQuery.data || [];
    return (allArtistsQuery.data || [])
      .filter((v: any) => v.pjesmaID === pjesmaID)
      .map((v: any) => users.find((u: any) => u.id === v.izvodjacID))
      .filter(Boolean);
  }, [allArtistsQuery.data, allUsersQuery.data]);

  const renderSongItem = useCallback((v: IzvodjacPjesmaVeza, pending = false) => {
    const song = getSong(v.pjesmaID);
    if (!song) return null;
    const artists = getArtists(v.pjesmaID);
    return (
      <View key={`${v.izvodjacID}-${v.pjesmaID}`} style={activeStyles.songItem}>
        <View style={activeStyles.songHeader}>
          <Image
            source={{ uri: song.putanjaSlika || 'https://via.placeholder.com/50' }}
            style={activeStyles.songImage}
          />
          <View style={activeStyles.songInfo}>
            <Text style={activeStyles.songTitle} numberOfLines={1}>{song.naziv}</Text>
            {artists.length > 0 && (
              <Text style={activeStyles.songArtist} numberOfLines={1}>
                {artists.map((a: any, idx: number) =>
                  `${a.korisnicko_ime || a.ime || 'Artist'}${idx < artists.length - 1 ? ' & ' : ''}`
                ).join('')}
              </Text>
            )}
          </View>
          <TouchableOpacity style={activeStyles.actionButton} onPress={() => handlePlaySong(song)}>
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {pending && (
          <View style={activeStyles.songActions}>
            <TouchableOpacity
              style={[activeStyles.actionButton, activeStyles.acceptAction]}
              onPress={() => prihvatiMut.mutate(v.pjesmaID)}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[activeStyles.actionButton, activeStyles.rejectAction]}
              onPress={() => odbijMut.mutate(v.pjesmaID)}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [activeStyles, getSong, getArtists, handlePlaySong, prihvatiMut, odbijMut]);

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

  useScreenCleanup();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['zahtjevi', korisnikID] })
      .finally(() => setRefreshing(false));
  }, [queryClient, korisnikID]);

  return (
    <View style={activeStyles.container}>
      <Back
        title={t('zahtjevi') || 'Zahtjevi'}
        onBackPress={handleBackPress}
        onProfilePress={() => router.replace('/edit-profile')}
        source={from}
      />
      <ScrollView
        contentContainerStyle={activeStyles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={activeStyles.headerRow}>
          <Text style={activeStyles.title}>{t('requests_collaboration') || 'Zahtjevi'}</Text>
        </View>
        {zahtjeviQuery.isLoading ? (
          <ActivityIndicator size="large" />
        ) : pending.length === 0 ? (
          <View style={activeStyles.section}>
            <Text style={activeStyles.label}>{t('no_requests') || 'Trenutno nema zahtjeva'}</Text>
          </View>
        ) : (
          pending.map(v => renderSongItem(v, true))
        )}
        <View style={activeStyles.headerRow}>
          <Text style={activeStyles.title}>{t('accepted_collaborations') || 'Prihvaćeni'}</Text>
        </View>
        {accepted.length === 0 ? (
          <View style={activeStyles.section}>
            <Text style={activeStyles.label}>{t('no_accepted_songs') || 'Nema prihvaćenih'}</Text>
          </View>
        ) : (
          accepted.map(v => renderSongItem(v))
        )}
      </ScrollView>
      <Tabs currentRoute="zahtjevi" />
    </View>
  );
});

Zahtjevi.displayName = "Zahtjevi";

export default Zahtjevi;