import React, { useState, useEffect } from 'react';
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
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/config/api';
import { styles } from './Login.styles';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [lozinka, setLozinka] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  
  const { t } = useTranslation();
  const router = useRouter();

  const checkIfLoggedIn = React.useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          router.replace('/');
        }
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  }, [router]);

  useEffect(() => {
    checkIfLoggedIn();
  }, [checkIfLoggedIn]);

  const handleSubmit = async () => {
    if (!email.trim() || !lozinka.trim()) {
      setError(t('fill_all_fields') || 'Please fill all fields');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/korisnici/login`, {
        email: email.trim(),
        lozinka: lozinka.trim(),
      });

      if (response.data) {
        // Save user data to AsyncStorage
        await AsyncStorage.setItem('korisnik', JSON.stringify(response.data));
        
        // Navigate to home screen
        router.replace('/');
      } else {
        setError(t('login_failed') || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.status === 401) {
        setError(t('invalid_credentials') || 'Invalid email or password');
      } else if (error.response?.status >= 500) {
        setError(t('server_error') || 'Server error. Please try again later.');
      } else {
        setError(t('network_error') || 'Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => {
    router.push('/register');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/100/b91d95/ffffff?text=D' }}
              style={styles.logo}
              contentFit="cover"
            />
            <Text style={styles.appName}>Decibel</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>{t('login')}</Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  emailFocused && styles.inputFocused,
                ]}
                placeholder={t('email') || 'Email'}
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  passwordFocused && styles.inputFocused,
                ]}
                placeholder={t('password') || 'Password'}
                placeholderTextColor="#888"
                value={lozinka}
                onChangeText={setLozinka}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.button,
                buttonPressed && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              onPressIn={() => setButtonPressed(true)}
              onPressOut={() => setButtonPressed(false)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? t('logging_in') || 'Logging in...' : t('login')}
              </Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>
                {t('dont_have_account') || "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={navigateToRegister}>
                <Text style={styles.link}>
                  {t('register_here') || 'Register here'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default Login;
