import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma, HistorijaSlusanja, Playlista, KorisnikPjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Historija.styles';

const Historija: React.FC = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistorijaSlusanja[]>([]);
  const [songs, setSongs] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState<number | null>(null);
  const [likeMap, setLikeMap] = useState<{ [pjesmaId: number]: boolean }>({});
  const [korisnikID, setKorisnikID] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (korisnikID) {
      loadHistoryData();
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

  const loadHistoryData = async () => {
    if (!korisnikID) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load listening history
      const historyRes = await axios.get(`${API_BASE}/historija/`);
      const allHistory: HistorijaSlusanja[] = historyRes.data || [];
      
      // Filter and sort by date (newest first)
      const userHistory = allHistory
        .filter((h) => h.korisnikID === korisnikID)
        .sort((a, b) => 
          new Date(b.kreiranDatumVrijeme || '').getTime() - 
          new Date(a.kreiranDatumVrijeme || '').getTime()
        );
      setHistory(userHistory);

      // Load all songs
      const songsRes = await axios.get(`${API_BASE}/pjesme/`);
      setSongs(songsRes.data || []);

      // Load user playlists
      const playlistsRes = await axios.get(`${API_BASE}/playliste/`);
      setPlaylists(playlistsRes.data || []);

      // Load user's song likes
      const likesRes = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const likes = likesRes.data as KorisnikPjesma[];
      const map: { [pjesmaId: number]: boolean } = {};
      likes.filter(v => v.korisnikID === korisnikID).forEach(v => {
        map[v.pjesmaID] = true;
      });
      setLikeMap(map);

    } catch (error) {
      console.error('Error loading history data:', error);
      Alert.alert(t('error'), t('error_loading_data') || 'Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistoryData();
  };

  const handleLikeSong = async (songId: number) => {
    if (!korisnikID) return;

    try {
      if (likeMap[songId]) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${songId}`);
        setLikeMap(prev => ({ ...prev, [songId]: false }));
        Alert.alert(t('success'), t('removed_from_favorites'));
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID,
          pjesmaID: songId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLikeMap(prev => ({ ...prev, [songId]: true }));
        Alert.alert(t('success'), t('added_to_favorites'));
      }
    } catch (error) {
      console.error('Error liking/unliking song:', error);
      Alert.alert(t('error'), t('error_favorites'));
    }
  };

  const handlePlaySong = (song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file'));
      return;
    }
    
    // Play song logic here
    console.log('Playing song:', song.naziv);
  };

  const handleAddToPlaylist = async (songId: number, playlistId: number) => {
    try {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID: songId,
        playlistaID: playlistId,
      });
      setShowPlaylistModal(null);
      Alert.alert(t('success'), t('song_added_to_playlist'));
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      setShowPlaylistModal(null);
      Alert.alert(t('error'), t('error_adding_to_playlist'));
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Combine history with song data
  const historySongs = history
    .map((h) => ({
      ...h,
      song: songs.find((s) => s.id === h.pjesmaID),
    }))
    .filter((h) => h.song && h.song.odobreno); // Show only approved songs

  const renderHistoryItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.songCard}>
      <View style={styles.songHeader}>
        <Image
          source={{ uri: item.song?.putanjaSlika || 'https://via.placeholder.com/50' }}
          style={styles.songImage}
        />
        
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {index + 1}. {item.song?.naziv}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.song?.korisnik?.korisnicko_ime || t('unknown_artist')}
          </Text>
          <Text style={styles.songDate}>
            {formatDate(item.kreiranDatumVrijeme)}
          </Text>
        </View>
      </View>
      
      <View style={styles.songActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlaySong(item.song)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            likeMap[item.pjesmaID] && styles.actionButtonLiked
          ]}
          onPress={() => handleLikeSong(item.pjesmaID)}
        >
          <MaterialIcons 
            name={likeMap[item.pjesmaID] ? "favorite" : "favorite-border"} 
            size={18} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPlaylistModal(item.pjesmaID)}
        >
          <MaterialIcons name="playlist-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
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
          <Text style={styles.title}>{t('history')}</Text>
          
          {historySongs.length === 0 ? (
            <Text style={styles.noSongs}>
              {t('no_history') || 'No listening history'}
            </Text>
          ) : (
            <FlatList
              data={historySongs}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Add to Playlist Modal */}
      <Modal
        visible={showPlaylistModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlaylistModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('add_to_playlist') || 'Add to Playlist'}
            </Text>
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playlistItem}
                  onPress={() => showPlaylistModal && handleAddToPlaylist(showPlaylistModal, item.id)}
                >
                  <Text style={styles.playlistItemText}>{item.naziv}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowPlaylistModal(null)}
            >
              <Text style={styles.modalCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Tabs currentRoute="history" />
    </View>
  );
};

export default Historija;

         
