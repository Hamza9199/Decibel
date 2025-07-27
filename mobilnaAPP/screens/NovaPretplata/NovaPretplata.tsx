import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pretplata } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './NovaPretplata.styles';

const NovaPretplata: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const { pretplataId } = useLocalSearchParams();
  
  const [pretplata, setPretplata] = useState<Pretplata | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');

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

  const loadPretplataData = useCallback(async () => {
    if (!pretplataId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/pretplate/${pretplataId}`);
      setPretplata(response.data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      setPretplata(null);
      setError(t('error_loading_subscription') || 'Error loading subscription');
    } finally {
      setLoading(false);
    }
  }, [pretplataId, t]);

  // Load user data and subscription data when component mounts
  useMemo(() => {
    loadUserData().then(() => {
      if (pretplataId) {
        loadPretplataData();
      }
    });
  }, [pretplataId, loadUserData, loadPretplataData]);

  const validateCard = useCallback((): string | null => {
    if (!cardNumber.match(/^\d{16}$/)) {
      return t('card_number_invalid') || 'Card number must have 16 digits';
    }
    if (!cardName.trim()) {
      return t('card_name_required') || 'Cardholder name is required';
    }
    if (!cardExp.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      return t('card_exp_invalid') || 'Expiry date must be MM/YY format';
    }
    if (!cardCvc.match(/^\d{3,4}$/)) {
      return t('card_cvc_invalid') || 'CVC must have 3 or 4 digits';
    }
    return null;
  }, [cardNumber, cardName, cardExp, cardCvc, t]);

  const handleConfirmPurchase = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!korisnikID) {
      setError(t('must_be_logged_in') || 'You must be logged in');
      return;
    }

    const validationError = validateCard();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPurchasing(true);

    try {
      await axios.post(`${API_BASE}/korisnik_pretplata/`, {
        korisnikID,
        pretplataID: pretplata?.id,
        pretplataStatus: 'aktivna',
      });

      setSuccess(t('subscription_purchased_successfully') || 'Subscription purchased successfully!');
      
      // Clear form
      setCardNumber('');
      setCardName('');
      setCardExp('');
      setCardCvc('');

      setTimeout(() => {
        router.back();
      }, 2000);

    } catch (error: any) {
      console.error('Error purchasing subscription:', error);
      const errorMessage = error.response?.data?.detail || 
                          t('error_purchasing_subscription') || 
                          'Error purchasing subscription';
      setError(errorMessage);
    } finally {
      setPurchasing(false);
    }
  }, [korisnikID, validateCard, pretplata?.id, t, router]);

  const formatCardNumber = useCallback((value: string): string => {
    return value.replace(/\D/g, '').slice(0, 16);
  }, []);

  const formatCardExp = useCallback((value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length >= 2) {
      return cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4);
    }
    return cleanValue;
  }, []);

  const formatCardCvc = useCallback((value: string): string => {
    return value.replace(/\D/g, '').slice(0, 4);
  }, []);

  const handleCardNumberChange = useCallback((text: string) => {
    setCardNumber(formatCardNumber(text));
  }, [formatCardNumber]);

  const handleCardExpChange = useCallback((text: string) => {
    setCardExp(formatCardExp(text));
  }, [formatCardExp]);

  const handleCardCvcChange = useCallback((text: string) => {
    setCardCvc(formatCardCvc(text));
  }, [formatCardCvc]);

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

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Memoize subscription details
  const subscriptionDetails = useMemo(() => [
    { label: t('price'), value: `${pretplata?.cijena} KM / ${t('month')}` },
    { label: t('description'), value: pretplata?.opis || '' },
  ], [pretplata?.cijena, pretplata?.opis, t]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  if (!pretplata) {
    return (
      <View style={styles.notFoundContainer}>
        <Header />
        <MaterialIcons name="credit-card" size={64} color="#666" />
        <Text style={styles.notFoundText}>
          {t('subscription_not_found') || 'Subscription not found'}
        </Text>
        <Tabs currentRoute="subscription" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {t('buy_subscription')}: {pretplata.naziv}
          </Text>

          {/* Subscription Details */}
          <View style={styles.subscriptionDetails}>
            {subscriptionDetails.map((detail, index) => (
              <View key={index} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{detail.label}:</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            ))}
          </View>

          {/* Payment Form */}
          <View style={styles.form}>
            {/* Card Number */}
            <View>
              <Text style={styles.label}>{t('card_number')} *:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'cardNumber' && styles.inputFocused,
                ]}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                onFocus={() => handleFocus('cardNumber')}
                onBlur={handleBlur}
                placeholder="1234567890123456"
                placeholderTextColor="#888"
                keyboardType="numeric"
                maxLength={16}
              />
            </View>

            {/* Cardholder Name */}
            <View>
              <Text style={styles.label}>{t('card_name')} *:</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'cardName' && styles.inputFocused,
                ]}
                value={cardName}
                onChangeText={setCardName}
                onFocus={() => handleFocus('cardName')}
                onBlur={handleBlur}
                placeholder={t('card_name_placeholder') || 'JOHN DOE'}
                placeholderTextColor="#888"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* Expiry Date and CVC */}
            <View style={styles.inputRow}>
              <View style={[styles.inputHalf]}>
                <Text style={styles.label}>{t('card_exp')} *:</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'cardExp' && styles.inputFocused,
                  ]}
                  value={cardExp}
                  onChangeText={handleCardExpChange}
                  onFocus={() => handleFocus('cardExp')}
                  onBlur={handleBlur}
                  placeholder="MM/YY"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              
              <View style={[styles.inputHalf]}>
                <Text style={styles.label}>{t('card_cvc')} *:</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'cardCvc' && styles.inputFocused,
                  ]}
                  value={cardCvc}
                  onChangeText={handleCardCvcChange}
                  onFocus={() => handleFocus('cardCvc')}
                  onBlur={handleBlur}
                  placeholder="123"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
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

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  buttonPressed && styles.buttonPressed,
                  purchasing && styles.buttonDisabled,
                ]}
                onPress={handleConfirmPurchase}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={purchasing}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {purchasing ? t('buying') || 'Buying...' : t('confirm_purchase')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleBack}
                disabled={purchasing}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="subscription" />
    </View>
  );
});

NovaPretplata.displayName = "NovaPretplata";

export default NovaPretplata;
