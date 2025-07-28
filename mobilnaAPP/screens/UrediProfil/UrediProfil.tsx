import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { API_BASE } from '@/config/api';
import { styles } from './UrediProfil.styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const UrediProfil: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [ime, setIme] = useState('');
  const [prezime, setPrezime] = useState('');
  const [korisnickoIme, setKorisnickoIme] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [rola, setRola] = useState('korisnik');
  const [slika, setSlika] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slikaSuccess, setSlikaSuccess] = useState<string | null>(null);
  const [slikaError, setSlikaError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');

  const queryClient = useQueryClient();

  const loadUserFromStorage = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (!userData) {
        Alert.alert(t('error'), 'You must be logged in');
        router.replace('/login');
        return '';
      }

      const user = JSON.parse(userData);
      const userId = user?.id || '';

      if (!userId) {
        Alert.alert(t('error'), 'You must be logged in');
        router.replace('/login');
        return '';
      }

      return userId;
    } catch (error) {
      console.error('Error loading user from storage:', error);
      return '';
    }
  }, [t, router]);

  // Replace useMemo with useEffect - this was likely causing the infinite loop
  useEffect(() => {
    let isMounted = true;
    
    const initializeUser = async () => {
      if (!isMounted) return;
      const userId = await loadUserFromStorage();
      if (isMounted && userId) {
        setKorisnikID(userId);
      }
    };
    
    initializeUser();
    
    return () => {
      isMounted = false;
    };
  }, []); // Remove loadUserFromStorage from dependencies to prevent infinite loop

  const userQuery = useQuery({
    queryKey: ['user', korisnikID],
    queryFn: async () => {
      if (!korisnikID) throw new Error('No user ID');
      const response = await axios.get(`${API_BASE}/korisnici/${korisnikID}`);
      return response.data;
    },
    enabled: !!korisnikID,
    staleTime: 10 * 60 * 1000
  });

  useEffect(() => {
    if (userQuery.isError) {
      console.error('Error loading user data:', userQuery.error);
      setError(t('error_loading_data') || 'Error loading user data');
    }
  }, [userQuery.isError, userQuery.error, t]);

  useEffect(() => {
    if (userQuery.data) {
      const userData = userQuery.data;
      setIme(userData.ime || '');
      setPrezime(userData.prezime || '');
      setKorisnickoIme(userData.korisnicko_ime || '');
      setEmail(userData.email || '');
      setBio(userData.bio || '');
      setRola(userData.rola || 'korisnik');
      setSlika(userData.putanjaProfilneSlike || null);
    }
  }, [userQuery.data]);

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: {
      ime: string;
      prezime: string;
      korisnicko_ime: string;
      email: string;
      rola: string;
      bio: string;
    }) => {
      await axios.put(`${API_BASE}/korisnici/${korisnikID}`, {
        ...profileData,
        lozinka: '', // Password is not changed here
      });
      return profileData;
    },
    onSuccess: async (profileData) => {
      // Update local storage with new data
      const updatedUser = {
        id: korisnikID,
        ...profileData,
        putanjaProfilneSlike: slika,
      };
      await AsyncStorage.setItem('korisnik', JSON.stringify(updatedUser));
      
      // Update query cache
      queryClient.setQueryData(['user', korisnikID], (old: any) => ({
        ...old,
        ...profileData
      }));
      
      setSuccess(t('profile_updated') || 'Profile updated successfully!');
      setError(null);
    },
    onError: (error) => {
      console.error('Error saving profile:', error);
      setError(t('error_saving_profile') || 'Error saving profile');
      setSuccess(null);
    }
  });

  // Mutation for uploading image
  const uploadImageMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      formData.append('file_profilna', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      const response = await axios.put(
        `${API_BASE}/korisnici/slika/${korisnikID}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data.putanjaProfilneSlike;
    },
    onSuccess: (newImagePath) => {
      setSlika(newImagePath || null);
      setSlikaSuccess(t('profile_image_updated') || 'Profile image updated successfully!');
      setSlikaError(null);
      
      // Update query cache
      queryClient.setQueryData(['user', korisnikID], (old: any) => ({
        ...old,
        putanjaProfilneSlike: newImagePath
      }));
    },
    onError: (error) => {
      console.error('Error uploading image:', error);
      setSlikaError(t('error_uploading_image') || 'Error uploading image');
      setSlikaSuccess(null);
    }
  });

  const handleSubmit = useCallback(() => {
    if (!ime.trim() || !prezime.trim() || !korisnickoIme.trim() || !email.trim()) {
      setError(t('fill_all_fields') || 'Please fill all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('invalid_email') || 'Please enter a valid email address');
      return;
    }

    setError(null);
    setSuccess(null);

    updateProfileMutation.mutate({
      ime: ime.trim(),
      prezime: prezime.trim(),
      korisnicko_ime: korisnickoIme.trim(),
      email: email.trim(),
      rola,
      bio: bio.trim(),
    });
  }, [ime, prezime, korisnickoIme, email, rola, bio, updateProfileMutation, t]);

  const uploadImage = useCallback((imageUri: string) => {
    setSlikaError(null);
    setSlikaSuccess(null);
    uploadImageMutation.mutate(imageUri);
  }, [uploadImageMutation]);

  const handleImagePicker = useCallback(async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(t('permission_required'), t('photo_permission_required'));
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        uploadImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setSlikaError(t('error_picking_image') || 'Error picking image');
    }
  }, [uploadImage, t]);

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

  // Memoize profile image URI
  const profileImageUri = useMemo(() => {
    return slika || 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.iconfinder.com%2Fdata%2Ficons%2Fflaticons-solid%2F16%2Fprofile-1-512.png&f=1&nofb=1&ipt=6b148c0994b76fe50e9a2fbb9e360cc3858b81f150251aca12a5ca51d932aca8';
  }, [slika]);

  const loading = userQuery.isLoading || updateProfileMutation.isPending;

  if (loading && !ime) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('edit_profile')}</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.form}>
            {/* Name Input */}
            <View>
              <Text style={styles.label}>{t('name')}:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'ime' && styles.inputFocused,
                ]}
                value={ime}
                onChangeText={setIme}
                onFocus={() => handleFocus('ime')}
                onBlur={handleBlur}
                placeholder={t('name')}
                placeholderTextColor="#888"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Surname Input */}
            <View>
              <Text style={styles.label}>{t('surname')}:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'prezime' && styles.inputFocused,
                ]}
                value={prezime}
                onChangeText={setPrezime}
                onFocus={() => handleFocus('prezime')}
                onBlur={handleBlur}
                placeholder={t('surname')}
                placeholderTextColor="#888"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Username Input */}
            <View>
              <Text style={styles.label}>{t('username')}:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'korisnicko_ime' && styles.inputFocused,
                ]}
                value={korisnickoIme}
                onChangeText={setKorisnickoIme}
                onFocus={() => handleFocus('korisnicko_ime')}
                onBlur={handleBlur}
                placeholder={t('username')}
                placeholderTextColor="#888"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Email Input */}
            <View>
              <Text style={styles.label}>{t('email')}:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                ]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => handleFocus('email')}
                onBlur={handleBlur}
                placeholder={t('email')}
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            {/* Bio Input */}
            <View>
              <Text style={styles.label}>Bio:</Text>
              <TextInput
                style={[
                  styles.textArea,
                  focusedField === 'bio' && styles.inputFocused,
                ]}
                value={bio}
                onChangeText={setBio}
                onFocus={() => handleFocus('bio')}
                onBlur={handleBlur}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#888"
                multiline
                numberOfLines={3}
              />
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

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.button,
                buttonPressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? t('saving') || 'Saving...' : t('save_changes')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profile Image Section */}
          <View style={styles.profileImageSection}>
            <Text style={styles.subtitle}>{t('profile_image')}</Text>
            <View style={styles.profileImageWrap}>
              <Image
                source={{ uri: profileImageUri }}
                style={styles.profileImage}
                contentFit="cover"
              />
            </View>

            <TouchableOpacity
              style={styles.imageButton}
              onPress={handleImagePicker}
              disabled={uploadImageMutation.isPending}
            >
              <Text style={styles.imageButtonText}>
                {uploadImageMutation.isPending 
                  ? t('uploading') || 'Uploading...'
                  : t('change_profile_image') || 'Change Profile Image'
                }
              </Text>
            </TouchableOpacity>

            {/* Image Error/Success Messages */}
            {slikaError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{slikaError}</Text>
              </View>
            )}

            {slikaSuccess && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{slikaSuccess}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Tab Bar */}
      <Tabs currentRoute="profile" />
    </View>
  );
});

UrediProfil.displayName = "UrediProfil";

export default UrediProfil;
