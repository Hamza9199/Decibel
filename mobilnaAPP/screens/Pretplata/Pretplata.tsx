import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
import { KorisnikPretplata, Pretplata } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Pretplata.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { useLocalSearchParams } from 'expo-router';
import { useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';

const PretplataScreen: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [kupovinaLoading] = useState(false);
  const [korisnikID, setKorisnikID] = useState<string>('');

  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/pretplata' });

  useScreenCleanup();


  const getKorisnikID = useCallback(async (): Promise<string> => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        return user?.id || '';
      }
      return '';
    } catch (error) {
      console.error('Error getting user ID:', error);
      return '';
    }
  }, []);

  useEffect(() => {
    const initializeUser = async () => {
      const userId = await getKorisnikID();
      setKorisnikID(userId);
    };
    
    initializeUser();
  }, [getKorisnikID]);

  const subscriptionQuery = useQuery({
    queryKey: ['userSubscription', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return null;
      
      const response = await axios.get(`${API_BASE}/korisnik_pretplata/`);
      const pretplate: KorisnikPretplata[] = response.data || [];
      return pretplate.find((p) => p.korisnikID === korisnikID) || null;
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, 
  });

  const offersQuery = useQuery({
    queryKey: ['subscriptionOffers'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pretplate/`);
      return (response.data || []).filter((p: Pretplata) => p.dostupno);
    },
    enabled: !subscriptionQuery.data, 
    staleTime: 10 * 60 * 1000, 
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      await axios.delete(`${API_BASE}/korisnik_pretplata/${subscriptionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSubscription', korisnikID] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionOffers'] });
      Alert.alert(
        t('success') || 'Success',
        t('subscription_cancelled') || 'Subscription cancelled successfully'
      );
    },
    onError: (error) => {
      console.error('Error cancelling subscription:', error);
      Alert.alert(
        t('error') || 'Error',
        t('error_cancelling_subscription') || 'Error cancelling subscription'
      );
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['userSubscription', korisnikID] }),
      queryClient.invalidateQueries({ queryKey: ['subscriptionOffers'] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [korisnikID]);

  const handleOtkaziPretplatu = useCallback(async () => {
    const korisnikPretplata = subscriptionQuery.data;
    if (!korisnikPretplata) return;
    
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('cancel_subscription_confirm') || 'Are you sure you want to cancel your subscription?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { 
          text: t('confirm') || 'Confirm', 
          style: 'destructive',
          onPress: () => cancelSubscriptionMutation.mutate(korisnikPretplata.id)
        }
      ]
    );
  }, [subscriptionQuery.data, cancelSubscriptionMutation, t]);

  const handleObnoviPretplatu = useCallback(() => {
    const korisnikPretplata = subscriptionQuery.data;
    if (!korisnikPretplata?.pretplataID) return;
    router.push(`/nova-pretplata/${korisnikPretplata.pretplataID}`);
  }, [subscriptionQuery.data, router]);

  const handleKupiPretplatu = useCallback((pretplataId: string) => {
    router.push(`/nova-pretplata/${pretplataId}`);
  }, [router]);

  const subscriptionStatus = useMemo(() => {
    const korisnikPretplata = subscriptionQuery.data;
    if (!korisnikPretplata) return null;
    
    return {
      status: korisnikPretplata.pretplataStatus,
      package: korisnikPretplata.pretplata?.naziv || t('no_data'),
      description: korisnikPretplata.pretplata?.opis,
      price: korisnikPretplata.pretplata?.cijena,
      expires: korisnikPretplata.datumIsteka ? new Date(korisnikPretplata.datumIsteka).toLocaleDateString() : null,
    };
  }, [subscriptionQuery.data, t]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = subscriptionQuery.isLoading || (offersQuery.isLoading && offersQuery.isEnabled);
  const error = subscriptionQuery.error || offersQuery.error;
  const ponude = offersQuery.data || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Back
        title={t('subscription') || 'Subscription'}
        onBackPress={handleBackPress}
        onProfilePress={() => router.push('/profile')}
        />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('subscription')}</Text>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {t('error_loading_data') || 'Error loading data'}
              </Text>
            </View>
          ) : subscriptionStatus ? (
            <View style={styles.infoBox}>
              <Text style={styles.statusText}>
                {t('status')}: <Text style={styles.boldText}>{subscriptionStatus.status}</Text>
              </Text>
              <Text style={styles.packageText}>
                {t('package')}: <Text style={styles.boldText}>{subscriptionStatus.package}</Text>
              </Text>
              {subscriptionStatus.description && (
                <Text style={styles.descriptionText}>
                  {subscriptionStatus.description}
                </Text>
              )}
              <Text style={styles.priceText}>
                {t('price')}: <Text style={styles.boldText}>{subscriptionStatus.price} KM / {t('month')}</Text>
              </Text>
              {subscriptionStatus.expires && (
                <Text style={styles.expiresText}>
                  {t('expires')}: <Text style={styles.boldText}>
                    {subscriptionStatus.expires}
                  </Text>
                </Text>
              )}
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonRenew]}
                  onPress={handleObnoviPretplatu}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  <Text style={styles.buttonText}>
                    {t('renew_subscription') || 'Renew'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCancel]}
                  onPress={handleOtkaziPretplatu}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  <Text style={styles.buttonText}>
                    {cancelSubscriptionMutation.isPending ? t('cancelling') : t('cancel_subscription') || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.successContainer}>
                <Text style={styles.successText}>
                  {t('active_subscription') || 'You have an active subscription'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noSubContainer}>
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  {t('no_active_subscription') || 'You don\'t have an active subscription. Choose one of the available subscriptions:'}
                </Text>
              </View>
              
              <View style={styles.offersContainer}>
                {ponude.length === 0 ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      {t('no_available_subscriptions') || 'No available subscriptions'}
                    </Text>
                  </View>
                ) : (
                  ponude.map((offer: Pretplata) => (
                    <View key={offer.id} style={styles.offerCard}>
                      <Text style={styles.offerName}>{offer.naziv}</Text>
                      <Text style={styles.offerDescription}>{offer.opis}</Text>
                      <Text style={styles.offerPrice}>
                        {offer.cijena} KM / {t('month')}
                      </Text>
                      <TouchableOpacity
                        style={styles.buyButton}
                        onPress={() => handleKupiPretplatu(String(offer.id))}
                        disabled={kupovinaLoading}
                      >
                        <Text style={styles.buyButtonText}>
                          {t('buy_subscription') || 'Buy Subscription'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Tabs currentRoute="subscription" />
    </View>
  );
});

PretplataScreen.displayName = "PretplataScreen";

export default PretplataScreen;
