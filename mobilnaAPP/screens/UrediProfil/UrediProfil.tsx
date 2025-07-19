import React, { useState, useEffect } from 'react';
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

const UrediProfil: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    loadUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (!userData) {
        Alert.alert(t('error'), 'You must be logged in');
        router.replace('/login');
        return;
      }

      const user = JSON.parse(userData);
      const userId = user?.id || '';
      setKorisnikID(userId);

      if (!userId) {
        Alert.alert(t('error'), 'You must be logged in');
        router.replace('/login');
        return;
      }

      setLoading(true);
      const response = await axios.get(`${API_BASE}/korisnici/${userId}`);
      
      setIme(response.data.ime || '');
      setPrezime(response.data.prezime || '');
      setKorisnickoIme(response.data.korisnicko_ime || '');
      setEmail(response.data.email || '');
      setBio(response.data.bio || '');
      setRola(response.data.rola || 'korisnik');
      setSlika(response.data.putanjaProfilneSlike || null);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError(t('error_loading_data') || 'Error loading user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!ime.trim() || !prezime.trim() || !korisnickoIme.trim() || !email.trim()) {
      setError(t('fill_all_fields') || 'Please fill all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('invalid_email') || 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.put(`${API_BASE}/korisnici/${korisnikID}`, {
        ime: ime.trim(),
        prezime: prezime.trim(),
        korisnicko_ime: korisnickoIme.trim(),
        email: email.trim(),
        lozinka: '', // Password is not changed here
        rola,
        bio: bio.trim(),
      });

      // Update local storage with new data
      const updatedUser = {
        id: korisnikID,
        ime: ime.trim(),
        prezime: prezime.trim(),
        korisnicko_ime: korisnickoIme.trim(),
        email: email.trim(),
        rola,
        bio: bio.trim(),
        putanjaProfilneSlike: slika,
      };
      await AsyncStorage.setItem('korisnik', JSON.stringify(updatedUser));

      setSuccess(t('profile_updated') || 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(t('error_saving_profile') || 'Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
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
        await uploadImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setSlikaError(t('error_picking_image') || 'Error picking image');
    }
  };

  const uploadImage = async (imageUri: string) => {
    setSlikaError(null);
    setSlikaSuccess(null);

    try {
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

      setSlika(response.data.putanjaProfilneSlike || null);
      setSlikaSuccess(t('profile_image_updated') || 'Profile image updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      setSlikaError(t('error_uploading_image') || 'Error uploading image');
    }
  };

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
                onFocus={() => setFocusedField('ime')}
                onBlur={() => setFocusedField(null)}
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
                onFocus={() => setFocusedField('prezime')}
                onBlur={() => setFocusedField(null)}
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
                onFocus={() => setFocusedField('korisnicko_ime')}
                onBlur={() => setFocusedField(null)}
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
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
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
                onFocus={() => setFocusedField('bio')}
                onBlur={() => setFocusedField(null)}
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
              onPressIn={() => setButtonPressed(true)}
              onPressOut={() => setButtonPressed(false)}
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
                source={{ 
                  uri: slika || 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.iconfinder.com%2Fdata%2Ficons%2Fflaticons-solid%2F16%2Fprofile-1-512.png&f=1&nofb=1&ipt=6b148c0994b76fe50e9a2fbb9e360cc3858b81f150251aca12a5ca51d932aca8'
                }}
                style={styles.profileImage}
                contentFit="cover"
              />
            </View>

            <TouchableOpacity
              style={styles.imageButton}
              onPress={handleImagePicker}
            >
              <Text style={styles.imageButtonText}>
                {t('change_profile_image') || 'Change Profile Image'}
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
};

export default UrediProfil;
