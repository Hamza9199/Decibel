import React, { useEffect, useState } from 'react';
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

const NovaPretplata: React.FC = () => {
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

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (pretplataId) {
      loadPretplataData();
    }
  }, [pretplataId]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setKorisnikID(user?.id || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadPretplataData = async () => {
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
  };

  const validateCard = (): string | null => {
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
  };

  const handleConfirmPurchase = async () => {
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
  };

  const formatCardNumber = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 16);
  };

  const formatCardExp = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length >= 2) {
      return cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4);
    }
    return cleanValue;
  };

  const formatCardCvc = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 4);
  };

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
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('price')}:</Text>
              <Text style={styles.detailValue}>{pretplata.cijena} KM / {t('month')}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('description')}:</Text>
              <Text style={styles.detailValue}>{pretplata.opis}</Text>
            </View>
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
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                onFocus={() => setFocusedField('cardNumber')}
                onBlur={() => setFocusedField(null)}
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
                onFocus={() => setFocusedField('cardName')}
                onBlur={() => setFocusedField(null)}
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
                  onChangeText={(text) => setCardExp(formatCardExp(text))}
                  onFocus={() => setFocusedField('cardExp')}
                  onBlur={() => setFocusedField(null)}
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
                  onChangeText={(text) => setCardCvc(formatCardCvc(text))}
                  onFocus={() => setFocusedField('cardCvc')}
                  onBlur={() => setFocusedField(null)}
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
                onPressIn={() => setButtonPressed(true)}
                onPressOut={() => setButtonPressed(false)}
                disabled={purchasing}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {purchasing ? t('buying') || 'Buying...' : t('confirm_purchase')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
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
};

export default NovaPretplata;
