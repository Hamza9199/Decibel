import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tabs from '@/komponente/Tabs/Tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { styles as darkStyles } from './Offline.styles';
import { styles as lightStyles } from './OfflineWhite.styles';
import { useAudio } from '@/context/AudioContext';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import { useLocalSearchParams } from 'expo-router';
import Back from '@/komponente/Back/Back';
import Loading from '@/komponente/Loading/Loading';

interface OfflineSong {
  id: number;
  naziv: string;
  izvođač?: string;
  putanjaAudio: string;
  putanjaSlika?: string;
}

const Offline: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [offlineSongs, setOfflineSongs] = useState<OfflineSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showInitialLoading, setShowInitialLoading] = useState(true);
  const { playAudio } = useAudio();

  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/offline', currentRoute: '/offline' });

  const loadOfflineSongs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem('offline_pjesme');
      if (data) {
        setOfflineSongs(JSON.parse(data));
      } else {
        setOfflineSongs([]);
      }
    } catch {
      setOfflineSongs([]);
    }
    setLoading(false);
  }, []);

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

  useEffect(() => {
    loadOfflineSongs();
  }, [loadOfflineSongs]);

  useEffect(() => {
    const timer = setTimeout(() => setShowInitialLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handlePlayOfflineSong = useCallback((song: OfflineSong) => {
    playAudio({
      id: song.id,
      naziv: song.naziv,
      putanjaAudio: song.putanjaAudio,
      putanjaSlika: song.putanjaSlika,
      korisnik: { id: '', korisnicko_ime: song.izvođač || '' },
      korisnikID: '',
      odobreno: true,
      feat_izvodjaci: undefined
    });
  }, [playAudio]);

  const handleDeleteOfflineSong = useCallback(async (id: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('delete_offline_confirm') || 'Are you sure you want to delete this offline song?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = offlineSongs.filter(s => s.id !== id);
              await AsyncStorage.setItem('offline_pjesme', JSON.stringify(updated));
              setOfflineSongs(updated);
              Alert.alert(t('success'), t('offline_song_deleted') || 'Song deleted from offline');
            } catch {
              Alert.alert(t('error'), t('error_deleting_offline_song') || 'Error deleting offline song');
            }
          }
        }
      ]
    );
  }, [offlineSongs, t]);

  const activeStyles = theme === 'light' ? lightStyles : darkStyles;
  const renderSongItem = useCallback(({ item }: { item: OfflineSong }) => (
    <View style={activeStyles.songCard}>
      <Image
        source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/80' }}
        style={activeStyles.songImage}
      />
      <View style={activeStyles.songInfo}>
        <Text style={activeStyles.songTitle}>
          {item.naziv}
        </Text>
        <Text style={activeStyles.songArtist}>
          {item.izvođač || t('unknown_artist')}
        </Text>
      </View>
      <TouchableOpacity
        style={activeStyles.playButton}
        onPress={() => handlePlayOfflineSong(item)}
      >
        <MaterialIcons name="play-arrow" size={22} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={activeStyles.deleteButton}
        onPress={() => handleDeleteOfflineSong(item.id)}
      >
        <MaterialIcons name="delete" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  ), [handlePlayOfflineSong, handleDeleteOfflineSong, t, activeStyles]);

    useScreenCleanup();
  

  return (
    showInitialLoading ? (
      <Loading />
    ) : (
      <View style={activeStyles.container}>
      <Back
        title={t('offline_mode') || 'Offline Mode'}
        onBackPress={handleBackPress}
        onProfilePress={() =>   navigateWithHistory('/edit-profile?from=/offline', "/offline")}
        source={from}
        />
  <View style={activeStyles.content}>
          <Text style={activeStyles.title}>
          {t('offline_mode') || 'Offline Mode'}
        </Text>
          <Text style={activeStyles.description}>
          {t('offline_description') || 'You are currently offline. Downloaded songs are available below.'}
        </Text>
        {loading ? (
          <Text style={activeStyles.loadingText}>{t('loading')}</Text>
        ) : offlineSongs.length === 0 ? (
            <Text style={activeStyles.noSongsText}>
            {t('no_offline_songs') || 'No songs downloaded for offline listening.'}
          </Text>
        ) : (
          <FlatList
            data={offlineSongs}
            renderItem={renderSongItem}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            style={activeStyles.songList}
          />
        )}
       
      </View>
      <Tabs currentRoute="offline" />
    </View>
    )
    )
});

Offline.displayName = "Offline";

export default Offline;
