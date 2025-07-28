import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './NoviAlbum.styles';
import { useQuery, useMutation } from '@tanstack/react-query';

const NoviAlbum: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
  const [imageFile, setImageFile] = useState<any>(null);
  const [gifFile, setGifFile] = useState<any>(null);
  const [odabranePjesme, setOdabranePjesme] = useState<number[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');

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

  // Replace useMemo with useEffect for initial user data loading
  useEffect(() => {
    const initializeUser = async () => {
      const userId = await loadUserData();
      setKorisnikID(userId);
    };
    
    initializeUser();
  }, [loadUserData]);

  // Query for user songs
  const userSongsQuery = useQuery({
    queryKey: ['userSongs', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return [];
      
      const response = await axios.get(`${API_BASE}/pjesme/`);
      // Show only user's songs that are not already on an album
      return (response.data || []).filter(
        (p: Pjesma) => p.korisnikID === korisnikID && !p.albumID
      );
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating album
  const createAlbumMutation = useMutation({
    mutationFn: async ({ formData, albumSongs }: { formData: FormData; albumSongs: number[] }) => {
      // 1. Create album
      const albumRes = await axios.post(`${API_BASE}/albumi/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const albumId = albumRes.data.id;

      // 2. Add selected songs to album (if any)
      if (albumId && albumSongs.length > 0) {
        const svePjesme = userSongsQuery.data || [];
        await Promise.all(
          albumSongs.map(pjesmaId => {
            const pjesma = svePjesme.find((p: Pjesma) => p.id === pjesmaId);
            if (pjesma) {
              return axios.put(`${API_BASE}/pjesme/${pjesmaId}`, {
                ...pjesma,
                albumID: albumId,
              });
            }
            return Promise.resolve();
          })
        );
      }

      return albumRes.data;
    },
    onSuccess: () => {
      setSuccess(t('album_created_successfully') || 'Album created successfully!');
      setError(null);
      
      // Reset form
      setNaziv('');
      setOpis('');
      setImageFile(null);
      setGifFile(null);
      setOdabranePjesme([]);

      setTimeout(() => {
        router.back();
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Error creating album:', error);
      setError(t('error_creating_album') || 'Error creating album');
      setSuccess(null);
    }
  });

  const handleSubmit = useCallback(async () => {
    if (!naziv.trim()) {
      setError(t('fill_required_fields') || 'Please fill required fields');
      return;
    }

    if (!korisnikID) {
      setError(t('must_be_logged_in') || 'You must be logged in');
      return;
    }

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('korisnikID', korisnikID);
    formData.append('naziv', naziv.trim());
    formData.append('opis', opis.trim());

    if (imageFile) {
      formData.append('file_slika', {
        uri: imageFile.uri,
        type: imageFile.mimeType || 'image/jpeg',
        name: imageFile.name || 'image.jpg',
      } as any);
    }

    if (gifFile) {
      formData.append('file_gif', {
        uri: gifFile.uri,
        type: gifFile.mimeType || 'image/gif',
        name: gifFile.name || 'animation.gif',
      } as any);
    }

    createAlbumMutation.mutate({ formData, albumSongs: odabranePjesme });
  }, [naziv, korisnikID, opis, imageFile, gifFile, odabranePjesme, createAlbumMutation, t]);

  const handleTogglePjesma = useCallback((pjesmaId: number) => {
    setOdabranePjesme(prev =>
      prev.includes(pjesmaId)
        ? prev.filter(id => id !== pjesmaId)
        : [...prev, pjesmaId]
    );
  }, []);

  const handleFilePicker = useCallback(async (type: 'image' | 'gif') => {
    try {
      let options: any = {
        multiple: false,
        copyToCacheDirectory: true,
      };

      switch (type) {
        case 'image':
          options.type = ['image/*'];
          break;
        case 'gif':
          options.type = ['image/gif'];
          break;
      }

      const result = await DocumentPicker.getDocumentAsync(options);

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        switch (type) {
          case 'image':
            setImageFile(file);
            break;
          case 'gif':
            setGifFile(file);
            break;
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert(t('error'), t('error_picking_file') || 'Error picking file');
    }
  }, [t]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleFocus = useCallback((field: string) => {
    setFocusedField(field);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const handleButtonPressIn = useCallback(() => {
    setButtonPressed(true);
  }, []);

  const handleButtonPressOut = useCallback(() => {
    setButtonPressed(false);
  }, []);

  const formatDuration = useCallback((seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const renderSongItem = useCallback(({ item }: { item: Pjesma }) => {
    const isSelected = odabranePjesme.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.songItem, isSelected && styles.songItemSelected]}
        onPress={() => handleTogglePjesma(item.id)}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
          {isSelected && (
            <MaterialIcons name="check" size={16} color="#fff" />
          )}
        </View>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.naziv}
          </Text>
          <Text style={styles.songDuration}>
            {formatDuration(item.trajanjeSekunde)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [odabranePjesme, handleTogglePjesma, formatDuration]);

  // Memoize file picker buttons
  const imagePickerButton = useMemo(() => (
    <TouchableOpacity
      style={styles.fileButton}
      onPress={() => handleFilePicker('image')}
    >
      <Text style={styles.fileButtonText}>
        {imageFile ? t('change_image') : t('select_image')}
      </Text>
    </TouchableOpacity>
  ), [imageFile, handleFilePicker, t]);

  const gifPickerButton = useMemo(() => (
    <TouchableOpacity
      style={styles.fileButton}
      onPress={() => handleFilePicker('gif')}
    >
      <Text style={styles.fileButtonText}>
        {gifFile ? t('change_gif') : t('select_gif')}
      </Text>
    </TouchableOpacity>
  ), [gifFile, handleFilePicker, t]);

  if (createAlbumMutation.isPending) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('creating_album')}</Text>
      </View>
    );
  }

  const svePjesme = userSongsQuery.data || [];

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('new_album')}</Text>

          <View style={styles.form}>
            {/* Album Name */}
            <View>
              <Text style={styles.label}>{t('album_name')} *:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'naziv' && styles.inputFocused,
                ]}
                value={naziv}
                onChangeText={setNaziv}
                onFocus={() => handleFocus('naziv')}
                onBlur={handleBlur}
                placeholder={t('album_name')}
                placeholderTextColor="#888"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Description */}
            <View>
              <Text style={styles.label}>{t('description')} ({t('optional')}):</Text>
              <TextInput
                style={[
                  styles.textArea,
                  focusedField === 'opis' && styles.inputFocused,
                ]}
                value={opis}
                onChangeText={setOpis}
                onFocus={() => handleFocus('opis')}
                onBlur={handleBlur}
                placeholder={t('description')}
                placeholderTextColor="#888"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Image File */}
            <View style={styles.fileInputContainer}>
              <Text style={styles.label}>{t('image')}:</Text>
              {imagePickerButton}
              {imageFile && (
                <Text style={styles.fileName}>{imageFile.name}</Text>
              )}
            </View>

            {/* GIF File */}
            <View style={styles.fileInputContainer}>
              <Text style={styles.label}>GIF:</Text>
              {gifPickerButton}
              {gifFile && (
                <Text style={styles.fileName}>{gifFile.name}</Text>
              )}
            </View>

            {/* Songs Selection */}
            <View style={styles.songsSection}>
              <Text style={styles.sectionTitle}>
                {t('add_existing_songs') || 'Add Existing Songs'}
              </Text>
              {userSongsQuery.isLoading ? (
                <ActivityIndicator size="small" color="#b91d95" />
              ) : svePjesme.length === 0 ? (
                <Text style={styles.noSongs}>
                  {t('no_available_songs') || 'No available songs'}
                </Text>
              ) : (
                <FlatList
                  data={svePjesme}
                  renderItem={renderSongItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>

            {/* Error/Success Messages */}
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

            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.button,
                buttonPressed && styles.buttonPressed,
                createAlbumMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={createAlbumMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {createAlbumMutation.isPending ? t('creating') || 'Creating...' : t('create_album')}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleBack}
              disabled={createAlbumMutation.isPending}
            >
              <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="create" />
    </View>
  );
});

NoviAlbum.displayName = "NoviAlbum";

export default NoviAlbum;
