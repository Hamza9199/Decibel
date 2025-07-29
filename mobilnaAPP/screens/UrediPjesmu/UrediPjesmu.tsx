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
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Checkbox } from 'expo-checkbox';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Pjesma, Album, Korisnik, IzvodjacPjesmaVeza } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './UrediPjesmu.styles';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';

const UrediPjesmu: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const { pjesmaId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [korisnikID, setKorisnikID] = useState<string>('');

  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
  const [zanr, setZanr] = useState('');
  const [jezikPjesme, setJezikPjesme] = useState('');
  const [licenca, setLicenca] = useState('');
  const [eksplicitniSadrzaj, setEksplicitniSadrzaj] = useState(false);
  const [albumID, setAlbumID] = useState<string>('');
  
  const [selectedImage, setSelectedImage] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [selectedGif, setSelectedGif] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [izabraniIzvodjaci, setIzabraniIzvodjaci] = useState<Korisnik[]>([]);
  const [search, setSearch] = useState('');


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

  const albumsQuery = useQuery({
    queryKey: ['userAlbums', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return [];
      const response = await axios.get(`${API_BASE}/albumi/`);
      return (response.data || []).filter((a: Album) => a.korisnikID === korisnikID);
    },
    enabled: !!korisnikID,
    staleTime: 10 * 60 * 1000, 
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/korisnici/`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, 
  });

  const songArtistsQuery = useQuery({
    queryKey: ['songArtists', pjesmaId],
    queryFn: async () => {
      if (!pjesmaId) return [];
      
      const artistConnectionsRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
      const veze: IzvodjacPjesmaVeza[] = artistConnectionsRes.data || [];
      const izvodjaciIds = veze
        .filter((v) => v.pjesmaID === Number(pjesmaId))
        .map((v) => v.izvodjacID);
      
      const users = usersQuery.data || [];
      return users.filter((k: Korisnik) => izvodjaciIds.includes(k.id));
    },
    enabled: !!(pjesmaId && usersQuery.data),
    staleTime: 10 * 60 * 1000, 
  });

  useEffect(() => {
    if (songQuery.data) {
      const song = songQuery.data;
      setNaziv(song.naziv || '');
      setOpis(song.opis || '');
      setZanr(song.zanr || '');
      setJezikPjesme(song.jezikPjesme || '');
      setLicenca(song.licenca || '');
      setEksplicitniSadrzaj(!!song.eksplicitniSadrzaj);
      setAlbumID(song.albumID ? song.albumID.toString() : '');
    }
  }, [songQuery.data]);

  useEffect(() => {
    if (songArtistsQuery.data) {
      setIzabraniIzvodjaci(songArtistsQuery.data);
    }
  }, [songArtistsQuery.data]);

  const updateSongMutation = useMutation({
    mutationFn: async ({ formData, artists }: { formData: FormData; artists: Korisnik[] }) => {
      if (!songQuery.data) throw new Error('No song data');
      
      await axios.put(`${API_BASE}/pjesme/${songQuery.data.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const connectionsRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
      const veze = connectionsRes.data || [];
      const zaPjesmu = veze.filter((v: IzvodjacPjesmaVeza) => v.pjesmaID === songQuery.data.id);
      
      for (const v of zaPjesmu) {
        await axios.delete(`${API_BASE}/izvodjac_pjesma/${v.izvodjacID}/${songQuery.data.id}`);
      }
      
      for (const izvodjac of artists) {
        await axios.post(`${API_BASE}/izvodjac_pjesma/`, {
          izvodjacID: izvodjac.id,
          pjesmaID: songQuery.data.id,
          potvrdjeno: izvodjac.id === korisnikID,
        });
      }

      return songQuery.data;
    },
    onSuccess: (song) => {
      queryClient.invalidateQueries({ queryKey: ['song', pjesmaId] });
      queryClient.invalidateQueries({ queryKey: ['songArtists', pjesmaId] });
      setSuccess(t('song_updated_successfully') || 'Song updated successfully');
      
      setTimeout(() => {
        router.push(`/pjesma/${song.id}`);
      }, 1500);
    },
    onError: (error) => {
      console.error('Error updating song:', error);
      setError(t('error_updating_song') || 'Error updating song');
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['song', pjesmaId] }),
      queryClient.invalidateQueries({ queryKey: ['userAlbums', korisnikID] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['songArtists', pjesmaId] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [pjesmaId, korisnikID]);

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

  const handleAudioPick = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: false,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedAudio(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert(t('error'), t('error_picking_file') || 'Error picking file');
    }
  }, [t]);

  const handleAddIzvodjac = useCallback((korisnik: Korisnik) => {
    if (!izabraniIzvodjaci.find((k) => k.id === korisnik.id)) {
      setIzabraniIzvodjaci((prev) => [...prev, korisnik]);
    }
  }, [izabraniIzvodjaci]);

  const handleRemoveIzvodjac = useCallback((korisnikId: string) => {
    setIzabraniIzvodjaci((prev) => prev.filter((k) => k.id !== korisnikId));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!songQuery.data || !korisnikID) return;
    
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('korisnikID', korisnikID);
    formData.append('naziv', naziv);
    formData.append('opis', opis);
    formData.append('datumObjave', songQuery.data.datumObjave || '');
    formData.append('trajanjeSekunde', String(songQuery.data.trajanjeSekunde || 0));
    formData.append('javno', String(songQuery.data.javno || false));
    formData.append('odobreno', String(songQuery.data.odobreno || false));
    formData.append('jezikPjesme', jezikPjesme);
    formData.append('licenca', licenca);
    formData.append('eksplicitniSadrzaj', String(eksplicitniSadrzaj));
    formData.append('zanr', zanr);
    if (albumID) formData.append('albumID', albumID);

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

    if (selectedAudio) {
      formData.append('file_audio', {
        uri: selectedAudio.uri,
        type: selectedAudio.mimeType || 'audio/mpeg',
        name: selectedAudio.name || 'audio.mp3',
      } as any);
    }

    updateSongMutation.mutate({ formData, artists: izabraniIzvodjaci });
  }, [songQuery.data, korisnikID, naziv, opis, jezikPjesme, licenca, eksplicitniSadrzaj, zanr, albumID, selectedImage, selectedGif, selectedAudio, izabraniIzvodjaci, updateSongMutation]);

  const filteredArtists = useMemo(() => {
    const sviIzvodjaci = usersQuery.data || [];
    return sviIzvodjaci.filter((k: Korisnik) =>
      k.korisnicko_ime.toLowerCase().includes(search.toLowerCase()) &&
      !izabraniIzvodjaci.find((iz) => iz.id === k.id)
    ).slice(0, 8);
  }, [usersQuery.data, search, izabraniIzvodjaci]);

  const renderArtistItem = useCallback(({ item }: { item: Korisnik }) => (
    <TouchableOpacity
      style={styles.artistItem}
      onPress={() => handleAddIzvodjac(item)}
    >
      <Text style={styles.artistItemText}>{item.korisnicko_ime}</Text>
    </TouchableOpacity>
  ), [handleAddIzvodjac]);

  const hasPermission = useMemo(() => {
    return songQuery.data && songQuery.data.korisnikID === korisnikID;
  }, [songQuery.data, korisnikID]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = songQuery.isLoading || albumsQuery.isLoading || usersQuery.isLoading;
  const pjesma = songQuery.data;
  const albumi = albumsQuery.data || [];

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
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <Text style={styles.unauthorizedText}>
            {t('song_not_found') || 'Song not found'}
          </Text>
        </View>
        <Tabs currentRoute="songs" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <Text style={styles.unauthorizedText}>
            {t('no_permission_to_edit') || 'You do not have permission to edit this song'}
          </Text>
        </View>
        <Tabs currentRoute="songs" />
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
          <Text style={styles.title}>{t('edit_song') || 'Edit Song'}</Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('song_name') || 'Song Name'}</Text>
              <TextInput
                style={styles.input}
                value={naziv}
                onChangeText={setNaziv}
                placeholder={t('enter_song_name') || 'Enter song name'}
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
              <Text style={styles.label}>{t('genre') || 'Genre'}</Text>
              <TextInput
                style={styles.input}
                value={zanr}
                onChangeText={setZanr}
                placeholder={t('enter_genre') || 'Enter genre'}
                placeholderTextColor="#888"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('song_language') || 'Song Language'}</Text>
              <TextInput
                style={styles.input}
                value={jezikPjesme}
                onChangeText={setJezikPjesme}
                placeholder={t('enter_language') || 'Enter language'}
                placeholderTextColor="#888"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('license') || 'License'}</Text>
              <TextInput
                style={styles.input}
                value={licenca}
                onChangeText={setLicenca}
                placeholder={t('enter_license') || 'Enter license'}
                placeholderTextColor="#888"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.checkboxContainer}>
                <Text style={styles.checkboxLabel}>
                  {t('explicit_content') || 'Explicit Content'}
                </Text>
                <Checkbox
                  value={eksplicitniSadrzaj}
                  onValueChange={setEksplicitniSadrzaj}
                  color={eksplicitniSadrzaj ? '#b91d95' : undefined}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('album_optional') || 'Album (Optional)'}</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={albumID}
                  onValueChange={(value) => setAlbumID(value)}
                  dropdownIconColor="#fff"
                >
                  <Picker.Item 
                    label={t('no_album') || 'No Album'} 
                    value="" 
                  />
                  {albumi.map((album: Album) => (
                    <Picker.Item 
                      key={album.id} 
                      label={album.naziv} 
                      value={album.id.toString()} 
                    />
                  ))}
                </Picker>
              </View>
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
              <Text style={styles.label}>{t('new_audio_optional') || 'New Audio (Optional)'}</Text>
              <TouchableOpacity style={styles.fileButton} onPress={handleAudioPick}>
                <Text style={styles.fileButtonText}>
                  {t('select_audio') || 'Select Audio'}
                </Text>
              </TouchableOpacity>
              {selectedAudio && (
                <Text style={styles.selectedFileText}>
                  {selectedAudio.name || t('audio_selected')}
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

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={updateSongMutation.isPending}
            >
              <Text style={styles.submitButtonText}>
                {updateSongMutation.isPending 
                  ? t('saving') || 'Saving...'
                  : t('save_changes') || 'Save Changes'
                }
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.artistsSection}>
            <Text style={styles.sectionTitle}>
              {t('song_artists') || 'Song Artists'}
            </Text>
            
            <TextInput
              style={styles.searchInput}
              placeholder={t('search_artists') || 'Search artists...'}
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
            />

            <View style={styles.selectedArtistsContainer}>
              {izabraniIzvodjaci.map((artist) => (
                <View key={artist.id} style={styles.artistTag}>
                  <Text style={styles.artistTagText}>{artist.korisnicko_ime}</Text>
                  <TouchableOpacity
                    style={styles.removeArtistButton}
                    onPress={() => handleRemoveIzvodjac(artist.id)}
                  >
                    <Text style={styles.removeArtistText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={styles.artistNote}>
              {t('can_remove_self_artist') || 'You can remove any artist, including yourself.'}
            </Text>

            <View style={styles.artistsList}>
              <FlatList
                data={filteredArtists}
                renderItem={renderArtistItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="songs" />
    </View>
  );
});

UrediPjesmu.displayName = "UrediPjesmu";

export default UrediPjesmu;
