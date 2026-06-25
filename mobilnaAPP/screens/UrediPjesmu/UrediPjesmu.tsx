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
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Pjesma, Album, Korisnik, IzvodjacPjesmaVeza } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './UrediPjesmu.styles';
import { styles as lightStyles } from './UrediPjesmuWhite.styles';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';
import Loading from '@/komponente/Loading/Loading';

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
  const [eksplicitniSadrzaj, setEksplicitniSadrzaj] = useState(false);
  const [albumID, setAlbumID] = useState<string>('');
  const [trajanjeSekunde, setTrajanjeSekunde] = useState<string>('');
  const [javno, setJavno] = useState<boolean>(false);
  
  const [selectedImage, setSelectedImage] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [selectedGif, setSelectedGif] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [izabraniIzvodjaci, setIzabraniIzvodjaci] = useState<Korisnik[]>([]);
  const [search, setSearch] = useState('');


   const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;

  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: `/uredi-pjesmu/${pjesmaId}`, currentRoute: `/uredi-pjesmu/${pjesmaId}` });


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
      setEksplicitniSadrzaj(!!song.eksplicitniSadrzaj);
      setAlbumID(song.albumID ? song.albumID.toString() : '');
      setTrajanjeSekunde(song.trajanjeSekunde ? String(song.trajanjeSekunde) : '');
      setJavno(!!song.javno);
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
    formData.append('trajanjeSekunde', trajanjeSekunde);
    formData.append('javno', String(javno));
    formData.append('odobreno', String(songQuery.data.odobreno || false));
    formData.append('jezikPjesme', jezikPjesme);
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
  }, [songQuery.data, korisnikID, naziv, opis, jezikPjesme, eksplicitniSadrzaj, zanr, albumID, selectedImage, selectedGif, selectedAudio, izabraniIzvodjaci, updateSongMutation, javno, trajanjeSekunde]);

  const filteredArtists = useMemo(() => {
    const sviIzvodjaci = usersQuery.data || [];
    return sviIzvodjaci.filter((k: Korisnik) =>
      k.korisnicko_ime.toLowerCase().includes(search.toLowerCase()) &&
      !izabraniIzvodjaci.find((iz) => iz.id === k.id)
    ).slice(0, 8);
  }, [usersQuery.data, search, izabraniIzvodjaci]);

  const renderArtistItem = useCallback(({ item }: { item: Korisnik }) => (
    <TouchableOpacity
      style={activeStyles.artistItem}
      onPress={() => handleAddIzvodjac(item)}
    >
      <Text style={activeStyles.artistItemText}>{item.korisnicko_ime}</Text>
    </TouchableOpacity>
  ), [activeStyles.artistItem, activeStyles.artistItemText, handleAddIzvodjac]);

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

    useScreenCleanup();
  

  if (loading) {
    return (
      <View style={activeStyles.loadingContainer}>
        <Back
          title={t('loading_song') || 'Loading Song...'}
          onBackPress={handleBackPress}
          onProfilePress={() =>navigateWithHistory('/edit-profile', `/uredi-pjesmu/${pjesmaId}`)}
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Loading />
        <Tabs currentRoute={`/uredi-pjesmu/${pjesmaId}`} />
      </View>
    );
  }

  if (!pjesma) {
    return (
      <View style={activeStyles.container}>
        <Back
          title={t('song_not_found') || 'Song Not Found'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-pjesmu/${pjesmaId}`)}
          source={from}
        />
        <View style={activeStyles.loadingContainer}>
          <Text style={activeStyles.unauthorizedText}>
            {t('song_not_found') || 'Song not found'}
          </Text>
        </View>
        <Tabs currentRoute={`/uredi-pjesmu/${pjesmaId}`} />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={activeStyles.container}>
        <Back
          title={t('unauthorized_edit') || 'Unauthorized Edit'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-pjesmu/${pjesmaId}`)}
          source={from}
          />
        <View style={activeStyles.loadingContainer}>
          <Text style={activeStyles.unauthorizedText}>
            {t('no_permission_to_edit') || 'You do not have permission to edit this song'}
          </Text>
        </View>
        <Tabs currentRoute={`/uredi-pjesmu/${pjesmaId}`}/>
      </View>
    );
  }

  return (
    <View style={activeStyles.container}>
      <Back
        title={pjesma.naziv}
        onBackPress={handleBackPress}
        onProfilePress={() => navigateWithHistory('/edit-profile', `/uredi-pjesmu/${pjesmaId}`)}
      />
      
      <ScrollView
        contentContainerStyle={activeStyles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={activeStyles.content}>
          <Text style={activeStyles.title}>{t('edit_song') || 'Edit Song'}</Text>

          <View style={activeStyles.formContainer}>
            <View style={activeStyles.inputContainer}>
              <Text style={activeStyles.label}>{t('song_name') || 'Song Name'}</Text>
              <TextInput
                style={activeStyles.input}
                value={naziv}
                onChangeText={setNaziv}
                placeholder={t('enter_song_name') || 'Enter song name'}
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
              <Text style={activeStyles.label}>{t('genre') || 'Genre'}</Text>
              <View style={activeStyles.picker}>
                <Picker
                  selectedValue={zanr}
                  onValueChange={(value) => setZanr(value)}
                  dropdownIconColor="#fff"
                  selectionColor="#fff"
                >
                  <Picker.Item label={t('genre_pop') || 'Pop'} value="pop" color="#888"   />
                  <Picker.Item label={t('genre_rock') || 'Rock'} value="rock" color="#888"  />
                  <Picker.Item label={t('genre_hip_hop') || 'Hip Hop'} value="hip_hop" color="#888" />
                  <Picker.Item label={t('genre_jazz') || 'Jazz'} value="jazz" color="#888" />
                  <Picker.Item label={t('genre_electronic') || 'Electronic'} value="electronic" color="#888" />
                  <Picker.Item label={t('genre_classical') || 'Klasična'} value="klasicna" color="#888" />
                  <Picker.Item label={t('genre_metal') || 'Metal'} value="metal" color="#888" />
                  <Picker.Item label={t('genre_alternative') || 'Alternativni'} value="alternativni" color="#888" />
                  <Picker.Item label={t('genre_rap') || 'Rap'} value="rap"  color="#888"/>
                </Picker>
              </View>
            </View>

            <View style={activeStyles.inputContainer}>
              <Text style={activeStyles.label}>{t('song_language') || 'Song Language'}</Text>
              <TextInput
                style={activeStyles.input}
                value={jezikPjesme}
                onChangeText={setJezikPjesme}
                placeholder={t('enter_language') || 'Enter language'}
                placeholderTextColor="#888"
              />
            </View>

          

            <View style={activeStyles.inputContainer}>
              <View style={activeStyles.checkboxContainer}>
                <Text style={activeStyles.checkboxLabel}>
                  {t('explicit_content') || 'Explicit Content'}
                </Text>
                <Checkbox
                  value={eksplicitniSadrzaj}
                  onValueChange={setEksplicitniSadrzaj}
                  color={eksplicitniSadrzaj ? '#b91d95' : undefined}
                />
              </View>
            </View>

            <View style={activeStyles.inputContainer}>
              <Text style={activeStyles.label}>{t('album_optional') || 'Album (Optional)'}</Text>
              <View style={activeStyles.picker}>
                <Picker
                  selectedValue={albumID}
                  onValueChange={(value) => setAlbumID(value)}
                  dropdownIconColor="#fff"
                >
                  <Picker.Item 
                    label={t('no_album') || 'No Album'} 
                    value=""
                    color="#888" 
                  />
                  {albumi.map((album: Album) => (
                    <Picker.Item 
                      key={album.id} 
                      label={album.naziv} 
                      value={album.id.toString()} 
                      color="#fff"
                    />
                  ))}
                </Picker>
              </View>
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
              <Text style={activeStyles.label}>{t('new_audio_optional') || 'New Audio (Optional)'}</Text>
              <TouchableOpacity style={activeStyles.fileButton} onPress={handleAudioPick}>
                <Text style={activeStyles.fileButtonText}>
                  {t('select_audio') || 'Select Audio'}
                </Text>
              </TouchableOpacity>
              {selectedAudio && (
                <Text style={activeStyles.selectedFileText}>
                  {selectedAudio.name || t('audio_selected')}
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
              disabled={updateSongMutation.isPending}
            >
              <Text style={activeStyles.submitButtonText}>
                {updateSongMutation.isPending 
                  ? t('saving') || 'Saving...'
                  : t('save_changes') || 'Save Changes'
                }
              </Text>
            </TouchableOpacity>
          </View>

          <View style={activeStyles.inputContainer}>
            <Text style={activeStyles.label}>{t('duration_seconds') || 'Duration (seconds)'}</Text>
            <TextInput
              style={activeStyles.input}
              value={trajanjeSekunde}
              onChangeText={setTrajanjeSekunde}
              placeholder={t('duration_seconds') || '180'}
              placeholderTextColor="#888"
              keyboardType="numeric"
            />
          </View>

      
          <View style={activeStyles.inputContainer}>
            <View style={activeStyles.checkboxContainer}>
              <Text style={activeStyles.checkboxLabel}>{t('public_song') || 'Public Song'}</Text>
              <Checkbox
                value={javno}
                onValueChange={setJavno}
                color={javno ? '#b91d95' : undefined}
              />
            </View>
          </View>

          <View style={activeStyles.artistsSection}>
            <Text style={activeStyles.sectionTitle}>
              {t('song_artists') || 'Song Artists'}
            </Text>
            
            <TextInput
              style={activeStyles.searchInput}
              placeholder={t('search_artists') || 'Search artists...'}
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
            />

            <View style={activeStyles.selectedArtistsContainer}>
              {izabraniIzvodjaci.map((artist) => (
                <View key={artist.id} style={activeStyles.artistTag}>
                  <Text style={activeStyles.artistTagText}>{artist.korisnicko_ime}</Text>
                  <TouchableOpacity
                    style={activeStyles.removeArtistButton}
                    onPress={() => handleRemoveIzvodjac(artist.id)}
                  >
                    <Text style={activeStyles.removeArtistText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={activeStyles.artistNote}>
              {t('can_remove_self_artist') || 'You can remove any artist, including yourself.'}
            </Text>

            <View style={activeStyles.artistsList}>
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

      <Tabs currentRoute={`/uredi-pjesmu/${pjesmaId}`} />
    </View>
  );
});

UrediPjesmu.displayName = "UrediPjesmu";

export default UrediPjesmu;
