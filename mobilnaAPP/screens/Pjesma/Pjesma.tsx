import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
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
import { Pjesma, Korisnik, Komentar } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Pjesma.styles';

const PjesmePage: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { pjesmaId } = useLocalSearchParams<{ pjesmaId: string }>();
  
  const [pjesma, setPjesma] = useState<Pjesma | null>(null);
  const [izvodjaci, setIzvodjaci] = useState<Korisnik[]>([]);
  const [topPjesme, setTopPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [komentari, setKomentari] = useState<Komentar[]>([]);
  const [korisniciKomentara, setKorisniciKomentara] = useState<{ [id: string]: Korisnik }>({});
  const [noviKomentar, setNoviKomentar] = useState('');
  const [editKomentarId, setEditKomentarId] = useState<number | null>(null);
  const [editKomentarTekst, setEditKomentarTekst] = useState('');
  const [komentarError, setKomentarError] = useState<string | null>(null);
  const [izdavac, setIzdavac] = useState<Korisnik | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [mojID, setMojID] = useState<string>('');

  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setMojID(user?.id || '');
        return user?.id || '';
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return '';
  }, []);

  const loadComments = useCallback(async () => {
    if (!pjesmaId) return;

    try {
      const commentsRes = await axios.get(`${API_BASE}/komentari/`);
      const allComments: Komentar[] = commentsRes.data || [];
      const songComments = allComments.filter(k => String(k.pjesmaID) === String(pjesmaId));
      setKomentari(songComments);

      // Load comment users
      const userIds = Array.from(new Set(songComments.map(k => k.korisnikID)));
      const usersObj: { [id: string]: Korisnik } = {};
      
      await Promise.all(
        userIds.map(userId =>
          axios.get(`${API_BASE}/korisnici/${userId}`)
            .then(r => { usersObj[userId] = r.data; })
            .catch(() => {})
        )
      );
      setKorisniciKomentara(usersObj);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [pjesmaId]);

  const loadData = useCallback(async (userId?: string) => {
    if (!pjesmaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load song details
      const songRes = await axios.get(`${API_BASE}/pjesme/${pjesmaId}`);
      const songData = songRes.data;
      setPjesma(songData);
      setLikeCount(songData.brojLajkova || 0);

      const currentUserId = userId || mojID;
      // Check if user liked the song
      if (currentUserId) {
        const likesRes = await axios.get(`${API_BASE}/korisnik_pjesma/`);
        const veze = likesRes.data as { korisnikID: string; pjesmaID: number }[];
        setLiked(!!veze.find(v => v.korisnikID === currentUserId && String(v.pjesmaID) === String(pjesmaId)));
      }

      // Load publisher
      if (songData.korisnikID) {
        const publisherRes = await axios.get(`${API_BASE}/korisnici/${songData.korisnikID}`);
        setIzdavac(publisherRes.data);
      }

      // Load artists for song
      const artistsRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
      const artistConnections = artistsRes.data.filter((v: any) => String(v.pjesmaID) === String(pjesmaId));
      
      if (artistConnections.length > 0) {
        const artistPromises = artistConnections.map((v: any) =>
          axios.get(`${API_BASE}/korisnici/${v.izvodjacID}`)
            .then(r => r.data)
            .catch(() => null)
        );
        const artists = await Promise.all(artistPromises);
        setIzvodjaci(artists.filter(Boolean));
      }

      // Load recommended songs
      const allSongsRes = await axios.get(`${API_BASE}/pjesme/`);
      const topSongs = (allSongsRes.data || [])
        .filter((p: Pjesma) => String(p.id) !== String(pjesmaId) && p.odobreno)
        .sort((a: Pjesma, b: Pjesma) => (b.brojLajkova || 0) - (a.brojLajkova || 0))
        .slice(0, 6);
      setTopPjesme(topSongs);

      // Load comments
      await loadComments();

    } catch (error) {
      console.error('Error loading song data:', error);
      Alert.alert(t('error'), t('error_loading_song') || 'Error loading song');
      setPjesma(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pjesmaId, mojID, loadComments, t]);

  // Load user data and song data when component mounts
  useMemo(() => {
    loadUserData().then(userId => {
      if (pjesmaId) {
        loadData(userId);
      }
    });
  }, [pjesmaId, loadUserData, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handlePlay = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    // Play song logic
    console.log('Playing song:', song.naziv);
  }, [t]);

  const handleLike = useCallback(async () => {
    if (!pjesma || !mojID) return;

    try {
      if (liked) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${mojID}/${pjesma.id}`);
        setLiked(false);
        setLikeCount(prev => prev - 1);
        Alert.alert(t('success'), t('removed_from_favorites'));
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID: mojID,
          pjesmaID: pjesma.id,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLiked(true);
        setLikeCount(prev => prev + 1);
        Alert.alert(t('success'), t('added_to_favorites'));
      }
    } catch (error) {
      console.error('Error liking song:', error);
      Alert.alert(t('error'), t('error_favorites'));
    }
  }, [pjesma, mojID, liked, t]);

  const handleDodajKomentar = useCallback(async () => {
    setKomentarError(null);
    if (!mojID || !pjesmaId || !noviKomentar.trim()) {
      setKomentarError(t('comment_required') || 'Comment cannot be empty');
      return;
    }

    try {
      await axios.post(`${API_BASE}/komentari/`, {
        korisnikID: mojID,
        pjesmaID: Number(pjesmaId),
        tekst: noviKomentar.trim(),
        vrijemePjesmeSekunde: 0,
        kreiranDatumVrijeme: new Date().toISOString(),
      });
      setNoviKomentar('');
      await loadComments();
      Alert.alert(t('success'), t('comment_added') || 'Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      setKomentarError(t('error_adding_comment') || 'Error adding comment');
    }
  }, [mojID, pjesmaId, noviKomentar, loadComments, t]);

  const handleUrediKomentar = useCallback(async (id: number) => {
    setKomentarError(null);
    if (!editKomentarTekst.trim()) {
      setKomentarError(t('comment_required') || 'Comment cannot be empty');
      return;
    }

    try {
      await axios.put(`${API_BASE}/komentari/${id}`, {
        tekst: editKomentarTekst.trim(),
      });
      setEditKomentarId(null);
      setEditKomentarTekst('');
      await loadComments();
      Alert.alert(t('success'), t('comment_updated') || 'Comment updated successfully');
    } catch (error) {
      console.error('Error updating comment:', error);
      setKomentarError(t('error_updating_comment') || 'Error updating comment');
    }
  }, [editKomentarTekst, loadComments, t]);

  const handleEditCancel = useCallback(() => {
    setEditKomentarId(null);
    setEditKomentarTekst('');
  }, []);

  const handleEditStart = useCallback((id: number, text: string) => {
    setEditKomentarId(id);
    setEditKomentarTekst(text);
  }, []);

  const formatDuration = useCallback((seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const renderRecommendedItem = useCallback(({ item }: { item: Pjesma }) => (
    <View style={styles.recommendedCard}>
      <View style={styles.recommendedImageWrap}>
        <Image
          source={{ uri: item.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={styles.recommendedImage}
          contentFit="cover"
        />
        {item.putanjaAudio && (
          <TouchableOpacity
            style={styles.recommendedPlayBtn}
            onPress={() => handlePlay(item)}
          >
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.recommendedTitle} numberOfLines={2}>
        {item.naziv}
      </Text>
      <Text style={styles.recommendedArtist} numberOfLines={1}>
        {item.korisnik?.korisnicko_ime || t('unknown_artist')}
      </Text>
    </View>
  ), [handlePlay, t]);

  const renderCommentItem = useCallback(({ item }: { item: Komentar }) => {
    const user = korisniciKomentara[item.korisnikID];
    const isOwn = item.korisnikID === mojID;
    
    return (
      <View style={[styles.commentItem, isOwn && styles.commentItemOwn]}>
        <View style={styles.commentHeader}>
          <Image
            source={{ uri: user?.putanjaProfilneSlike || 'https://via.placeholder.com/50' }}
            style={styles.commentUserImage}
            contentFit="cover"
          />
          <View style={styles.commentUserInfo}>
            <Text style={styles.commentUserName}>
              {user?.korisnicko_ime || t('user')}
              {isOwn && ` (${t('you')})`}
            </Text>
            <Text style={styles.commentDate}>
              {item.kreiranDatumVrijeme ? new Date(item.kreiranDatumVrijeme).toLocaleString() : ''}
            </Text>
          </View>
        </View>
        
        {editKomentarId === item.id ? (
          <View>
            <TextInput
              style={styles.commentEditInput}
              value={editKomentarTekst}
              onChangeText={setEditKomentarTekst}
              multiline
              placeholder={t('edit_comment')}
              placeholderTextColor="#888"
            />
            <View style={styles.commentEditActions}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => handleUrediKomentar(item.id)}
              >
                <Text style={styles.saveButtonText}>{t('save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleEditCancel}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.commentText}>{item.tekst}</Text>
            {isOwn && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditStart(item.id, item.tekst)}
              >
                <Text style={styles.editButtonText}>{t('edit')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }, [korisniciKomentara, mojID, editKomentarId, editKomentarTekst, handleUrediKomentar, handleEditCancel, handleEditStart, t]);

  // Memoize sorted comments to show owner's comment first
  const komentariSortirani = useMemo(() => {
    if (!mojID) return komentari;
    const vlasnikKomentar = komentari.find(k => k.korisnikID === mojID);
    const ostali = komentari.filter(k => k.korisnikID !== mojID);
    return vlasnikKomentar ? [vlasnikKomentar, ...ostali] : ostali;
  }, [komentari, mojID]);

  // Memoize song meta data
  const songMeta = useMemo(() => [
    { label: t('duration'), value: formatDuration(pjesma?.trajanjeSekunde) },
    ...(pjesma?.zanr ? [{ label: t('genre'), value: pjesma.zanr }] : []),
    { label: t('likes'), value: likeCount.toString() },
  ], [pjesma?.trajanjeSekunde, pjesma?.zanr, likeCount, formatDuration, t]);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  if (!pjesma) {
    return (
      <View style={styles.notFoundContainer}>
        <Header />
        <MaterialIcons name="music-note" size={64} color="#666" />
        <Text style={styles.notFoundText}>
          {t('song_not_found') || 'Song not found'}
        </Text>
        <Tabs currentRoute="song" />
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
          {/* Song Main Section */}
          <View style={styles.songMain}>
            <View style={styles.songImageWrap}>
              <Image
                source={{ uri: pjesma.putanjaSlika || 'https://via.placeholder.com/300' }}
                style={styles.songImage}
                contentFit="cover"
              />
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.likeButton, liked && styles.likeButtonLiked]}
                  onPress={handleLike}
                >
                  <MaterialIcons 
                    name={liked ? 'favorite' : 'favorite-border'} 
                    size={24} 
                    color="#fff" 
                  />
                  <Text style={styles.likeCount}>{likeCount}</Text>
                </TouchableOpacity>
                
                {pjesma.putanjaAudio && (
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handlePlay(pjesma)}
                  >
                    <MaterialIcons name="play-arrow" size={32} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.songInfo}>
              <Text style={styles.songTitle}>{pjesma.naziv}</Text>
              
              {pjesma.opis && (
                <Text style={styles.songDescription}>{pjesma.opis}</Text>
              )}

              <View style={styles.songMeta}>
                {songMeta.map((meta, index) => (
                  <View key={index} style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{meta.label}:</Text>
                    <Text style={styles.metaValue}>{meta.value}</Text>
                  </View>
                ))}
              </View>

              {/* Artists Section */}
              <View style={styles.artistsSection}>
                <View style={styles.artistsRow}>
                  <Text style={styles.artistsLabel}>{t('publisher')}:</Text>
                  {izdavac ? (
                    <View style={styles.artistItem}>
                      <Image
                        source={{ uri: izdavac.putanjaProfilneSlike || 'https://via.placeholder.com/50' }}
                        style={styles.artistImage}
                        contentFit="cover"
                      />
                      <Text style={styles.artistName}>{izdavac.korisnicko_ime}</Text>
                    </View>
                  ) : (
                    <Text style={styles.artistName}>{t('unknown')}</Text>
                  )}
                </View>

                <View style={styles.artistsRow}>
                  <Text style={styles.artistsLabel}>{t('artists')}:</Text>
                  {izvodjaci.length === 0 ? (
                    <Text style={styles.artistName}>{t('unknown')}</Text>
                  ) : (
                    izvodjaci.map(artist => (
                      <View key={artist.id} style={styles.artistItem}>
                        <Image
                          source={{ uri: artist.putanjaProfilneSlike || 'https://via.placeholder.com/50' }}
                          style={styles.artistImage}
                          contentFit="cover"
                        />
                        <Text style={styles.artistName}>{artist.korisnicko_ime}</Text>
                      </View>
                    ))
)}
                </View>
              </View>
            </View>
          </View>

          {/* Recommended Songs */}
          <Text style={styles.sectionTitle}>{t('recommended_songs')}</Text>
          <FlatList
            data={topPjesme}
            renderItem={renderRecommendedItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.recommendedGrid}
          />

          {/* Comments Section */}
          <Text style={styles.sectionTitle}>{t('comments')}</Text>
          
          <View style={styles.commentForm}>
            <TextInput
              style={styles.commentInput}
              value={noviKomentar}
              onChangeText={setNoviKomentar}
              placeholder={t('add_comment')}
              placeholderTextColor="#888"
              multiline
            />
            
            <View style={styles.commentActions}>
              {komentarError && (
                <Text style={styles.errorText}>{komentarError}</Text>
              )}
              <TouchableOpacity
                style={styles.commentButton}
                onPress={handleDodajKomentar}
              >
                <Text style={styles.commentButtonText}>{t('add_comment')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {komentariSortirani.length === 0 ? (
            <Text style={styles.noComments}>{t('no_comments')}</Text>
          ) : (
            <FlatList
              data={komentariSortirani}
              renderItem={renderCommentItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      <Tabs currentRoute="song" />
    </View>
  );
});

PjesmePage.displayName = "PjesmePage";

export default PjesmePage;
