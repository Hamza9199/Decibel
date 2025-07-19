import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma, KorisnikPjesma, Playlista as PlaylistaType } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Playlista.styles';

const Playlista: React.FC = () => {
  const { t } = useTranslation();
  const { playlistaId } = useLocalSearchParams<{ playlistaId: string }>();
  
  const [playlista, setPlaylista] = useState<PlaylistaType | null>(null);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repeatAll, setRepeatAll] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [likeMap, setLikeMap] = useState<{ [pjesmaId: number]: boolean }>({});
  const [showPlaylistModal, setShowPlaylistModal] = useState<number | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistaType[]>([]);
  const [likePlaylist, setLikePlaylist] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (playlistaId && korisnikID) {
      loadData();
    }
  }, [playlistaId, korisnikID]);

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
    if (!playlistaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load playlist details
      const playlistRes = await axios.get(`${API_BASE}/playliste/${playlistaId}`);
      const playlistData = playlistRes.data;
      setPlaylista(playlistData);
      setLikeCount(playlistData.brojLajkova || 0);
      setIsOwner(playlistData.korisnikID === korisnikID);

      // Load songs in playlist using order from backend
      const songsOrderRes = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistaId}`);
      const songIds: number[] = songsOrderRes.data || [];
      
      if (songIds.length === 0) {
        setPjesme([]);
      } else {
        const songsPromises = songIds.map(id =>
          axios.get(`${API_BASE}/pjesme/${id}`)
            .then(r => r.data)
            .catch(() => null)
        );
        const songsData = await Promise.all(songsPromises);
        setPjesme(songsData.filter(Boolean));
      }

      // Load user's liked songs
      const likedSongsRes = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const userLikedSongs = likedSongsRes.data as KorisnikPjesma[];
      const likeMap: { [pjesmaId: number]: boolean } = {};
      userLikedSongs
        .filter(v => v.korisnikID === korisnikID)
        .forEach(v => { likeMap[v.pjesmaID] = true; });
      setLikeMap(likeMap);

      // Load all playlists for modal
      const playlistsRes = await axios.get(`${API_BASE}/playliste/`);
      setPlaylists(playlistsRes.data || []);

      // Check if user liked this playlist
      if (korisnikID && playlistaId) {
        const likedPlaylistsRes = await axios.get(`${API_BASE}/korisnik_playlista/`);
        const userLikedPlaylists = likedPlaylistsRes.data as { korisnikID: string; playlistaID: number }[];
        setLikePlaylist(!!userLikedPlaylists.find(v => 
          v.korisnikID === korisnikID && String(v.playlistaID) === String(playlistaId)
        ));
      }

    } catch (error) {
      console.error('Error loading playlist data:', error);
      Alert.alert(t('error'), t('error_loading_playlist') || 'Error loading playlist');
      setPlaylista(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlaySong = (song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    // Play song logic
    console.log('Playing song:', song.naziv);
  };

  const handlePlayPlaylist = () => {
    if (pjesme.length === 0) {
      Alert.alert(t('error'), t('empty_playlist') || 'Playlist is empty');
      return;
    }
    
    // Play first song from playlist
    const firstSong = pjesme[0];
    if (firstSong?.putanjaAudio) {
      handlePlaySong(firstSong);
    }
  };

  const handleLikeSong = async (pjesmaId: number) => {
    if (!korisnikID || !pjesmaId) return;
    
    try {
      if (likeMap[pjesmaId]) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${pjesmaId}`);
        setLikeMap(prev => ({ ...prev, [pjesmaId]: false }));
        Alert.alert(t('success'), t('removed_from_favorites'));
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID,
          pjesmaID: pjesmaId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLikeMap(prev => ({ ...prev, [pjesmaId]: true }));
        Alert.alert(t('success'), t('added_to_favorites'));
      }
    } catch (error) {
      console.error('Error liking/unliking song:', error);
      Alert.alert(t('error'), t('error_favorites'));
    }
  };

  const handleLikeThisPlaylist = async () => {
    if (!korisnikID || !playlistaId) return;
    
    try {
      if (likePlaylist) {
        await axios.delete(`${API_BASE}/korisnik_playlista/${korisnikID}/${playlistaId}`);
        setLikePlaylist(false);
        setLikeCount(prev => prev - 1);
        Alert.alert(t('success'), t('removed_from_favorites'));
      } else {
        await axios.post(`${API_BASE}/korisnik_playlista/`, {
          korisnikID,
          playlistaID: Number(playlistaId),
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLikePlaylist(true);
        setLikeCount(prev => prev + 1);
        Alert.alert(t('success'), t('added_to_favorites'));
      }
    } catch (error) {
      console.error('Error liking/unliking playlist:', error);
      Alert.alert(t('error'), t('error_favorites'));
    }
  };

  const handleAddToPlaylist = async (pjesmaID: number, playlistaID: number) => {
    try {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID,
        playlistaID,
      });
      setShowPlaylistModal(null);
      Alert.alert(t('success'), t('song_added_to_playlist') || 'Song added to playlist!');
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      setShowPlaylistModal(null);
      Alert.alert(t('error'), t('error_adding_to_playlist') || 'Error adding song to playlist');
    }
  };

  const handleRemoveSong = async (pjesmaId: number) => {
    if (!playlistaId) return;
    
    Alert.alert(
      t('confirm_action'),
      t('remove_song_from_playlist_confirm') || 'Are you sure you want to remove this song from the playlist?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/pjesma_playlista/obrisi-iz-playliste/${pjesmaId}/${playlistaId}`);
              setPjesme(prev => prev.filter(p => p.id !== pjesmaId));
              Alert.alert(t('success'), t('song_removed_from_playlist') || 'Song removed from playlist');
            } catch (error) {
              console.error('Error removing song from playlist:', error);
              Alert.alert(t('error'), t('error_removing_song') || 'Error removing song from playlist');
            }
          }
        }
      ]
    );
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSongItem = ({ item, index }: { item: Pjesma; index: number }) => (
    <View style={styles.songItem}>
      <View style={styles.songHeader}>
        <Text style={styles.songNumber}>{index + 1}</Text>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.naziv}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.korisnik?.korisnicko_ime || t('unknown_artist')}
          </Text>
        </View>
        <Text style={styles.songDuration}>
          {formatDuration(item.trajanjeSekunde)}
        </Text>
      </View>
      
      <View style={styles.songActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlaySong(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            likeMap[item.id] && styles.actionButtonLiked
          ]}
          onPress={() => handleLikeSong(item.id)}
        >
          <MaterialIcons 
            name={likeMap[item.id] ? 'favorite' : 'favorite-border'} 
            size={18} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPlaylistModal(item.id)}
        >
          <MaterialIcons name="playlist-add" size={20} color="#fff" />
        </TouchableOpacity>
        
        {isOwner && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonRemove]}
            onPress={() => handleRemoveSong(item.id)}
          >
            <MaterialIcons name="delete" size={18} color="#fff" />
          </TouchableOpacity>
        )}
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

  if (!playlista) {
    return (
      <View style={styles.notFoundContainer}>
        <Header />
        <MaterialIcons name="queue-music" size={64} color="#666" />
        <Text style={styles.notFoundText}>
          {t('playlist_not_found') || 'Playlist not found'}
        </Text>
        <Tabs currentRoute="playlist" />
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
          {/* Playlist Main Section */}
          <View style={styles.playlistMain}>
            <View style={styles.playlistImageWrap}>
              <Image
                source={{ uri: playlista.putanjaSlika || 'https://via.placeholder.com/300' }}
                style={styles.playlistImage}
                contentFit="cover"
              />
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={handlePlayPlaylist}
                >
                  <MaterialIcons name="play-arrow" size={32} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.likeButton, likePlaylist && styles.likeButtonLiked]}
                  onPress={handleLikeThisPlaylist}
                >
                  <MaterialIcons 
                    name={likePlaylist ? 'favorite' : 'favorite-border'} 
                    size={24} 
                    color="#fff" 
                  />
                  <Text style={styles.likeCount}>{likeCount}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.repeatButton, repeatAll && styles.repeatButtonActive]}
                  onPress={() => setRepeatAll(prev => !prev)}
                >
                  <MaterialIcons name="repeat" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.playlistInfo}>
              <Text style={styles.playlistTitle}>{playlista.naziv}</Text>
              
              {playlista.opis && (
                <Text style={styles.playlistDescription}>{playlista.opis}</Text>
              )}

              <View style={styles.playlistMeta}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('number_of_songs')}:</Text>
                  <Text style={styles.metaValue}>{pjesme.length}</Text>
                </View>
                
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('number_of_likes')}:</Text>
                  <Text style={styles.metaValue}>{likeCount}</Text>
                </View>
                
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('public_playlist')}:</Text>
                  <Text style={styles.metaValue}>
                    {playlista.javno ? t('yes') : t('no')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Songs Section */}
          <Text style={styles.sectionTitle}>
            {t('songs_in_playlist') || 'Songs in Playlist'}
          </Text>
          
          {pjesme.length === 0 ? (
            <Text style={styles.noSongs}>
              {t('no_songs_in_playlist') || 'No songs in this playlist'}
            </Text>
          ) : (
            <FlatList
              data={pjesme}
              renderItem={renderSongItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
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
              data={playlists.filter(pl => String(pl.id) !== String(playlistaId))}
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

      <Tabs currentRoute="playlist" />
    </View>
  );
};

export default Playlista;
                                 