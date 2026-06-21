import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Pretplata } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './NovaPretplata.styles';
import { styles as lightStyles } from './NovaPretplataWhite.styles';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { getRoutePathFromSource, navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';

const NovaPretplata: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const styles = theme === 'dark' ? darkStyles : lightStyles;
  const router = useRouter();
  const { pretplataId } = useLocalSearchParams();
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardExpLabel, setCardExpLabel] = useState(''); 
  const [isDateSelected, setIsDateSelected] = useState(false);
  const [cardCvc, setCardCvc] = useState('');
  
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');
  const [showExpPicker, setShowExpPicker] = useState(false);

  const { from } = useLocalSearchParams<{ from?: string }>();
  const currentRoute = useMemo(() => pretplataId ? `/nova-pretplata/${pretplataId}` : '/nova-pretplata/[pretplataId]', [pretplataId]);
  const handleBackPress = useBackPress({
      from,
      defaultRoute: getRoutePathFromSource(from) || '/(tabs)',
      currentRoute,
    });

  useScreenCleanup();

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('decibel_tema');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTheme(); }, [loadTheme]);
 

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

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', pretplataId],
    queryFn: async () => {
      if (!pretplataId) throw new Error('No subscription ID');
      const response = await axios.get(`${API_BASE}/pretplate/${pretplataId}`);
      return response.data;
    },
    enabled: !!pretplataId,
    staleTime: 10 * 60 * 1000, 
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!korisnikID) throw new Error('No user ID');
      if (!subscriptionQuery.data?.id) throw new Error('No subscription data');
      
      await axios.post(`${API_BASE}/korisnik_pretplata/`, {
        korisnikID,
        pretplataID: subscriptionQuery.data.id,
        pretplataStatus: 'aktivna',
      });
    },
    onSuccess: () => {
      setSuccess(t('subscription_purchased_successfully') || 'Subscription purchased successfully!');
      setError(null);
      
      setCardNumber('');
      setCardName('');
      setCardExp('');
      setCardCvc('');

      setTimeout(() => {
        router.back();
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Error purchasing subscription:', error);
      const errorMessage = error.response?.data?.detail || 
                          t('error_purchasing_subscription') || 
                          'Error purchasing subscription';
      setError(errorMessage);
      setSuccess(null);
    }
  });

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

    purchaseMutation.mutate();
  }, [korisnikID, validateCard, purchaseMutation, t]);

  const formatCardNumber = useCallback((value: string): string => {
    return value.replace(/\D/g, '').slice(0, 16);
  }, []);


  const formatCardCvc = useCallback((value: string): string => {
    return value.replace(/\D/g, '').slice(0, 4);
  }, []);

  const handleCardNumberChange = useCallback((text: string) => {
    setCardNumber(formatCardNumber(text));
  }, [formatCardNumber]);


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

  const monthOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    for (let year = currentYear; year <= currentYear + 10; year++) {
      const startMonth = year === currentYear ? currentMonth : 1;
      for (let month = startMonth; month <= 12; month++) {
        const value = `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
        const label = `${month.toString().padStart(2, '0')}/${year}`;
        options.push({ label, value });
      }
    }
    return options;
  }, []);

  const subscriptionDetails = useMemo(() => {
    if (!subscriptionQuery.data) return [];
    
    return [
      { label: t('price'), value: `${subscriptionQuery.data.cijena} KM / ${t('month')}` },
      { label: t('description'), value: subscriptionQuery.data.opis || '' },
    ];
  }, [subscriptionQuery.data, t]);

  const loading = subscriptionQuery.isLoading;
  const pretplata = subscriptionQuery.data;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Back
          title={t('new_subscription') || 'New Subscription'}
          onBackPress={handleBackPress}
          onProfilePress={() =>
        navigateWithHistory(
          `/edit-profile?from=/nova-pretplata/${pretplataId}`,
          currentRoute
        )
          }
          source={from}
        />
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
        <Tabs currentRoute="nova-pretplata" />
      </View>
    );
  }

  if (subscriptionQuery.error || !pretplata) {
    return (
      <View style={styles.notFoundContainer}>
        <Back
          title={t('subscription_not_found') || 'Subscription Not Found'}
          onBackPress={handleBackPress}
          onProfilePress={() => navigateWithHistory(`/edit-profile?from=/nova-pretplata/${pretplataId}`, currentRoute)}
          />
        <MaterialIcons name="credit-card" size={64} color="#666" />
        <Text style={styles.notFoundText}>
          {t('subscription_not_found') || 'Subscription not found'}
        </Text>
        <Tabs currentRoute="nova-pretplata" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Back
        title={t('new_subscription') || 'New Subscription'}
        onBackPress={handleBackPress}
        onProfilePress={() => navigateWithHistory(`/edit-profile?from=/nova-pretplata/${pretplataId}`, currentRoute)}
        source={from}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {t('buy_subscription')}: {pretplata.naziv}
          </Text>

          <View style={styles.subscriptionDetails}>
            {subscriptionDetails.map((detail, index) => (
              <View key={index} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{detail.label}:</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.form}>
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

            <View style={styles.inputRow}>
              <View style={[styles.inputHalf]}>
                <Text style={styles.label}>{t('card_exp')} *:</Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    focusedField === 'cardExp' && styles.inputFocused,
                  ]}
                  onPress={() => {
                    setFocusedField('cardExp');
                    setShowExpPicker(true);
                  }}
                >
                  <Text style={{ color: isDateSelected ? '#f2ececff' : '#888', fontSize: 16 }}>
                    {cardExpLabel || t('select_month_year') || 'MM/YY'}
                  </Text>
                </TouchableOpacity>
                <Modal
                  visible={showExpPicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => {
                    setShowExpPicker(false);
                    setFocusedField(null);
                  }}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.pickerContainer}>
                      <Text style={styles.pickerTitle}>
                        {t('selected_month_year') || 'Selected'}: {cardExp || t('none_selected') || 'None'}
                      </Text>
                      <ScrollView style={{ maxHeight: 300 }}>
                        {monthOptions.map((opt) => (
                          <TouchableOpacity
                            key={opt.value}
                            style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                            onPress={() => {
                              setCardExp(opt.value);
                              setCardExpLabel(opt.label);
                              setIsDateSelected(true);
                              setShowExpPicker(false);
                              setFocusedField(null);
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 16 }}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <TouchableOpacity
                        style={styles.pickerCloseButton}
                        onPress={() => {
                          setShowExpPicker(false);
                          setFocusedField(null);
                        }}
                      >
                        <Text style={styles.pickerCloseText}>
                          {t('close') || 'Close'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
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

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  buttonPressed && styles.buttonPressed,
                  purchaseMutation.isPending && styles.buttonDisabled,
                ]}
                onPress={handleConfirmPurchase}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={purchaseMutation.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {purchaseMutation.isPending ? t('buying') || 'Buying...' : t('confirm_purchase')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleBack}
                disabled={purchaseMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="nova-pretplata" />
    </View>
  );
});

NovaPretplata.displayName = "NovaPretplata";

export default NovaPretplata;
