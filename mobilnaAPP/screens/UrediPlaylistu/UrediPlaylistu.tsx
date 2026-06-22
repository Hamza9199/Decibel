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
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Checkbox } from 'expo-checkbox';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './UrediPlaylistu.styles';
import { styles as lightStyles } from './UrediPlaylistuWhite.styles';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';


const UrediPlaylistu: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { playlistaId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [korisnikID, setKorisnikID] = useState<string>('');

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;

  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: `/uredi-playlistu/${playlistaId}`, currentRoute: `/uredi-playlistu/${playlistaId}` });

  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
  const [javno, setJavno] = useState(false);
  const [selectedImage, setSelectedImage] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [selectedGif, setSelectedGif] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useScreenCleanup();

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
        navigateWithHistory(`/playlista/${playlistQuery.data?.id}`, `/uredi-playlistu/${playlistaId}`);
      }, 1500);
    },
    onError: (error) => {
      console.error('Error updating playlist:', error);
      setError(t('error_updating_playlist') || 'Error updating playlist');
      setSuccess(null);
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

  const handleNavigateToSong = useCallback((songId: number) => {
    navigateWithHistory(`/pjesma/${songId}?from=uredi-playlistu`, `/uredi-playlistu/${playlistaId}`);
  }, [playlistaId]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => (
    <TouchableOpacity style={activeStyles.songItem} onPress={() => handleNavigateToSong(item.id)}>
      <View style={activeStyles.songInfo}>
        <Text style={activeStyles.songName} numberOfLines={1}>
          {item.naziv}
        </Text>
        {item.trajanjeSekunde && (
          <Text style={activeStyles.songDuration}>
            {formatDuration(item.trajanjeSekunde)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ), [activeStyles.songItem, activeStyles.songInfo, activeStyles.songName, activeStyles.songDuration, formatDuration, handleNavigateToSong]);

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
      <View style={activeStyles.loadingContainer}>
        <Back
          title={t('loading_playlist') || 'Loading Playlist...'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-playlistu/${playlistaId}`)}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={activeStyles.loadingText}>{t('loading')}</Text>
        <Tabs currentRoute={`/uredi-playlistu/${playlistaId}`} />
      </View>
    );
  }

  if (!playlista) {
    return (
      <View style={activeStyles.container}>
        <Back
          title={t('playlist_not_found') || 'Playlist Not Found'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-playlistu/${playlistaId}`)}
          source={from}
          />
        <View style={activeStyles.loadingContainer}>
          <Text style={activeStyles.unauthorizedText}>
            {t('playlist_not_found') || 'Playlist not found'}
          </Text>
        </View>
        <Tabs currentRoute={`/uredi-playlistu/${playlistaId}`} />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={activeStyles.container}>
        <Back
          title={t('no_permission_to_edit') || 'No Permission to Edit'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-playlistu/${playlistaId}`)}
          source={from}
          />
        <View style={activeStyles.loadingContainer}>
          <Text style={activeStyles.unauthorizedText}>
            {t('no_permission_to_edit') || 'You do not have permission to edit this playlist'}
          </Text>
        </View>
        <Tabs currentRoute={`/uredi-playlistu/${playlistaId}`} />
      </View>
    );
  }

  return (
    <View style={activeStyles.container}>
      <Back
        title={playlista.naziv || t('edit_playlist') || 'Edit Playlist'}
        onBackPress={handleBackPress}
        onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-playlistu/${playlistaId}`)}
        source={from}
       />
      <ScrollView
        contentContainerStyle={activeStyles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={activeStyles.content}>
          <Text style={activeStyles.title}>{t('edit_playlist') || 'Edit Playlist'}</Text>

          <View style={activeStyles.formContainer}>
            <View style={activeStyles.inputContainer}>
              <Text style={activeStyles.label}>{t('playlist_name') || 'Playlist Name'}</Text>
              <TextInput
                style={activeStyles.input}
                value={naziv}
                onChangeText={setNaziv}
                placeholder={t('enter_playlist_name') || 'Enter playlist name'}
                placeholderTextColor="#888"
              />
            </View>

            <View style={activeStyles.inputContainer}>
              <Text style={activeStyles.label}>{t('description') || 'Description'}</Text>
              <TextInput
                style={activeStyles.textArea}
                value={opis}
                onChangeText={setOpis}
                placeholder={t('enter_description') || 'Enter description'}
                placeholderTextColor="#888"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={activeStyles.inputContainer}>
              <Text style={activeStyles.label}>{t('new_image_optional') || 'New Image (Optional)'}</Text>
              <TouchableOpacity style={activeStyles.fileButton} onPress={handleImagePick}>
                <Text style={activeStyles.fileButtonText}>
                  {t('select_image') || 'Select Image'}
                </Text>
              </TouchableOpacity>
              {selectedImage && (
                <Text style={activeStyles.selectedFileText}>
                  {selectedImage.name || t('image_selected')}
                </Text>
              )}
            </View>

            <View style={activeStyles.inputContainer}>
              <Text style={activeStyles.label}>{t('new_gif_optional') || 'New GIF (Optional)'}</Text>
              <TouchableOpacity style={activeStyles.fileButton} onPress={handleGifPick}>
                <Text style={activeStyles.fileButtonText}>
                  {t('select_gif') || 'Select GIF'}
                </Text>
              </TouchableOpacity>
              {selectedGif && (
                <Text style={activeStyles.selectedFileText}>
                  {selectedGif.name || t('gif_selected')}
                </Text>
              )}
            </View>

            <View style={activeStyles.inputContainer}>
              <View style={activeStyles.checkboxContainer}>
                <Checkbox
                  value={javno}
                  onValueChange={setJavno}
                  color={javno ? '#b91d95' : undefined}
                />
                <Text style={activeStyles.checkboxLabel}>
                  {t('public_playlist') || 'Public Playlist'}
                </Text>
              </View>
            </View>

            {error && (
              <View style={activeStyles.errorContainer}>
                <Text style={activeStyles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={activeStyles.successContainer}>
                <Text style={activeStyles.successText}>{success}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={activeStyles.submitButton} 
              onPress={handleSubmit}
              disabled={updatePlaylistMutation.isPending}
            >
              <Text style={activeStyles.submitButtonText}>
                {updatePlaylistMutation.isPending 
                  ? t('saving') || 'Saving...'
                  : t('save_changes') || 'Save Changes'
                }
              </Text>
            </TouchableOpacity>
          </View>

          <View style={activeStyles.songsSection}>
            <Text style={activeStyles.sectionTitle}>
              {t('songs_in_playlist') || 'Songs in Playlist'}
            </Text>
            <View style={activeStyles.songsContainer}>
              {pjesme.length === 0 ? (
                <Text style={activeStyles.noSongsText}>
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

      <Tabs currentRoute={`/uredi-playlistu/${playlistaId}`}/>
    </View>
  );
});

UrediPlaylistu.displayName = "UrediPlaylistu";

export default UrediPlaylistu;