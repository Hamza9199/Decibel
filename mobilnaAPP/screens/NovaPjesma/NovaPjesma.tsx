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
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import axios, { isAxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tabs from '@/komponente/Tabs/Tabs';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './NovaPjesma.styles';
import { styles as lightStyles } from './NovaPjesmaWhite.styles';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';
import { Korisnik, Album } from '@/types';
import { Picker } from '@react-native-picker/picker';
import Loading from '@/komponente/Loading/Loading';

const NovaPjesma: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
  const [trajanjeSekunde, setTrajanjeSekunde] = useState('');
  const [genre, setGenre] = useState('');
  const [zanr, setZanr] = useState('');
  const [audioFile, setAudioFile] = useState<any>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [gifFile, setGifFile] = useState<any>(null);
  const [javno, setJavno] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');
  const [albumID, setAlbumID] = useState<number | ''>('');
  const [izabraniIzvodjaci, setIzabraniIzvodjaci] = useState<Korisnik[]>([]);
  const [searchIzvodjac, setSearchIzvodjac] = useState('');
  const [jezikPjesme, setJezikPjesme] = useState('');
  const [eksplicitniSadrzaj, setEksplicitniSadrzaj] = useState(false);
  const [datumObjave, setDatumObjave] = useState(new Date().toISOString().split('T')[0]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/nova-pjesma', currentRoute: '/nova-pjesma' });

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

  const albumiQuery = useQuery<Album[]>({
    queryKey: ['albumi', korisnikID],
    enabled: !!korisnikID,
    queryFn: async () => {
      try {
        const response = await axios.get(`${API_BASE}/albumi/`);
        return (response.data || []).filter((a: Album) => String(a.korisnikID) === String(korisnikID));
      } catch (error) {
        console.error('Error fetching albums:', error);
        return [];
      }
    },
    initialData: [],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

const sviIzvodjaciQuery = useQuery<Korisnik[]>({
    queryKey: ['korisnici'],
    queryFn: async () => {
      try {
        const response = await axios.get(`${API_BASE}/korisnici/`);
        
       
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Error fetching korisnici:', error);
  if (isAxiosError(error)) {
          console.error('Axios error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          });
        }
        return [];
      }
    },
    initialData: [],
    staleTime: 1000 * 60 * 5, 
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 30000, 
  });

   

  useEffect(() => {
    if (!korisnikID) return;
    setIzabraniIzvodjaci(prev => {
      if (prev.length === 0) {
        const self = (sviIzvodjaciQuery.data || []).find((k: Korisnik) => String(k.id) === String(korisnikID));
        return self ? [self] : prev;
      }
      return prev;
    });
  }, [korisnikID, sviIzvodjaciQuery.data]);

  const handleAddIzvodjac = useCallback((k: Korisnik) => {
    setIzabraniIzvodjaci(prev =>
      prev.find(x => x.id === k.id) ? prev : [...prev, k]
    );

    setSearchIzvodjac('');
  }, []);

  const handleRemoveIzvodjac = useCallback((id: string) => {
    setIzabraniIzvodjaci(prev => prev.filter(k => k.id !== id));
  }, []);

  const availableIzvodjaci = useMemo(() => {
    if (!searchIzvodjac.trim()) return [];

    const search = searchIzvodjac.toLowerCase().trim();
    const selectedIds = new Set(izabraniIzvodjaci.map(k => k.id));
    const allUsers = sviIzvodjaciQuery.data || [];
    
    
    const filteredUsers = (allUsers as Korisnik[])
      .filter(k =>
        k.statusKorisnika !== 'suspendovan' &&
        (k.korisnicko_ime?.toLowerCase().includes(search) ||
          k.ime?.toLowerCase().includes(search) ||
          k.prezime?.toLowerCase().includes(search))
      )
      .sort((a, b) => (b.brojPratilaca || 0) - (a.brojPratilaca || 0));


    return filteredUsers
      .filter(k => !selectedIds.has(k.id))
      .sort((a, b) => {
        const aStarts = a.korisnicko_ime.toLowerCase().startsWith(search);
        const bStarts = b.korisnicko_ime.toLowerCase().startsWith(search);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.korisnicko_ime.localeCompare(b.korisnicko_ime);
      })
      .slice(0, 5);
  }, [sviIzvodjaciQuery.data, izabraniIzvodjaci, searchIzvodjac]);

  const createSongMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await axios.post(`${API_BASE}/pjesme/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const pjesmaId = res.data?.id;
      if (pjesmaId) {
        const unique = izabraniIzvodjaci.filter((izv, idx, arr) => arr.findIndex(x => x.id === izv.id) === idx);
        await Promise.all(
          unique.map(izv =>
            axios.post(`${API_BASE}/izvodjac_pjesma/`, {
              izvodjacID: izv.id,
              pjesmaID: pjesmaId,
              potvrdjeno: String(izv.id) === String(korisnikID),
            }).catch(() => {})
          )
        );
      }
      return res;
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
      setAlbumID('');
      setJezikPjesme('');
      setEksplicitniSadrzaj(false);
      setDatumObjave(new Date().toISOString().split('T')[0]);

      setTimeout(() => {
        navigateWithHistory('/sve-pjesme');
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
    formData.append('datumObjave', datumObjave);
    formData.append('jezikPjesme', jezikPjesme.trim());
    formData.append('eksplicitniSadrzaj', String(eksplicitniSadrzaj));
    if (albumID) formData.append('albumID', String(albumID));
    
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
  }, [naziv, audioFile, korisnikID, opis, genre, trajanjeSekunde, javno, imageFile, gifFile, datumObjave, jezikPjesme, eksplicitniSadrzaj, albumID, createSongMutation, t]);

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
    navigateWithHistory('/sve-pjesme');
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

  const audioPickerButton = useMemo(() => (
    <TouchableOpacity
      style={activeStyles.fileButton}
      onPress={() => handleFilePicker('audio')}
    >
      <Text style={activeStyles.fileButtonText}>
        {audioFile ? t('change_audio') : t('select_audio')}
      </Text>
    </TouchableOpacity>
  ), [activeStyles.fileButton, activeStyles.fileButtonText, audioFile, handleFilePicker, t]);

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
  

  if (createSongMutation.isPending) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Back
          title={t('creating_song') || 'Creating Song...'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile?from=nova-pjesma', '/nova-pjesma')}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Loading />
        <Tabs currentRoute="nova-pjesma" />
      </View>
    );
  }

  return (
    <View style={activeStyles.container}>
      <Back
        title={t('new_song') || 'New Song'}
        onBackPress={handleBackPress}
        onProfilePress={() => navigateWithHistory('/edit-profile?from=nova-pjesma', '/nova-pjesma')}
        source={from}
      />
      <ScrollView contentContainerStyle={activeStyles.scrollContainer}>
        <View style={activeStyles.content}>
          <Text style={activeStyles.title}>{t('new_song')}</Text>

          <View style={activeStyles.form}>
            <View>
              <Text style={activeStyles.label}>{t('song_name')} *:</Text>
              <TextInput
                style={[
                  activeStyles.input,
                  focusedField === 'naziv' && activeStyles.inputFocused,
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
              <Text style={activeStyles.label}>{t('description')}:</Text>
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

          
            <View style={activeStyles.inputContainer}>
              <Text style={activeStyles.label}>{t('genre') || 'Genre'}</Text>
              <View style={activeStyles.picker}>
                <Picker
                  selectedValue={zanr}
                  onValueChange={(value) => setZanr(value)}
                  dropdownIconColor="#fff"
                  selectionColor="#fff"
                >
                  <Picker.Item label={t('genre_pop') || 'Pop'} value="pop" color="#888" />
                  <Picker.Item label={t('genre_rock') || 'Rock'} value="rock" color="#888" />
                  <Picker.Item label={t('genre_hip_hop') || 'Hip Hop'} value="hip_hop" color="#888" />
                  <Picker.Item label={t('genre_jazz') || 'Jazz'} value="jazz" color="#888" />
                  <Picker.Item label={t('genre_electronic') || 'Electronic'} value="electronic" color="#888" />
                  <Picker.Item label={t('genre_classical') || 'Klasična'} value="klasicna" color="#888" />
                  <Picker.Item label={t('genre_metal') || 'Metal'} value="metal" color="#888" />
                  <Picker.Item label={t('genre_alternative') || 'Alternativni'} value="alternativni" color="#888" />
                  <Picker.Item label={t('genre_rap') || 'Rap'} value="rap" color="#888" />
                </Picker>
              </View>
            </View>

            <View>
              <Text style={activeStyles.label}>{t('duration_seconds')}:</Text>
              <TextInput
                style={[
                  activeStyles.input,
                  focusedField === 'trajanje' && activeStyles.inputFocused,
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

            <View>
              <Text style={activeStyles.label}>{t('release_date') || 'Datum objave'}:</Text>
              <TextInput
                style={[
                  activeStyles.input,
                  focusedField === 'datum' && activeStyles.inputFocused,
                ]}
                value={datumObjave}
                onChangeText={setDatumObjave}
                onFocus={() => handleFocus('datum')}
                onBlur={handleBlur}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#888"
              />
            </View>

            <View>
              <Text style={activeStyles.label}>{t('song_language') || 'Jezik pjesme'}:</Text>
              <TextInput
                style={[
                  activeStyles.input,
                  focusedField === 'jezik' && activeStyles.inputFocused,
                ]}
                value={jezikPjesme}
                onChangeText={setJezikPjesme}
                onFocus={() => handleFocus('jezik')}
                onBlur={handleBlur}
                placeholder={t('song_language') || 'Jezik pjesme'}
                placeholderTextColor="#888"
              />
            </View>

            <TouchableOpacity style={activeStyles.checkboxContainer} onPress={() => setEksplicitniSadrzaj(v => !v)}>
              <View style={[activeStyles.checkbox, eksplicitniSadrzaj && activeStyles.checkboxChecked]}>
                {eksplicitniSadrzaj && <MaterialIcons name="check" size={16} color="#fff" />}
              </View>
              <Text style={activeStyles.checkboxLabel}>{t('explicit_content') || 'Eksplicitni sadržaj'}</Text>
            </TouchableOpacity>

            <View>
              <Text style={activeStyles.label}>{t('album_optional') || 'Album (opcionalno)'}:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity style={activeStyles.fileButton} onPress={() => setAlbumID('')}>
                  <Text style={activeStyles.fileButtonText}>{albumID === '' ? '✓ ' : ''}{t('no_album') || 'Bez albuma'}</Text>
                </TouchableOpacity>
                {(albumiQuery.data || []).map((a: Album) => (
                  <TouchableOpacity key={a.id} style={activeStyles.fileButton} onPress={() => setAlbumID(a.id)}>
                    <Text style={activeStyles.fileButtonText}>{albumID === a.id ? '✓ ' : ''}{a.naziv}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text style={activeStyles.label}>{t('song_artists') || 'Izvođači na pjesmi'}:</Text>
              <View style={activeStyles.fileInputContainer}>
                {izabraniIzvodjaci.map(k => (
                  <View key={k.id} style={activeStyles.checkboxContainer}>
                    <Text style={activeStyles.checkboxLabel}>{k.korisnicko_ime}</Text>
                    <TouchableOpacity onPress={() => handleRemoveIzvodjac(k.id)}>
                      <MaterialIcons name="close" size={18} color="#888" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TextInput
                style={activeStyles.input}
                value={searchIzvodjac}
                onChangeText={setSearchIzvodjac}
                placeholder={t('search_artists') || 'Pretraži izvođače...'}
                placeholderTextColor="#888"
              />
              {availableIzvodjaci.map((k: Korisnik) => (
                <TouchableOpacity key={k.id} style={activeStyles.fileButton} onPress={() => handleAddIzvodjac(k)}>
                  <Text style={activeStyles.fileButtonText}>{k.korisnicko_ime}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={activeStyles.fileInputContainer}>
              <Text style={activeStyles.label}>{t('audio_file')} *:</Text>
              {audioPickerButton}
              {audioFile && (
                <Text style={activeStyles.fileName}>{audioFile.name}</Text>
              )}
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
              <Text style={activeStyles.checkboxLabel}>{t('public_song')}</Text>
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
                createSongMutation.isPending && activeStyles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={createSongMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={activeStyles.buttonText}>
                {createSongMutation.isPending ? t('create_song') || 'Creating...' : t('create_song')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={activeStyles.cancelButton}
              onPress={handleBack}
              disabled={createSongMutation.isPending}
            >
              <Text style={activeStyles.cancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="nova-pjesma" />
    </View>
  );
});

NovaPjesma.displayName = "NovaPjesma";

export default NovaPjesma;