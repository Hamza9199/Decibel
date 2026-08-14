import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/config/api';
import { styles } from './Register.styles';
import Loading from '@/komponente/Loading/Loading';

const Register: React.FC = React.memo(() => {
  const [ime, setIme] = useState('');
  const [prezime, setPrezime] = useState('');
  const [korisnicko_ime, setKorisnickoIme] = useState('');
  const [email, setEmail] = useState('');
  const [lozinka, setLozinka] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  
  const { t } = useTranslation();
  const router = useRouter();

  const checkIfLoggedIn = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  }, [router]);

  useEffect(() => {
    checkIfLoggedIn();
  }, [checkIfLoggedIn]);

  const handleSubmit = useCallback(async () => {
    if (!ime.trim() || !prezime.trim() || !korisnicko_ime.trim() || !email.trim() || !lozinka.trim()) {
      setError(t('fill_all_fields') || 'Please fill all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('invalid_email') || 'Please enter a valid email address');
      return;
    }

    if (lozinka.length < 6) {
      setError(t('password_too_short') || 'Password must be at least 6 characters');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/korisnici/register`, {
        ime: ime.trim(),
        prezime: prezime.trim(),
        korisnicko_ime: korisnicko_ime.trim(),
        email: email.trim(),
        lozinka: lozinka.trim(),
      });

      if (response.data) {
        setSuccess(t('registration_successful') || 'Registration successful! You can now log in.');
        
        await AsyncStorage.setItem('korisnik', JSON.stringify(response.data));
        
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      } else {
        setError(t('registration_failed') || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response?.status === 409) {
        setError(t('user_already_exists') || 'User with this email or username already exists');
      } else if (error.response?.status >= 500) {
        setError(t('server_error') || 'Server error. Please try again later.');
      } else {
        setError(t('registration_error') || 'Registration error. Please check your data.');
      }
    } finally {
      setLoading(false);
    }
  }, [ime, prezime, korisnicko_ime, email, lozinka, t, router]);

  const navigateToLogin = useCallback(() => {
    router.replace('/login');
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

  const handleLogoPress = useCallback(() => {
    router.replace('/');
  }, [router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Loading />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#b91d95', '#222222']}
      start={{ x: 0.1, y: 0.6 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/100/b91d95/ffffff?text=D' }}
              style={styles.logo}
              contentFit="cover"
            />
            <Text onPress={handleLogoPress} style={styles.appName}>Decibel</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>{t('register')}</Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, styles.inputHalf]}>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'ime' && styles.inputFocused,
                  ]}
                  placeholder={t('name') || 'Name'}
                  placeholderTextColor="#888"
                  value={ime}
                  onChangeText={setIme}
                  onFocus={() => handleFocus('ime')}
                  onBlur={handleBlur}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              <View style={[styles.inputContainer, styles.inputHalf]}>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'prezime' && styles.inputFocused,
                  ]}
                  placeholder={t('surname') || 'Surname'}
                  placeholderTextColor="#888"
                  value={prezime}
                  onChangeText={setPrezime}
                  onFocus={() => handleFocus('prezime')}
                  onBlur={handleBlur}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'username' && styles.inputFocused,
                ]}
                placeholder={t('username') || 'Username'}
                placeholderTextColor="#888"
                value={korisnicko_ime}
                onChangeText={setKorisnickoIme}
                onFocus={() => handleFocus('username')}
                onBlur={handleBlur}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                ]}
                placeholder={t('email') || 'Email'}
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                onFocus={() => handleFocus('email')}
                onBlur={handleBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={[
                styles.passwordRow,
                focusedField === 'password' && styles.inputFocused,
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('password') || 'Password'}
                  placeholderTextColor="#888"
                  value={lozinka}
                  onChangeText={setLozinka}
                  onFocus={() => handleFocus('password')}
                  onBlur={handleBlur}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.passwordIconButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={22}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
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
              style={[
                styles.button,
                buttonPressed && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? t('registering') || 'Registering...' : t('register')}
              </Text>
            </TouchableOpacity>

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>
                {t('already_have_account') || 'Already have an account?'}
              </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.link}>
                  {t('login_here') || 'Login here'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
});

Register.displayName = "Register";

export default Register;
