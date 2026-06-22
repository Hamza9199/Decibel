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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './UrediAlbum.styles';
import { styles as lightStyles } from './UrediAlbumWhite.styles';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';
import { useLocalSearchParams } from 'expo-router';


const UrediAlbum: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { albumId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [dodajuci, setDodajuci] = useState<number | null>(null);
  const [korisnikID, setKorisnikID] = useState<string>('');

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;

  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: `/uredi-album/${albumId}`, currentRoute: `/uredi-album/${albumId}` });

  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
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

  const albumQuery = useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      if (!albumId) throw new Error('No album ID');
      const response = await axios.get(`${API_BASE}/albumi/${albumId}`);
      return response.data;
    },
    enabled: !!albumId,
    staleTime: 10 * 60 * 1000, 
  });

  const songsQuery = useQuery({
    queryKey: ['songs', korisnikID],
    enabled: !!korisnikID,
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pjesme/korisnik/${korisnikID}`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, 
  });

  useEffect(() => {
    if (albumQuery.data) {
      setNaziv(albumQuery.data.naziv || '');
      setOpis(albumQuery.data.opis || '');
    }
  }, [albumQuery.data]);

  const updateAlbumMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!albumQuery.data) throw new Error('No album data');
      return await axios.put(`${API_BASE}/albumi/${albumQuery.data.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      setSuccess(t('album_updated_successfully') || 'Album updated successfully');
      
      setTimeout(() => {
        navigateWithHistory('/svi-albumi', `/uredi-album/${albumId}`);
      }, 1500);
    },
    onError: (error) => {
      console.error('Error updating album:', error);
      setError(t('error_updating_album') || 'Error updating album');
    }
  });

  const removeSongMutation = useMutation({
    mutationFn: async (pjesmaId: number) => {
      await axios.delete(`${API_BASE}/albumi/${albumId}/pjesme/${pjesmaId}`);
      return { pjesmaId };
    },
    onSuccess: ({ pjesmaId }) => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      Alert.alert(t('success'), t('song_removed_from_album') || 'Song removed from album');
    },
    onError: (error) => {
      console.error('Error removing song:', error);
      Alert.alert(t('error'), t('error_removing_song') || 'Error removing song');
    }
  });

  const addSongMutation = useMutation({
    mutationFn: async (pjesmaId: number) => {
      await axios.post(`${API_BASE}/albumi/${albumId}/pjesme/${pjesmaId}`);
      return { pjesmaId };
    },
    onSuccess: ({ pjesmaId }) => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      Alert.alert(t('success'), t('song_added_to_album') || 'Song added to album');
    },
    onError: (error) => {
      console.error('Error adding song:', error);
      Alert.alert(t('error'), t('error_adding_song') || 'Error adding song');
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['album', albumId] }),
      queryClient.invalidateQueries({ queryKey: ['songs'] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [albumId]);

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
    if (!albumQuery.data || !korisnikID) return;
    
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('korisnikID', korisnikID);
    formData.append('naziv', naziv);
    formData.append('opis', opis);
    formData.append('kreiranDatumVrijeme', albumQuery.data.kreiranDatumVrijeme || '');
    formData.append('odobreno', String(albumQuery.data.odobreno || false));
    formData.append('javno', String(albumQuery.data.javno || false));
    formData.append('brojLajkova', String(albumQuery.data.brojLajkova || 0));

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

    updateAlbumMutation.mutate(formData);
  }, [albumQuery.data, korisnikID, naziv, opis, selectedImage, selectedGif, updateAlbumMutation]);

  const handleRemoveSong = useCallback((pjesmaId: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('remove_song_from_album') || 'Remove song from album?',
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

  const handleAddSong = useCallback((pjesmaId: number) => {
    setDodajuci(pjesmaId);
    addSongMutation.mutate(pjesmaId, {
      onSettled: () => setDodajuci(null)
    });
  }, [addSongMutation]);

  const { pjesmeAlbuma, svePjesme } = useMemo(() => {
    const allSongs = songsQuery.data || [];
    
    const albumSongs = allSongs.filter((p: Pjesma) => String(p.albumID) === String(albumId) && p.odobreno);
    const availableSongs = allSongs.filter((p: Pjesma) => 
      p.korisnikID === korisnikID && p.odobreno && (!p.albumID || String(p.albumID) === 'null' || p.albumID === null)
    );
    
    return {
      pjesmeAlbuma: albumSongs,
      svePjesme: availableSongs
    };
  }, [songsQuery.data, albumId, korisnikID]);

  const handleNavigateToSong = useCallback((songId: number) => {
    navigateWithHistory(`/pjesma/${songId}?from=uredi-album`, `/uredi-album/${albumId}`);
  }, [albumId]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const renderSongItem = useCallback(({ item, isOnAlbum }: { item: Pjesma; isOnAlbum: boolean }) => (
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
      <TouchableOpacity
        style={[
          activeStyles.actionButton,
          (removing === item.id || dodajuci === item.id) && activeStyles.actionButtonDisabled
        ]}
        onPress={() => isOnAlbum ? handleRemoveSong(item.id) : handleAddSong(item.id)}
        disabled={removing === item.id || dodajuci === item.id}
      >
        <Text style={activeStyles.actionButtonText}>
          {removing === item.id 
            ? (t('removing') || 'Removing...') 
            : dodajuci === item.id 
            ? (t('adding') || 'Adding...')
            : isOnAlbum 
            ? (t('remove') || 'Remove')
            : (t('add') || 'Add')
          }
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [activeStyles.songItem, activeStyles.songInfo, activeStyles.songName, activeStyles.songDuration, activeStyles.actionButton, activeStyles.actionButtonDisabled, activeStyles.actionButtonText, formatDuration, removing, dodajuci, t, handleRemoveSong, handleAddSong, handleNavigateToSong]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const hasPermission = useMemo(() => {
    return albumQuery.data && albumQuery.data.korisnikID === korisnikID;
  }, [albumQuery.data, korisnikID]);

  const loading = albumQuery.isLoading || songsQuery.isLoading;

  if (loading) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Back
          title={t('loading_album') || 'Loading Album...'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-album/${albumId}`)}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={activeStyles.loadingText}>{t('loading')}</Text>
        <Tabs currentRoute={`/uredi-album/${albumId}`} />
      </View>
    );
  }

  if (!albumQuery.data) {
    return (
      <View style={activeStyles.container}>
        <Back 
          title={t('album_not_found') || 'Album Not Found'}
          onBackPress={handleBackPress} 
          onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-album/${albumId}`)}
          source={from}
        />
        <View style={activeStyles.loadingContainer}>
          <Text style={activeStyles.unauthorizedText}>
            {t('album_not_found') || 'Album not found'}
          </Text>
        </View>
        <Tabs currentRoute="albums" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={activeStyles.container}>
        <Back
          title={t('no_permission_to_edit') || 'No Permission to Edit'}
          onBackPress={handleBackPress} 
          onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-album/${albumId}`)}
          source={from}
        />
        <View style={activeStyles.loadingContainer}>
          <Text style={activeStyles.unauthorizedText}>
            {t('no_permission_to_edit') || 'You do not have permission to edit this album'}
          </Text>
        </View>
        <Tabs currentRoute="albums" />
      </View>
    );
  }

  return (
    <View style={activeStyles.container}>
      <Back
        title={naziv}
        onBackPress={handleBackPress} 
        onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-album/${albumId}`)}
        source={from}
        />
      <ScrollView
        contentContainerStyle={activeStyles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={activeStyles.content}>
          <Text style={activeStyles.title}>{t('edit_album') || 'Edit Album'}</Text>

          <View style={activeStyles.formContainer}>
            <View style={activeStyles.inputContainer}>
              <Text style={activeStyles.label}>{t('album_name') || 'Album Name'}</Text>
              <TextInput
                style={activeStyles.input}
                value={naziv}
                onChangeText={setNaziv}
                placeholder={t('enter_album_name') || 'Enter album name'}
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
              disabled={updateAlbumMutation.isPending}
            >
              <Text style={activeStyles.submitButtonText}>
                {updateAlbumMutation.isPending 
                  ? t('saving') || 'Saving...'
                  : t('save_changes') || 'Save Changes'
                }
              </Text>
            </TouchableOpacity>
          </View>

          <View style={activeStyles.songsSection}>
            <Text style={activeStyles.sectionTitle}>
              {t('songs_on_album') || 'Songs on Album'}
            </Text>
            <View style={activeStyles.songsContainer}>
              {pjesmeAlbuma.length === 0 ? (
                <Text style={activeStyles.noSongsText}>
                  {t('no_songs_on_album') || 'No songs on this album'}
                </Text>
              ) : (
                <FlatList
                  data={pjesmeAlbuma}
                  renderItem={({ item }) => renderSongItem({ item, isOnAlbum: true })}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>

            <View style={activeStyles.separator} />

            <Text style={activeStyles.sectionTitle}>
              {t('add_songs') || 'Add Songs'}
            </Text>
            <View style={activeStyles.songsContainer}>
              {svePjesme.length === 0 ? (
                <Text style={activeStyles.noSongsText}>
                  {t('no_available_songs') || 'No available songs'}
                </Text>
              ) : (
                <FlatList
                  data={svePjesme}
                  renderItem={({ item }) => renderSongItem({ item, isOnAlbum: false })}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute={`/uredi-album/${albumId}`} />
    </View>
  );
});

UrediAlbum.displayName = "UrediAlbum";

export default UrediAlbum;