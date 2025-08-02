import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma, Korisnik, Komentar } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Pjesma.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import Back from '@/komponente/Back/Back';
import { useBackPress } from '@/hooks/handleBackPress';


interface PjesmaProps {
  navigiranSa: string;
}

const PjesmePage: React.FC<PjesmaProps> = React.memo(({ 
  navigiranSa
})=> {
  const { t } = useTranslation();
  const { pjesmaId, from } = useLocalSearchParams<{ pjesmaId: string; from?: string }>();
  
  const [refreshing, setRefreshing] = useState(false);
  const [noviKomentar, setNoviKomentar] = useState('');
  const [editKomentarId, setEditKomentarId] = useState<number | null>(null);
  const [editKomentarTekst, setEditKomentarTekst] = useState('');
  const [komentarError, setKomentarError] = useState<string | null>(null);
  const [mojID, setMojID] = useState<string>('');

  const handleBackPress = useBackPress({ from, defaultRoute: '/' });

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
      setMojID(userId);
    };
    
    initializeUser();
  }, [loadUserData]);

  const songQuery = useQuery({
    queryKey: ['song', pjesmaId],
    queryFn: async () => {
      if (!pjesmaId) throw new Error('No song ID');
      const response = await axios.get(`${API_BASE}/pjesme/${pjesmaId}`);
      return response.data;
    },
    enabled: !!pjesmaId,
    staleTime: 10 * 60 * 1000, 
  });

  const publisherQuery = useQuery({
    queryKey: ['publisher', songQuery.data?.korisnikID],
    queryFn: async () => {
      if (!songQuery.data?.korisnikID) return null;
      const response = await axios.get(`${API_BASE}/korisnici/${songQuery.data.korisnikID}`);
      return response.data;
    },
    enabled: !!songQuery.data?.korisnikID,
    staleTime: 10 * 60 * 1000,
  });

  const artistsQuery = useQuery({
    queryKey: ['songArtists', pjesmaId],
    queryFn: async () => {
      if (!pjesmaId) return [];
      
      const artistsRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
      const artistConnections = artistsRes.data.filter((v: any) => String(v.pjesmaID) === String(pjesmaId));
      
      if (artistConnections.length === 0) return [];
      
      const artistPromises = artistConnections.map((v: any) =>
        axios.get(`${API_BASE}/korisnici/${v.izvodjacID}`)
          .then(r => r.data)
          .catch(() => null)
      );
      const artists = await Promise.all(artistPromises);
      return artists.filter(Boolean);
    },
    enabled: !!pjesmaId,
    staleTime: 10 * 60 * 1000, 
  });

  const recommendedQuery = useQuery({
    queryKey: ['recommendedSongs', pjesmaId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pjesme/`);
      return (response.data || [])
        .filter((p: Pjesma) => String(p.id) !== String(pjesmaId) && p.odobreno)
        .sort((a: Pjesma, b: Pjesma) => (b.brojLajkova || 0) - (a.brojLajkova || 0))
        .slice(0, 6);
    },
    enabled: !!pjesmaId,
    staleTime: 10 * 60 * 1000, 
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', pjesmaId],
    queryFn: async () => {
      if (!pjesmaId) return { comments: [], users: {} };
      
      const commentsRes = await axios.get(`${API_BASE}/komentari/`);
      const allComments: Komentar[] = commentsRes.data || [];
      const songComments = allComments.filter(k => String(k.pjesmaID) === String(pjesmaId));

      const userIds = Array.from(new Set(songComments.map(k => k.korisnikID)));
      const usersObj: { [id: string]: Korisnik } = {};
      
      await Promise.all(
        userIds.map(userId =>
          axios.get(`${API_BASE}/korisnici/${userId}`)
            .then(r => { usersObj[userId] = r.data; })
            .catch(() => {})
        )
      );

      return { comments: songComments, users: usersObj };
    },
    enabled: !!pjesmaId,
    staleTime: 2 * 60 * 1000, 
  });

  const likeQuery = useQuery({
    queryKey: ['songLike', pjesmaId, mojID],
    queryFn: async () => {
      if (!mojID || !pjesmaId) return false;
      
      const likesRes = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const veze = likesRes.data as { korisnikID: string; pjesmaID: number }[];
      return !!veze.find(v => v.korisnikID === mojID && String(v.pjesmaID) === String(pjesmaId));
    },
    enabled: !!(mojID && pjesmaId),
    staleTime: 5 * 60 * 1000, 
  });

  const likeMutation = useMutation({
    mutationFn: async ({ isLiked }: { isLiked: boolean }) => {
      if (!mojID || !pjesmaId) throw new Error('Missing data');
      
      if (isLiked) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${mojID}/${pjesmaId}`);
        return false;
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID: mojID,
          pjesmaID: Number(pjesmaId),
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        return true;
      }
    },
    onSuccess: (liked) => {
      queryClient.setQueryData(['songLike', pjesmaId, mojID], liked);
      queryClient.setQueryData(['song', pjesmaId], (old: any) => ({
        ...old,
        brojLajkova: (old?.brojLajkova || 0) + (liked ? 1 : -1)
      }));
      
    },
    onError: (error) => {
      console.error('Error liking song:', error);
      Alert.alert(t('error'), t('error_favorites'));
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!mojID || !pjesmaId) throw new Error('Missing data');
      
      await axios.post(`${API_BASE}/komentari/`, {
        korisnikID: mojID,
        pjesmaID: Number(pjesmaId),
        tekst: commentText.trim(),
        vrijemePjesmeSekunde: 0,
        kreiranDatumVrijeme: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setNoviKomentar('');
      setKomentarError(null);
      queryClient.invalidateQueries({ queryKey: ['comments', pjesmaId] });
      Alert.alert(t('success'), t('comment_added') || 'Comment added successfully');
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      setKomentarError(t('error_adding_comment') || 'Error adding comment');
    }
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      await axios.put(`${API_BASE}/komentari/${id}`, {
        tekst: text.trim(),
      });
    },
    onSuccess: () => {
      setEditKomentarId(null);
      setEditKomentarTekst('');
      setKomentarError(null);
      queryClient.invalidateQueries({ queryKey: ['comments', pjesmaId] });
      Alert.alert(t('success'), t('comment_updated') || 'Comment updated successfully');
    },
    onError: (error) => {
      console.error('Error updating comment:', error);
      setKomentarError(t('error_updating_comment') || 'Error updating comment');
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['song', pjesmaId] }),
      queryClient.invalidateQueries({ queryKey: ['publisher'] }),
      queryClient.invalidateQueries({ queryKey: ['songArtists', pjesmaId] }),
      queryClient.invalidateQueries({ queryKey: ['recommendedSongs', pjesmaId] }),
      queryClient.invalidateQueries({ queryKey: ['comments', pjesmaId] }),
      queryClient.invalidateQueries({ queryKey: ['songLike', pjesmaId, mojID] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [pjesmaId, mojID]);

  const handlePlay = useCallback((song: Pjesma) => {
    if (!song.putanjaAudio) {
      Alert.alert(t('error'), t('no_audio_file') || 'This song has no audio file');
      return;
    }
    
    console.log('Playing song:', song.naziv);
  }, [t]);

  const handleLike = useCallback(() => {
    const isLiked = likeQuery.data || false;
    likeMutation.mutate({ isLiked });
  }, [likeQuery.data, likeMutation]);

  const handleDodajKomentar = useCallback(() => {
    setKomentarError(null);
    if (!mojID || !pjesmaId || !noviKomentar.trim()) {
      setKomentarError(t('comment_required') || 'Comment cannot be empty');
      return;
    }

    addCommentMutation.mutate(noviKomentar);
  }, [mojID, pjesmaId, noviKomentar, addCommentMutation, t]);

  const handleUrediKomentar = useCallback((id: number) => {
    setKomentarError(null);
    if (!editKomentarTekst.trim()) {
      setKomentarError(t('comment_required') || 'Comment cannot be empty');
      return;
    }

    editCommentMutation.mutate({ id, text: editKomentarTekst });
  }, [editKomentarTekst, editCommentMutation, t]);

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
    const user = commentsQuery.data?.users[item.korisnikID];
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
  }, [commentsQuery.data?.users, mojID, editKomentarId, editKomentarTekst, handleUrediKomentar, handleEditCancel, handleEditStart, t]);

  const komentariSortirani = useMemo(() => {
    const komentari = commentsQuery.data?.comments || [];
    if (!mojID) return komentari;
    const vlasnikKomentar = komentari.find(k => k.korisnikID === mojID);
    const ostali = komentari.filter(k => k.korisnikID !== mojID);
    return vlasnikKomentar ? [vlasnikKomentar, ...ostali] : ostali;
  }, [commentsQuery.data?.comments, mojID]);

  const songMeta = useMemo(() => {
    const pjesma = songQuery.data;
    const likeCount = pjesma?.brojLajkova || 0;
    
    return [
      { label: t('duration'), value: formatDuration(pjesma?.trajanjeSekunde) },
      ...(pjesma?.zanr ? [{ label: t('genre'), value: pjesma.zanr }] : []),
      { label: t('likes'), value: likeCount.toString() },
    ];
  }, [songQuery.data, formatDuration, t]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = songQuery.isLoading || publisherQuery.isLoading || artistsQuery.isLoading || recommendedQuery.isLoading || commentsQuery.isLoading;
  const pjesma = songQuery.data;
  const izdavac = publisherQuery.data;
  const izvodjaci = artistsQuery.data || [];
  const topPjesme = recommendedQuery.data || [];
  const liked = likeQuery.data || false;
  const likeCount = pjesma?.brojLajkova || 0;

    useScreenCleanup();
  

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
      <Back 
        title={pjesma.naziv} 
        onBackPress={handleBackPress} 
        onProfilePress={() => router.push('/profile')} 
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
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

          <Text style={styles.sectionTitle}>{t('recommended_songs')}</Text>
          <FlatList
            data={topPjesme}
            renderItem={renderRecommendedItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.recommendedGrid}
          />

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
                disabled={addCommentMutation.isPending}
              >
                <Text style={styles.commentButtonText}>
                  {addCommentMutation.isPending ? t('adding') : t('add_comment')}
                </Text>
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
