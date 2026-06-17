import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
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

const Zahtjevi: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/home', currentRoute: '/zahtjevi' });

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('korisnik') || '');
      return user?.id?.toString() ?? '';
    } catch {
      return '';
    }
  }, []);

  const zahtjeviQuery = useQuery<IzvodjacPjesmaVeza[]>({
    queryKey: ['zahtjevi', korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      const res = await axios.get(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/izvodjac_pjesma/izvodjac/${korisnikID}`
      );
      return res.data ?? [];
    },
  });

  const prihvatiMut = useMutation({
    mutationFn: async (pjesmaID: number) => {
      await axios.patch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/izvodjac_pjesma/${korisnikID}/${pjesmaID}`,
        { potvrdjeno: true }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zahtjevi', korisnikID] }),
  });

  const odbijMut = useMutation({
    mutationFn: async (pjesmaID: number) => {
      await axios.delete(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/izvodjac_pjesma/${korisnikID}/${pjesmaID}`
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
      const res = await axios.get(`${process.env.EXPO_PUBLIC_API_BASE_URL}/pjesme/`);
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { playAudio } = useAudio();
  const handlePlay = useCallback(async (pjesmaID: number) => {
    try {
      const res = await axios.get(`${process.env.EXPO_PUBLIC_API_BASE_URL}/pjesme/${pjesmaID}`);
      const song: Pjesma = res.data;
      if (song && song.putanjaAudio) {
        playAudio(song);
      }
    } catch (e) {
      console.warn('Failed to load song for playback', e);
    }
  }, [playAudio]);

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
          pending.map((v: any) => (
            <View key={`${v.izvodjacID}-${v.pjesmaID}`} style={activeStyles.section}>
              <Text style={activeStyles.label}>ID: {v.pjesmaID}</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity
                  style={{ marginRight: 8 }}
                  onPress={() => prihvatiMut.mutate(v.pjesmaID)}
                >
                  <Text>{t('accept') || 'Prihvati'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginRight: 8 }}
                  onPress={() => odbijMut.mutate(v.pjesmaID)}
                >
                  <Text>{t('reject') || 'Odbij'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handlePlay(v.pjesmaID)}>
                  <Text>{t('play') || 'Play'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={activeStyles.headerRow}>
          <Text style={activeStyles.title}>{t('accepted_collaborations') || 'Prihvaćeni'}</Text>
        </View>
        {accepted.length === 0 ? (
          <View style={activeStyles.section}>
            <Text style={activeStyles.label}>{t('no_accepted_songs') || 'Nema prihvaćenih'}</Text>
          </View>
        ) : (
          accepted.map((v: any) => {
            const songName = v.pjesma?.naziv ?? allSongsQuery.data?.find((s: Pjesma) => s.id === v.pjesmaID)?.naziv;
            return (
              <View key={`${v.izvodjacID}-${v.pjesmaID}`} style={activeStyles.section}>
                <Text style={activeStyles.label}>{songName ?? `ID: ${v.pjesmaID}`}</Text>
                <TouchableOpacity onPress={() => handlePlay(v.pjesmaID)}>
                  <Text>{t('play') || 'Play'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
      <Tabs currentRoute="zahtjevi" />
    </View>
  );
});

Zahtjevi.displayName = "Zahtjevi";

export default Zahtjevi;