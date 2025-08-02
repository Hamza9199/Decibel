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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tabs from '@/komponente/Tabs/Tabs';
import { API_BASE } from '@/config/api';
import { styles } from './NovaPjesma.styles';
import { useMutation } from '@tanstack/react-query';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';

const NovaPjesma: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
  const [trajanjeSekunde, setTrajanjeSekunde] = useState('');
  const [genre, setGenre] = useState('');
  const [audioFile, setAudioFile] = useState<any>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [gifFile, setGifFile] = useState<any>(null);
  const [javno, setJavno] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/nova-pjesma' });

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

  const createSongMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await axios.post(`${API_BASE}/pjesme/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      setSuccess(t('song_created_successfully') || 'Song created successfully!');
      setError(null);
      
      setNaziv('');
      setOpis('');
      setTrajanjeSekunde('');
      setGenre('');
      setAudioFile(null);
      setImageFile(null);
      setGifFile(null);
      setJavno(false);

      setTimeout(() => {
        router.back();
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Error creating song:', error);
      setError(t('error_creating_song') || 'Error creating song');
      setSuccess(null);
    }
  });

  const handleSubmit = useCallback(async () => {
    if (!naziv.trim() || !audioFile) {
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
    formData.append('genre', genre.trim());
    formData.append('javno', String(javno));
    
    if (trajanjeSekunde) {
      formData.append('trajanjeSekunde', trajanjeSekunde);
    }

    if (audioFile) {
      formData.append('file_audio', {
        uri: audioFile.uri,
        type: audioFile.mimeType || 'audio/mpeg',
        name: audioFile.name || 'audio.mp3',
      } as any);
    }

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

    createSongMutation.mutate(formData);
  }, [naziv, audioFile, korisnikID, opis, genre, trajanjeSekunde, javno, imageFile, gifFile, createSongMutation, t]);

  const handleFilePicker = useCallback(async (type: 'audio' | 'image' | 'gif') => {
    try {
      let options: any = {
        multiple: false,
        copyToCacheDirectory: true,
      };

      switch (type) {
        case 'audio':
          options.type = ['audio/*'];
          break;
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
          case 'audio':
            setAudioFile(file);
            break;
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

  const audioPickerButton = useMemo(() => (
    <TouchableOpacity
      style={styles.fileButton}
      onPress={() => handleFilePicker('audio')}
    >
      <Text style={styles.fileButtonText}>
        {audioFile ? t('change_audio') : t('select_audio')}
      </Text>
    </TouchableOpacity>
  ), [audioFile, handleFilePicker, t]);

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

    useScreenCleanup();
  

  if (createSongMutation.isPending) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('creating_song')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Back
        title={t('new_song') || 'New Song'}
        onBackPress={handleBackPress}
        onProfilePress={() => router.push('/profile')}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('new_song')}</Text>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>{t('song_name')} *:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'naziv' && styles.inputFocused,
                ]}
                value={naziv}
                onChangeText={setNaziv}
                onFocus={() => handleFocus('naziv')}
                onBlur={handleBlur}
                placeholder={t('song_name')}
                placeholderTextColor="#888"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text style={styles.label}>{t('description')}:</Text>
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

            <View>
              <Text style={styles.label}>{t('genre')}:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'genre' && styles.inputFocused,
                ]}
                value={genre}
                onChangeText={setGenre}
                onFocus={() => handleFocus('genre')}
                onBlur={handleBlur}
                placeholder={t('genre')}
                placeholderTextColor="#888"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text style={styles.label}>{t('duration_seconds')}:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'trajanje' && styles.inputFocused,
                ]}
                value={trajanjeSekunde}
                onChangeText={setTrajanjeSekunde}
                onFocus={() => handleFocus('trajanje')}
                onBlur={handleBlur}
                placeholder="180"
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fileInputContainer}>
              <Text style={styles.label}>{t('audio_file')} *:</Text>
              {audioPickerButton}
              {audioFile && (
                <Text style={styles.fileName}>{audioFile.name}</Text>
              )}
            </View>

            <View style={styles.fileInputContainer}>
              <Text style={styles.label}>{t('image')}:</Text>
              {imagePickerButton}
              {imageFile && (
                <Text style={styles.fileName}>{imageFile.name}</Text>
              )}
            </View>

            <View style={styles.fileInputContainer}>
              <Text style={styles.label}>GIF:</Text>
              {gifPickerButton}
              {gifFile && (
                <Text style={styles.fileName}>{gifFile.name}</Text>
              )}
            </View>

            <TouchableOpacity style={styles.checkboxContainer} onPress={toggleCheckbox}>
              <View style={[styles.checkbox, javno && styles.checkboxChecked]}>
                {javno && (
                  <MaterialIcons name="check" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>{t('public_song')}</Text>
            </TouchableOpacity>

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
              style={[
                styles.button,
                buttonPressed && styles.buttonPressed,
                createSongMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={createSongMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {createSongMutation.isPending ? t('creating') || 'Creating...' : t('create_song')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleBack}
              disabled={createSongMutation.isPending}
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

NovaPjesma.displayName = "NovaPjesma";

export default NovaPjesma;
