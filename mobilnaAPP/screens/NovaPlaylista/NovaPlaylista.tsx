import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter,useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tabs from '@/komponente/Tabs/Tabs';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './NovaPlaylista.styles';
import { styles as lightStyles } from './NovaPlaylistaWhite.styles';
import { useMutation } from '@tanstack/react-query';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';

const NovaPlaylista: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
  const [imageFile, setImageFile] = useState<any>(null);
  const [gifFile, setGifFile] = useState<any>(null);
  const [javno, setJavno] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/nova-playlista', currentRoute: '/nova-playlista' });

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
        setKorisnikID(user?.id || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const createPlaylistMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await axios.post(`${API_BASE}/playliste/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      setSuccess(t('playlist_created_successfully') || 'Playlist created successfully!');
      setError(null);
      
      setNaziv('');
      setOpis('');
      setImageFile(null);
      setGifFile(null);
      setJavno(false);

      setTimeout(() => {
        navigateWithHistory('/sve-playliste');
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Error creating playlist:', error);
      setError(t('error_creating_playlist') || 'Error creating playlist');
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
    formData.append('javno', String(javno));

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

    createPlaylistMutation.mutate(formData);
  }, [naziv, korisnikID, opis, javno, imageFile, gifFile, createPlaylistMutation, t]);

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

  const toggleCheckbox = useCallback(() => {
    setJavno(!javno);
  }, [javno]);

  const handleBack = useCallback(() => {
    if (createPlaylistMutation.isPending) {
      Alert.alert(
        t('cancel_creation') || 'Cancel Creation',
        t('cancel_creation_confirmation') || 'Are you sure you want to cancel creating this playlist?',
        [
          { text: t('no') || 'No', style: 'cancel' },
          { text: t('yes') || 'Yes', onPress: () => navigateWithHistory('/sve-playliste') },
        ]
      );
    } else {
      navigateWithHistory('/sve-playliste');
    }
  }, [createPlaylistMutation.isPending, t]);

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

  const imagePickerButton = useMemo(() => (
    <TouchableOpacity
      style={activeStyles.fileButton}
      onPress={() => handleFilePicker('image')}
    >
      <Text style={activeStyles.fileButtonText}>
        {imageFile ? t('change_image') : t('select_image')}
      </Text>
    </TouchableOpacity>
  ), [imageFile, handleFilePicker, t, activeStyles]);

  const gifPickerButton = useMemo(() => (
    <TouchableOpacity
      style={activeStyles.fileButton}
      onPress={() => handleFilePicker('gif')}
    >
      <Text style={activeStyles.fileButtonText}>
        {gifFile ? t('change_gif') : t('select_gif')}
      </Text>
    </TouchableOpacity>
  ), [gifFile, handleFilePicker, t, activeStyles]);

   useScreenCleanup();
 

  if (createPlaylistMutation.isPending) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Back 
          title={t('creating_playlist') || 'Creating Playlist'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile?from=nova-playlista', '/nova-playlista')}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={activeStyles.loadingText}>{t('creating_playlist')}</Text>
        
        <Tabs currentRoute="nova-playlista" />
      </View>
    );
  }

  return (
    <View style={activeStyles.container}>
      <Back
        title={t('new_playlist') || 'New Playlist'}
        onBackPress={handleBackPress}
        onProfilePress={() => navigateWithHistory('/edit-profile?from=nova-playlista', '/nova-playlista')}
        source={from}
        />
      <ScrollView contentContainerStyle={activeStyles.scrollContainer}>
        <View style={activeStyles.content}>
          <Text style={activeStyles.title}>{t('new_playlist')}</Text>

          <View style={activeStyles.form}>
            <View>
              <Text style={activeStyles.label}>{t('playlist_name')} *:</Text>
              <TextInput
                style={[
                  activeStyles.input,
                  focusedField === 'naziv' && activeStyles.inputFocused,
                ]}
                value={naziv}
                onChangeText={setNaziv}
                onFocus={() => handleFocus('naziv')}
                onBlur={handleBlur}
                placeholder={t('playlist_name')}
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

            <TouchableOpacity style={activeStyles.checkboxContainer} onPress={toggleCheckbox}>
              <View style={[activeStyles.checkbox, javno && activeStyles.checkboxChecked]}>
                {javno && (
                  <MaterialIcons name="check" size={16} color="#fff" />
                )}
              </View>
              <Text style={activeStyles.checkboxLabel}>{t('public_playlist')}</Text>
            </TouchableOpacity>

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
                createPlaylistMutation.isPending && activeStyles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={createPlaylistMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={activeStyles.buttonText}>
                {createPlaylistMutation.isPending ? t('creating') || 'Creating...' : t('create_playlist')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={activeStyles.cancelButton}
              onPress={handleBack}
              disabled={createPlaylistMutation.isPending}
            >
              <Text style={activeStyles.cancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="nova-playlista" />
    </View>
  );
});

NovaPlaylista.displayName = "NovaPlaylista";

export default NovaPlaylista;