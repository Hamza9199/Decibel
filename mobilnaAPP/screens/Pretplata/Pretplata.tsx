import React, { useState, useCallback, useMemo } from 'react';
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
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { KorisnikPretplata, Pretplata } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Pretplata.styles';

const PretplataScreen: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [korisnikPretplata, setKorisnikPretplata] = useState<KorisnikPretplata | null>(null);
  const [ponude, setPonude] = useState<Pretplata[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kupovinaLoading, setKupovinaLoading] = useState(false);

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

  const loadData = useCallback(async () => {
    try {
      const korisnikID = await getKorisnikID();
      
      if (!korisnikID) {
        setError(t('must_be_logged_in') || 'You must be logged in');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);

      // Load user subscription
      const pretplateRes = await axios.get(`${API_BASE}/korisnik_pretplata/`);
      const pretplate: KorisnikPretplata[] = pretplateRes.data || [];
      const mojaPretplata = pretplate.find((p) => p.korisnikID === korisnikID);
      setKorisnikPretplata(mojaPretplata || null);
      
      // If no subscription, load available offers
      if (!mojaPretplata) {
        const ponudeRes = await axios.get(`${API_BASE}/pretplate/`);
        const dostupnePonude = (ponudeRes.data || []).filter((p: Pretplata) => p.dostupno);
        setPonude(dostupnePonude);
      }
    } catch (error: any) {
      console.error('Error loading subscription data:', error);
      if (error.response?.status === 404) {
        setError(t('no_data_found') || 'No data found');
      } else {
        setError(t('error_loading_data') || 'Error loading data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getKorisnikID, t]);

  // Load data when component mounts
  useMemo(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleOtkaziPretplatu = useCallback(async () => {
    if (!korisnikPretplata) return;
    
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('cancel_subscription_confirm') || 'Are you sure you want to cancel your subscription?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { 
          text: t('confirm') || 'Confirm', 
          style: 'destructive',
          onPress: async () => {
            setKupovinaLoading(true);
            try {
              await axios.delete(`${API_BASE}/korisnik_pretplata/${korisnikPretplata.id}`);
              Alert.alert(
                t('success') || 'Success',
                t('subscription_cancelled') || 'Subscription cancelled successfully'
              );
              // Refresh data
              await loadData();
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              Alert.alert(
                t('error') || 'Error',
                t('error_cancelling_subscription') || 'Error cancelling subscription'
              );
            } finally {
              setKupovinaLoading(false);
            }
          }
        }
      ]
    );
  }, [korisnikPretplata, t, loadData]);

  const handleObnoviPretplatu = useCallback(() => {
    if (!korisnikPretplata?.pretplataID) return;
    router.push(`/nova-pretplata/${korisnikPretplata.pretplataID}`);
  }, [korisnikPretplata?.pretplataID, router]);

  const handleKupiPretplatu = useCallback((pretplataId: string) => {
    router.push(`/nova-pretplata/${pretplataId}`);
  }, [router]);

  // Memoize subscription status display
  const subscriptionStatus = useMemo(() => {
    if (!korisnikPretplata) return null;
    
    return {
      status: korisnikPretplata.pretplataStatus,
      package: korisnikPretplata.pretplata?.naziv || t('no_data'),
      description: korisnikPretplata.pretplata?.opis,
      price: korisnikPretplata.pretplata?.cijena,
      expires: korisnikPretplata.datumIsteka ? new Date(korisnikPretplata.datumIsteka).toLocaleDateString() : null,
    };
  }, [korisnikPretplata, t]);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

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
      <Header />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('subscription')}</Text>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : subscriptionStatus ? (
            // Active subscription view
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
                  disabled={kupovinaLoading}
                >
                  <Text style={styles.buttonText}>
                    {t('renew_subscription') || 'Renew'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCancel]}
                  onPress={handleOtkaziPretplatu}
                  disabled={kupovinaLoading}
                >
                  <Text style={styles.buttonText}>
                    {t('cancel_subscription') || 'Cancel'}
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
            // No subscription view
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
                  ponude.map((offer) => (
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
