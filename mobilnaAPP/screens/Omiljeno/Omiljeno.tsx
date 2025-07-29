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
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { 
  Pjesma, 
  Album, 
  Playlista, 
  Korisnik, 
  KorisnikPjesma, 
  KorisnikAlbum, 
  KorisnikPlaylista 
} from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Omiljeno.styles';

const Omiljeno: React.FC = () => {
  const { t } = useTranslation();
  const { tip } = useLocalSearchParams<{ tip: string }>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [korisnici, setKorisnici] = useState<Korisnik[]>([]);
  const [omiljenePjesme, setOmiljenePjesme] = useState<KorisnikPjesma[]>([]);
  const [omiljeniAlbumi, setOmiljeniAlbumi] = useState<KorisnikAlbum[]>([]);
  const [omiljenePlayliste, setOmiljenePlayliste] = useState<KorisnikPlaylista[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState<number | null>(null);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [likeMap, setLikeMap] = useState<{ [pjesmaId: number]: boolean }>({});
  const [likeAlbumMap, setLikeAlbumMap] = useState<{ [albumId: number]: boolean }>({});
  const [likePlaylistMap, setLikePlaylistMap] = useState<{ [playlistaId: number]: boolean }>({});

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (korisnikID) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [korisnikID, tip]);

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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        pjesmeData,
        albumiData,
        playlisteData,
        korisniciData,
        kpData,
        kaData,
        kplData,
        playlistsData
      ] = await Promise.all([
        axios.get(`${API_BASE}/pjesme/`).then(res => res.data).catch(() => []),
        axios.get(`${API_BASE}/albumi/`).then(res => res.data).catch(() => []),
        axios.get(`${API_BASE}/playliste/`).then(res => res.data).catch(() => []),
        axios.get(`${API_BASE}/korisnici/`).then(res => res.data).catch(() => []),
        axios.get(`${API_BASE}/korisnik_pjesma/`).then(res => res.data).catch(() => []),
        axios.get(`${API_BASE}/korisnik_album/`).then(res => res.data).catch(() => []),
        axios.get(`${API_BASE}/korisnik_playlista/`).then(res => res.data).catch(() => []),
        axios.get(`${API_BASE}/playliste/`).then(res => res.data).catch(() => []),
      ]);

      setPjesme(pjesmeData);
      setAlbumi(albumiData);
      setPlayliste(playlisteData);
      setKorisnici(korisniciData);
      setPlaylists(playlistsData);

      setOmiljenePjesme((kpData || []).filter((k: KorisnikPjesma) => k.korisnikID === korisnikID));
      setOmiljeniAlbumi((kaData || []).filter((k: KorisnikAlbum) => k.korisnikID === korisnikID));
      setOmiljenePlayliste((kplData || []).filter((k: KorisnikPlaylista) => k.korisnikID === korisnikID));

      const songLikeMap: { [pjesmaId: number]: boolean } = {};
      (kpData || []).filter((v: KorisnikPjesma) => v.korisnikID === korisnikID).forEach((v: KorisnikPjesma) => {
        songLikeMap[v.pjesmaID] = true;
      });
      setLikeMap(songLikeMap);

      const albumLikeMap: { [albumId: number]: boolean } = {};
      (kaData || []).filter((v: KorisnikAlbum) => v.korisnikID === korisnikID).forEach((v: KorisnikAlbum) => {
        albumLikeMap[v.albumID] = true;
      });
      setLikeAlbumMap(albumLikeMap);

      const playlistLikeMap: { [playlistaId: number]: boolean } = {};
      (kplData || []).filter((v: KorisnikPlaylista) => v.korisnikID === korisnikID).forEach((v: KorisnikPlaylista) => {
        playlistLikeMap[v.playlistaID] = true;
      });
      setLikePlaylistMap(playlistLikeMap);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('error'), t('error_loading_favorites') || 'Error loading favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlay = (p: Pjesma) => {
    if (!p.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    console.log('Playing song:', p.naziv);
  };

  const handlePlayAlbum = (albumId: number) => {
    const albumSongs = pjesme.filter(p => p.albumID === albumId && p.putanjaAudio && p.odobreno);
    if (albumSongs.length === 0) {
      Alert.alert(t('error'), t('no_songs_in_album') || 'No songs in this album');
      return;
    }
    
    handlePlay(albumSongs[0]);
  };

  const handlePlayPlaylist = async (playlistId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const songIds: number[] = res.data || [];
      
      if (songIds.length === 0) {
        Alert.alert(t('error'), t('empty_playlist') || 'Playlist is empty');
        return;
      }
      
      const firstSongRes = await axios.get(`${API_BASE}/pjesme/${songIds[0]}`);
      const firstSong = firstSongRes.data;
      
      if (firstSong && firstSong.putanjaAudio) {
        handlePlay(firstSong);
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert(t('error'), t('error_playing_playlist') || 'Error playing playlist');
    }
  };

  const handleLike = async (p: Pjesma) => {
    if (!korisnikID || !p.id) return;
    
    try {
      if (likeMap[p.id]) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${p.id}`);
        setLikeMap(prev => ({ ...prev, [p.id]: false }));
        Alert.alert(t('success'), t('removed_from_favorites') || 'Removed from favorites');
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID,
          pjesmaID: p.id,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLikeMap(prev => ({ ...prev, [p.id]: true }));
        Alert.alert(t('success'), t('added_to_favorites') || 'Added to favorites');
      }
    } catch (error) {
      console.error('Error liking song:', error);
      Alert.alert(t('error'), t('error_favorites') || 'Error updating favorites');
    }
  };

  const handleLikeAlbum = async (albumId: number) => {
    if (!korisnikID || !albumId) return;
    
    try {
      if (likeAlbumMap[albumId]) {
        await axios.delete(`${API_BASE}/korisnik_album/${korisnikID}/${albumId}`);
        setLikeAlbumMap(prev => ({ ...prev, [albumId]: false }));
        Alert.alert(t('success'), t('removed_from_favorites') || 'Removed from favorites');
      } else {
        await axios.post(`${API_BASE}/korisnik_album/`, {
          korisnikID,
          albumID: albumId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLikeAlbumMap(prev => ({ ...prev, [albumId]: true }));
        Alert.alert(t('success'), t('added_to_favorites') || 'Added to favorites');
      }
    } catch (error) {
      console.error('Error liking album:', error);
      Alert.alert(t('error'), t('error_favorites') || 'Error updating favorites');
    }
  };

  const handleLikePlaylist = async (playlistaId: number) => {
    if (!korisnikID || !playlistaId) return;
    
    try {
      if (likePlaylistMap[playlistaId]) {
        await axios.delete(`${API_BASE}/korisnik_playlista/${korisnikID}/${playlistaId}`);
        setLikePlaylistMap(prev => ({ ...prev, [playlistaId]: false }));
        Alert.alert(t('success'), t('removed_from_favorites') || 'Removed from favorites');
      } else {
        await axios.post(`${API_BASE}/korisnik_playlista/`, {
          korisnikID,
          playlistaID: playlistaId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLikePlaylistMap(prev => ({ ...prev, [playlistaId]: true }));
        Alert.alert(t('success'), t('added_to_favorites') || 'Added to favorites');
      }
    } catch (error) {
      console.error('Error liking playlist:', error);
      Alert.alert(t('error'), t('error_favorites') || 'Error updating favorites');
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
      Alert.alert(t('error'), t('error_adding_to_playlist') || 'Error adding song to playlist');
      setShowPlaylistModal(null);
    }
  };

  const renderSongItem = ({ item }: { item: KorisnikPjesma }) => {
    const p = pjesme.find(pp => pp.id === item.pjesmaID && pp.odobreno);
    if (!p) return null;

    const izvodjac = korisnici.find(k => k.id === p.korisnikID);

    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: p.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={styles.itemImage}
          contentFit="cover"
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {p.naziv}
          </Text>
          <Text style={styles.itemArtist} numberOfLines={1}>
            {izvodjac?.korisnicko_ime || t('unknown_artist')}
          </Text>
        </View>
        
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlay(p)}
          >
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              likeMap[p.id] && styles.actionButtonLiked
            ]}
            onPress={() => handleLike(p)}
          >
            <MaterialIcons 
              name={likeMap[p.id] ? "favorite" : "favorite-border"} 
              size={18} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowPlaylistModal(p.id)}
          >
            <MaterialIcons name="playlist-add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAlbumItem = ({ item }: { item: KorisnikAlbum }) => {
    const a = albumi.find(aa => aa.id === item.albumID);
    if (!a) return null;

    const izvodjac = korisnici.find(k => k.id === a.korisnikID);

    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: a.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={styles.itemImage}
          contentFit="cover"
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {a.naziv}
          </Text>
          <Text style={styles.itemArtist} numberOfLines={1}>
            {izvodjac?.korisnicko_ime || t('unknown_artist')}
          </Text>
        </View>
        
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlayAlbum(a.id)}
          >
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              likeAlbumMap[a.id] && styles.actionButtonLiked
            ]}
            onPress={() => handleLikeAlbum(a.id)}
          >
            <MaterialIcons 
              name={likeAlbumMap[a.id] ? "favorite" : "favorite-border"} 
              size={18} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPlaylistItem = ({ item }: { item: KorisnikPlaylista }) => {
    const pl = playliste.find(pll => pll.id === item.playlistaID);
    if (!pl) return null;

    const vlasnik = korisnici.find(k => k.id === pl.korisnikID);

    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: pl.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={styles.itemImage}
          contentFit="cover"
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {pl.naziv}
          </Text>
          <Text style={styles.itemArtist} numberOfLines={1}>
            {vlasnik?.korisnicko_ime || t('unknown_user')}
          </Text>
        </View>
        
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlayPlaylist(pl.id)}
          >
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              likePlaylistMap[pl.id] && styles.actionButtonLiked
            ]}
            onPress={() => handleLikePlaylist(pl.id)}
          >
            <MaterialIcons 
              name={likePlaylistMap[pl.id] ? "favorite" : "favorite-border"} 
              size={18} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  let content = null;
  let titleText = '';

  if (tip === 'pjesme') {
    titleText = t('favorites_songs') || 'Favorite Songs';
    content = omiljenePjesme.length === 0 ? (
      <Text style={styles.noItems}>
        {t('no_favorites_songs') || 'No favorite songs'}
      </Text>
    ) : (
      <FlatList
        data={omiljenePjesme}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.pjesmaID.toString()}
        scrollEnabled={false}
      />
    );
  } else if (tip === 'albumi') {
    titleText = t('favorites_albums') || 'Favorite Albums';
    content = omiljeniAlbumi.length === 0 ? (
      <Text style={styles.noItems}>
        {t('no_favorites_albums') || 'No favorite albums'}
      </Text>
    ) : (
      <FlatList
        data={omiljeniAlbumi}
        renderItem={renderAlbumItem}
        keyExtractor={(item) => item.albumID.toString()}
        scrollEnabled={false}
      />
    );
  } else if (tip === 'playliste') {
    titleText = t('favorites_playlists') || 'Favorite Playlists';
    content = omiljenePlayliste.length === 0 ? (
      <Text style={styles.noItems}>
        {t('no_favorites_playlists') || 'No favorite playlists'}
      </Text>
    ) : (
      <FlatList
        data={omiljenePlayliste}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.playlistaID.toString()}
        scrollEnabled={false}
      />
    );
  } else {
    titleText = t('favorites') || 'Favorites';
    content = (
      <Text style={styles.noItems}>
        {t('unknown_favorites_type') || 'Unknown favorites type'}
      </Text>
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
          <Text style={styles.title}>{titleText}</Text>
          {content}
        </View>
      </ScrollView>

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

      <Tabs currentRoute="favorites" />
    </View>
  );
};

export default Omiljeno;

