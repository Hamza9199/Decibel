import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Checkbox } from 'expo-checkbox';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './UrediPlaylistu.styles';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';

const UrediPlaylistu: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const { playlistaId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [korisnikID, setKorisnikID] = useState<string>('');
  const [removing, setRemoving] = useState<number | null>(null);

  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
  const [javno, setJavno] = useState(false);
  const [selectedImage, setSelectedImage] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [selectedGif, setSelectedGif] = useState<DocumentPicker.DocumentPickerAsset | null>(null);


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
      setKorisnikID(userId);
    };
    
    initializeUser();
  }, [loadUserData]);

  const playlistQuery = useQuery({
    queryKey: ['playlist', playlistaId],
    queryFn: async () => {
      if (!playlistaId) throw new Error('No playlist ID');
      const response = await axios.get(`${API_BASE}/playliste/${playlistaId}`);
      return response.data;
    },
    enabled: !!playlistaId,
    staleTime: 10 * 60 * 1000, 
  });

  // Query for playlist songs
  const songsQuery = useQuery({
    queryKey: ['playlistSongs', playlistaId],
    queryFn: async () => {
      if (!playlistaId) return [];
      
      const songsOrderRes = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistaId}`);
      const songIds: number[] = songsOrderRes.data || [];
      
      if (songIds.length === 0) return [];
      
      const songsPromises = songIds.map(id =>
        axios.get(`${API_BASE}/pjesme/${id}`)
          .then(r => r.data)
          .catch(() => null)
      );
      const songs = (await Promise.all(songsPromises)).filter(Boolean);
      return songs;
    },
    enabled: !!playlistaId,
    staleTime: 5 * 60 * 1000, 
  });

  useEffect(() => {
    if (playlistQuery.data) {
      const playlist = playlistQuery.data;
      setNaziv(playlist.naziv || '');
      setOpis(playlist.opis || '');
      setJavno(!!playlist.javno);
    }
  }, [playlistQuery.data]);

  const updatePlaylistMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!playlistQuery.data) throw new Error('No playlist data');
      return await axios.put(`${API_BASE}/playliste/${playlistQuery.data.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistaId] });
      setSuccess(t('playlist_updated_successfully') || 'Playlist updated successfully');
      setError(null);
      
      setTimeout(() => {
        router.push(`/playlista/${playlistQuery.data?.id}`);
      }, 1500);
    },
    onError: (error) => {
      console.error('Error updating playlist:', error);
      setError(t('error_updating_playlist') || 'Error updating playlist');
      setSuccess(null);
    }
  });

  const removeSongMutation = useMutation({
    mutationFn: async (pjesmaId: number) => {
      if (!playlistaId) throw new Error('No playlist ID');
      await axios.delete(`${API_BASE}/pjesma_playlista/obrisi-iz-playliste/${pjesmaId}/${playlistaId}`);
      return pjesmaId;
    },
    onSuccess: (pjesmaId) => {
      queryClient.setQueryData(['playlistSongs', playlistaId], (old: any) => 
        old ? old.filter((p: any) => p.id !== pjesmaId) : []
      );
      Alert.alert(t('success'), t('song_removed_from_playlist') || 'Song removed from playlist');
    },
    onError: (error) => {
      console.error('Error removing song:', error);
      Alert.alert(t('error'), t('error_removing_song') || 'Error removing song');
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistaId] }),
      queryClient.invalidateQueries({ queryKey: ['playlistSongs', playlistaId] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [playlistaId]);

  const handleImagePick = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: false,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('error'), t('error_picking_file') || 'Error picking file');
    }
  }, [t]);

  const handleGifPick = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/gif',
        copyToCacheDirectory: false,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedGif(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking GIF:', error);
      Alert.alert(t('error'), t('error_picking_file') || 'Error picking file');
    }
  }, [t]);

  const handleSubmit = useCallback(() => {
    if (!playlistQuery.data || !korisnikID) return;
    
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('korisnikID', korisnikID);
    formData.append('naziv', naziv);
    formData.append('opis', opis);
    formData.append('kreiranDatumVrijeme', playlistQuery.data.kreiranDatumVrijeme || '');
    formData.append('javno', String(javno));
    formData.append('brojLajkova', String(playlistQuery.data.brojLajkova || 0));

    if (selectedImage) {
      formData.append('file_slika', {
        uri: selectedImage.uri,
        type: selectedImage.mimeType || 'image/jpeg',
        name: selectedImage.name || 'image.jpg',
      } as any);
    }

    if (selectedGif) {
      formData.append('file_gif', {
        uri: selectedGif.uri,
        type: selectedGif.mimeType || 'image/gif',
        name: selectedGif.name || 'animation.gif',
      } as any);
    }

    updatePlaylistMutation.mutate(formData);
  }, [playlistQuery.data, korisnikID, naziv, opis, javno, selectedImage, selectedGif, updatePlaylistMutation]);

  const handleRemoveSong = useCallback((pjesmaId: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('remove_song_from_playlist') || 'Remove song from playlist?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: () => {
            setRemoving(pjesmaId);
            removeSongMutation.mutate(pjesmaId, {
              onSettled: () => setRemoving(null)
            });
          }
        }
      ]
    );
  }, [removeSongMutation, t]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => (
    <View style={styles.songItem}>
      <View style={styles.songInfo}>
        <Text style={styles.songName} numberOfLines={1}>
          {item.naziv}
        </Text>
        {item.trajanjeSekunde && (
          <Text style={styles.songDuration}>
            {formatDuration(item.trajanjeSekunde)}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.removeButton,
          removing === item.id && styles.removeButtonDisabled
        ]}
        onPress={() => handleRemoveSong(item.id)}
        disabled={removing === item.id}
      >
        <Text style={styles.removeButtonText}>
          {removing === item.id 
            ? (t('removing') || 'Removing...') 
            : (t('remove') || 'Remove')
          }
        </Text>
      </TouchableOpacity>
    </View>
  ), [removing, handleRemoveSong, formatDuration, t]);

  const hasPermission = useMemo(() => {
    return playlistQuery.data && playlistQuery.data.korisnikID === korisnikID;
  }, [playlistQuery.data, korisnikID]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = playlistQuery.isLoading || songsQuery.isLoading;
  const playlista = playlistQuery.data;
  const pjesme = songsQuery.data || [];

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
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <Text style={styles.unauthorizedText}>
            {t('playlist_not_found') || 'Playlist not found'}
          </Text>
        </View>
        <Tabs currentRoute="playlists" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <Text style={styles.unauthorizedText}>
            {t('no_permission_to_edit') || 'You do not have permission to edit this playlist'}
          </Text>
        </View>
        <Tabs currentRoute="playlists" />
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
          <Text style={styles.title}>{t('edit_playlist') || 'Edit Playlist'}</Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('playlist_name') || 'Playlist Name'}</Text>
              <TextInput
                style={styles.input}
                value={naziv}
                onChangeText={setNaziv}
                placeholder={t('enter_playlist_name') || 'Enter playlist name'}
                placeholderTextColor="#888"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('description') || 'Description'}</Text>
              <TextInput
                style={styles.textArea}
                value={opis}
                onChangeText={setOpis}
                placeholder={t('enter_description') || 'Enter description'}
                placeholderTextColor="#888"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('new_image_optional') || 'New Image (Optional)'}</Text>
              <TouchableOpacity style={styles.fileButton} onPress={handleImagePick}>
                <Text style={styles.fileButtonText}>
                  {t('select_image') || 'Select Image'}
                </Text>
              </TouchableOpacity>
              {selectedImage && (
                <Text style={styles.selectedFileText}>
                  {selectedImage.name || t('image_selected')}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('new_gif_optional') || 'New GIF (Optional)'}</Text>
              <TouchableOpacity style={styles.fileButton} onPress={handleGifPick}>
                <Text style={styles.fileButtonText}>
                  {t('select_gif') || 'Select GIF'}
                </Text>
              </TouchableOpacity>
              {selectedGif && (
                <Text style={styles.selectedFileText}>
                  {selectedGif.name || t('gif_selected')}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.checkboxContainer}>
                <Checkbox
                  value={javno}
                  onValueChange={setJavno}
                  color={javno ? '#b91d95' : undefined}
                />
                <Text style={styles.checkboxLabel}>
                  {t('public_playlist') || 'Public Playlist'}
                </Text>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={updatePlaylistMutation.isPending}
            >
              <Text style={styles.submitButtonText}>
                {updatePlaylistMutation.isPending 
                  ? t('saving') || 'Saving...'
                  : t('save_changes') || 'Save Changes'
                }
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.songsSection}>
            <Text style={styles.sectionTitle}>
              {t('songs_in_playlist') || 'Songs in Playlist'}
            </Text>
            <View style={styles.songsContainer}>
              {pjesme.length === 0 ? (
                <Text style={styles.noSongsText}>
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
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="playlists" />
    </View>
  );
});

UrediPlaylistu.displayName = "UrediPlaylistu";

export default UrediPlaylistu;
