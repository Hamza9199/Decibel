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
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './NoviAlbum.styles';
import { styles as lightStyles } from './NoviAlbumWhite.styles';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';
import Loading from '@/komponente/Loading/Loading';

const NoviAlbum: React.FC = React.memo(() => {
  const { t } = useTranslation();
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/novi-album', currentRoute: '/novi-album' });

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

  const userSongsQuery = useQuery({
    queryKey: ['userSongs', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return [];
      
      const response = await axios.get(
          `${API_BASE}/pjesme/korisnik/${korisnikID}`
        );

        return (response.data || []).filter(
          (p: Pjesma) => !p.albumID
        );
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, 
  });

  const createAlbumMutation = useMutation({
    mutationFn: async ({ formData, albumSongs }: { formData: FormData; albumSongs: number[] }) => {
      const albumRes = await axios.post(`${API_BASE}/albumi/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const albumId = albumRes.data.id;

        if (albumId && albumSongs.length > 0) {
            await Promise.all(
              albumSongs.map((pjesmaId) =>
                axios.post(
                  `${API_BASE}/albumi/${albumId}/pjesme/${pjesmaId}`
                )
              )
            );
        }

      return albumRes.data;
    },
    onSuccess: () => {
      setSuccess(t('album_created_successfully') || 'Album created successfully!');
      setError(null);
      
      setNaziv('');
      setOpis('');
      setImageFile(null);
      setGifFile(null);
      setOdabranePjesme([]);

      setTimeout(() => {
        navigateWithHistory('/svi-albumi');
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
    navigateWithHistory('/svi-albumi');
  }, []);

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
        style={[activeStyles.songItem, isSelected && activeStyles.songItemSelected]}
        onPress={() => handleTogglePjesma(item.id)}
      >
        <View style={[activeStyles.checkbox, isSelected && activeStyles.checkboxChecked]}>
          {isSelected && (
            <MaterialIcons name="check" size={16} color="#fff" />
          )}
        </View>
        <View style={activeStyles.songInfo}>
          <Text style={activeStyles.songTitle} numberOfLines={1}>
            {item.naziv}
          </Text>
          <Text style={activeStyles.songDuration}>
            {formatDuration(item.trajanjeSekunde)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [odabranePjesme, activeStyles.songItem, activeStyles.songItemSelected, activeStyles.checkbox, activeStyles.checkboxChecked, activeStyles.songInfo, activeStyles.songTitle, activeStyles.songDuration, formatDuration, handleTogglePjesma]);

  const imagePickerButton = useMemo(() => (
    <TouchableOpacity
      style={activeStyles.fileButton}
      onPress={() => handleFilePicker('image')}
    >
      <Text style={activeStyles.fileButtonText}>
        {imageFile ? t('change_image') : t('select_image')}
      </Text>
    </TouchableOpacity>
  ), [activeStyles.fileButton, activeStyles.fileButtonText, imageFile, t, handleFilePicker]);

  const gifPickerButton = useMemo(() => (
    <TouchableOpacity
      style={activeStyles.fileButton}
      onPress={() => handleFilePicker('gif')}
    >
      <Text style={activeStyles.fileButtonText}>
        {gifFile ? t('change_gif') : t('select_gif')}
      </Text>
    </TouchableOpacity>
  ), [activeStyles.fileButton, activeStyles.fileButtonText, gifFile, handleFilePicker, t]);

    useScreenCleanup();
  

  if (createAlbumMutation.isPending) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Back
          title={t('new_album') || 'New Album'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile?from=novi-album', '/novi-album')}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Loading />
        <Tabs currentRoute="novi-album" />
      </View>
    );
  }

  const svePjesme = userSongsQuery.data || [];

  return (
    <View style={activeStyles.container}>
      <Back
        title={t('new_album') || 'New Album'}
        onBackPress={handleBackPress}
        onProfilePress={() => navigateWithHistory('/edit-profile?from=novi-album', '/novi-album')}
        source={from}
      />
      <ScrollView contentContainerStyle={activeStyles.scrollContainer}>
        <View style={activeStyles.content}>
          <Text style={activeStyles.title}>{t('new_album')}</Text>

          <View style={activeStyles.form}>
            <View>
              <Text style={activeStyles.label}>{t('album_name')} *:</Text>
              <TextInput
                style={[
                  activeStyles.input,
                  focusedField === 'naziv' && activeStyles.inputFocused,
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

            <View>
              <Text style={activeStyles.label}>{t('description')} ({t('optional')}):</Text>
              <TextInput
                style={[
                  activeStyles.textArea,
                  focusedField === 'opis' && activeStyles.inputFocused,
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

            <View style={activeStyles.fileInputContainer}>
              <Text style={activeStyles.label}>{t('image')}:</Text>
              {imagePickerButton}
              {imageFile && (
                <Text style={activeStyles.fileName}>{imageFile.name}</Text>
              )}
            </View>

            <View style={activeStyles.fileInputContainer}>
              <Text style={activeStyles.label}>GIF:</Text>
              {gifPickerButton}
              {gifFile && (
                <Text style={activeStyles.fileName}>{gifFile.name}</Text>
              )}
            </View>

            <View style={activeStyles.songsSection}>
              <Text style={activeStyles.sectionTitle}>
                {t('add_existing_songs') || 'Add Existing Songs'}
              </Text>
              {userSongsQuery.isLoading ? (
                <ActivityIndicator size="small" color="#b91d95" />
              ) : svePjesme.length === 0 ? (
                <Text style={activeStyles.noSongs}>
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
              style={[
                activeStyles.button,
                buttonPressed && activeStyles.buttonPressed,
                createAlbumMutation.isPending && activeStyles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={createAlbumMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={activeStyles.buttonText}>
                {createAlbumMutation.isPending ? t('create_album') || 'Creating...' : t('create_album')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={activeStyles.cancelButton}
              onPress={handleBack}
              disabled={createAlbumMutation.isPending}
            >
              <Text style={activeStyles.cancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="novi-album" />
    </View>
  );
});

NoviAlbum.displayName = "NoviAlbum";

export default NoviAlbum;