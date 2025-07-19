import React, { useEffect, useState } from 'react';
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
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './SvePjesme.styles';

const SvePjesme: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [korisnikID, setKorisnikID] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (korisnikID) {
      loadData();
    }
  }, [korisnikID]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setKorisnikID(user?.id || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadData = async () => {
    if (!korisnikID) {
      setPjesme([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/pjesme/`);
      
      // Filter songs by current user
      const mojePjesme = (response.data || []).filter(
        (p: Pjesma) => p.korisnikID === korisnikID
      );
      setPjesme(mojePjesme);
    } catch (error) {
      console.error('Error loading songs:', error);
      Alert.alert(t('error'), t('error_loading_data') || 'Error loading data');
      setPjesme([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlay = (song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    setActiveSongId(song.id);
    console.log('Playing song:', song.naziv);
    // Add audio player integration here
  };

  const handleEdit = (songId: number) => {
    router.push(`/uredi-pjesmu/${songId}`);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('delete_song_confirm') || 'Are you sure you want to delete this song?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/pjesme/${id}`);
              setPjesme(prev => prev.filter(p => p.id !== id));
              Alert.alert(t('success'), t('song_deleted') || 'Song deleted successfully');
            } catch (error) {
              console.error('Error deleting song:', error);
              Alert.alert(t('error'), t('error_deleting_song') || 'Error deleting song');
            }
          }
        }
      ]
    );
  };

  // Filter songs based on search
  const filtriranePjesme = pjesme.filter(p =>
    p.naziv.toLowerCase().includes(search.toLowerCase())
  );

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
              {filtriranePjesme.map((song) => (
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
                  
                  <TouchableOpacity onPress={() => router.push(`/pjesma/${song.id}`)}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {song.naziv}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => router.push(`/izvodjac/${song.korisnikID}`)}>
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
                    >
                      <Text style={styles.buttonText}>{t('delete')}</Text>
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
};

export default SvePjesme;
