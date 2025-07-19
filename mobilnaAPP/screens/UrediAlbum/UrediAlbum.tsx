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
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Album, Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './UrediAlbum.styles';

const UrediAlbum: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { albumId } = useLocalSearchParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pjesmeAlbuma, setPjesmeAlbuma] = useState<Pjesma[]>([]);
  const [svePjesme, setSvePjesme] = useState<Pjesma[]>([]);
  const [removing, setRemoving] = useState<number | null>(null);
  const [dodajuci, setDodajuci] = useState<number | null>(null);
  const [korisnikID, setKorisnikID] = useState<string>('');

  // Form state
  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
  const [selectedImage, setSelectedImage] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [selectedGif, setSelectedGif] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (albumId && korisnikID) {
      loadData();
    }
  }, [albumId, korisnikID]);

  useEffect(() => {
    if (album) {
      setNaziv(album.naziv || '');
      setOpis(album.opis || '');
    }
  }, [album]);

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
    if (!albumId || !korisnikID) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load album
      const albumRes = await axios.get(`${API_BASE}/albumi/${albumId}`);
      setAlbum(albumRes.data);

      // Load songs
      const songsRes = await axios.get(`${API_BASE}/pjesme/`);
      const allSongs: Pjesma[] = songsRes.data || [];
      
      // Filter songs for this album and available songs
      const albumSongs = allSongs.filter(p => String(p.albumID) === String(albumId));
      const availableSongs = allSongs.filter(p => 
        p.korisnikID === korisnikID && (!p.albumID || String(p.albumID) === 'null' || p.albumID === null)
      );
      
      setPjesmeAlbuma(albumSongs);
      setSvePjesme(availableSongs);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(t('error_loading_album') || 'Error loading album');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleImagePick = async () => {
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
  };

  const handleGifPick = async () => {
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
  };

  const handleSubmit = async () => {
    if (!album || !korisnikID) return;
    
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('korisnikID', korisnikID);
      formData.append('naziv', naziv);
      formData.append('opis', opis);
      formData.append('kreiranDatumVrijeme', album.kreiranDatumVrijeme || '');
      formData.append('odobreno', String(album.odobreno || false));
      formData.append('javno', String(album.javno || false));
      formData.append('brojLajkova', String(album.brojLajkova || 0));

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

      await axios.put(`${API_BASE}/albumi/${album.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(t('album_updated_successfully') || 'Album updated successfully');
      
      setTimeout(() => {
        router.push(`/album/${album.id}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating album:', error);
      setError(t('error_updating_album') || 'Error updating album');
    }
  };

  const handleRemoveSong = async (pjesmaId: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('remove_song_from_album') || 'Remove song from album?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            setRemoving(pjesmaId);
            try {
              const pjesmaRes = await axios.get(`${API_BASE}/pjesme/${pjesmaId}`);
              const pjesma = pjesmaRes.data;
              
              await axios.put(`${API_BASE}/pjesme/${pjesmaId}`, {
                ...pjesma,
                albumID: null,
              });
              
              setPjesmeAlbuma(prev => prev.filter(p => p.id !== pjesmaId));
              setSvePjesme(prev => [...prev, pjesma]);
              
              Alert.alert(t('success'), t('song_removed_from_album') || 'Song removed from album');
            } catch (error) {
              console.error('Error removing song:', error);
              Alert.alert(t('error'), t('error_removing_song') || 'Error removing song');
            } finally {
              setRemoving(null);
            }
          }
        }
      ]
    );
  };

  const handleAddSong = async (pjesmaId: number) => {
    setDodajuci(pjesmaId);
    try {
      const pjesmaRes = await axios.get(`${API_BASE}/pjesme/${pjesmaId}`);
      const pjesma = pjesmaRes.data;
      
      await axios.put(`${API_BASE}/pjesme/${pjesmaId}`, {
        ...pjesma,
        albumID: Number(albumId),
      });
      
      setPjesmeAlbuma(prev => [...prev, pjesma]);
      setSvePjesme(prev => prev.filter(p => p.id !== pjesmaId));
      
      Alert.alert(t('success'), t('song_added_to_album') || 'Song added to album');
    } catch (error) {
      console.error('Error adding song:', error);
      Alert.alert(t('error'), t('error_adding_song') || 'Error adding song');
    } finally {
      setDodajuci(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSongItem = ({ item, isOnAlbum }: { item: Pjesma; isOnAlbum: boolean }) => (
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
          styles.actionButton,
          (removing === item.id || dodajuci === item.id) && styles.actionButtonDisabled
        ]}
        onPress={() => isOnAlbum ? handleRemoveSong(item.id) : handleAddSong(item.id)}
        disabled={removing === item.id || dodajuci === item.id}
      >
        <Text style={styles.actionButtonText}>
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

  if (!album) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <Text style={styles.unauthorizedText}>
            {t('album_not_found') || 'Album not found'}
          </Text>
        </View>
        <Tabs currentRoute="albums" />
      </View>
    );
  }

  if (album.korisnikID !== korisnikID) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <Text style={styles.unauthorizedText}>
            {t('no_permission_to_edit') || 'You do not have permission to edit this album'}
          </Text>
        </View>
        <Tabs currentRoute="albums" />
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
          <Text style={styles.title}>{t('edit_album') || 'Edit Album'}</Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('album_name') || 'Album Name'}</Text>
              <TextInput
                style={styles.input}
                value={naziv}
                onChangeText={setNaziv}
                placeholder={t('enter_album_name') || 'Enter album name'}
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

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {t('save_changes') || 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.songsSection}>
            <Text style={styles.sectionTitle}>
              {t('songs_on_album') || 'Songs on Album'}
            </Text>
            <View style={styles.songsContainer}>
              {pjesmeAlbuma.length === 0 ? (
                <Text style={styles.noSongsText}>
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

            <View style={styles.separator} />

            <Text style={styles.sectionTitle}>
              {t('add_songs') || 'Add Songs'}
            </Text>
            <View style={styles.songsContainer}>
              {svePjesme.length === 0 ? (
                <Text style={styles.noSongsText}>
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

      <Tabs currentRoute="albums" />
    </View>
  );
};

export default UrediAlbum;
