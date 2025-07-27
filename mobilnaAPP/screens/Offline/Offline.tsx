import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from './Offline.styles';
import { useAudio } from '@/context/AudioContext';

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
  const { playAudio } = useAudio();

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

  // Load offline songs when component mounts
  useMemo(() => {
    loadOfflineSongs();
  }, [loadOfflineSongs]);

  const handlePlayOfflineSong = useCallback((song: OfflineSong) => {
    playAudio({
      id: song.id,
      naziv: song.naziv,
      putanjaAudio: song.putanjaAudio,
      putanjaSlika: song.putanjaSlika,
      korisnik: { id: '', korisnicko_ime: song.izvođač || '' },
      korisnikID: '', 
      odobreno: true,
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

  const renderSongItem = useCallback(({ item }: { item: OfflineSong }) => (
    <View style={styles.songCard}>
      <Image
        source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/80' }}
        style={styles.songImage}
      />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>
          {item.naziv}
        </Text>
        <Text style={styles.songArtist}>
          {item.izvođač || t('unknown_artist')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => handlePlayOfflineSong(item)}
      >
        <MaterialIcons name="play-arrow" size={22} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteOfflineSong(item.id)}
      >
        <MaterialIcons name="delete" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  ), [handlePlayOfflineSong, handleDeleteOfflineSong, t]);

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>
          {t('offline_mode') || 'Offline Mode'}
        </Text>
        <Text style={styles.description}>
          {t('offline_description') || 'You are currently offline. Downloaded songs are available below.'}
        </Text>
        {loading ? (
          <Text style={styles.loadingText}>{t('loading')}</Text>
        ) : offlineSongs.length === 0 ? (
          <Text style={styles.noSongsText}>
            {t('no_offline_songs') || 'No songs downloaded for offline listening.'}
          </Text>
        ) : (
          <FlatList
            data={offlineSongs}
            renderItem={renderSongItem}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            style={styles.songList}
          />
        )}
       
      </View>
      <Tabs currentRoute="offline" />
    </View>
  );
});

Offline.displayName = "Offline";

export default Offline;
