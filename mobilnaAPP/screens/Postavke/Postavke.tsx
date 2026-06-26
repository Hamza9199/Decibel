import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './Postavke.styles';
import { styles as lightStyles } from './PostavkeWhite.styles';
import { useRouter,useLocalSearchParams } from 'expo-router';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';
import Loading from '@/komponente/Loading/Loading';
import * as FileSystem from 'expo-file-system';

const Postavke: React.FC = React.memo(() => {
  const { t, i18n } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [poruka, setPoruka] = useState('');
  const [brisanje, setBrisanje] = useState(false);
  const [jezik, setJezik] = useState(i18n.language || 'bs');
  const [tema, setTema] = useState('dark');
  const [showInitialLoading, setShowInitialLoading] = useState(true);
  const styles = tema === 'light' ? lightStyles : darkStyles;
  const router = useRouter();

  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/settings', currentRoute: '/settings' });

  const loadSettings = useCallback(async () => {
    try {
      const savedLang = await AsyncStorage.getItem('decibel_lang');
      const savedTheme = await AsyncStorage.getItem('decibel_tema');
      
      if (savedLang) {
        setJezik(savedLang);
      }
      if (savedTheme) {
        setTema(savedTheme);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const timer = setTimeout(() => setShowInitialLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const artistApplicationMutation = useMutation({
    mutationFn: async (message: string) => {
      const userData = await AsyncStorage.getItem('korisnik');
      if (!userData) throw new Error('You must be logged in');

      const user = JSON.parse(userData);
      const korisnikID = user?.id;

      if (!korisnikID) throw new Error('You must be logged in');

      await axios.post(`${API_BASE}/prijave_izvodjaca/`, {
        korisnikID,
        poruka: message.trim(),
        datum: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      Alert.alert(t('success'), t('application_sent') || 'Application sent successfully!');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Error sending application:', error);
      Alert.alert(t('error'), t('application_error') || 'Error sending application');
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const userData = await AsyncStorage.getItem('korisnik');
      if (!userData) throw new Error('You must be logged in');

      const user = JSON.parse(userData);
      const korisnikID = user?.id;

      if (!korisnikID) throw new Error('You must be logged in');

      await axios.delete(`${API_BASE}/korisnici/${korisnikID}`);
      await AsyncStorage.removeItem('korisnik');
    },
    onSuccess: () => {
      Alert.alert(
        t('success'),
        t('account_deactivated') || 'Your account has been deactivated',
        [
          {
            text: 'OK',
            onPress: () => {
              router.push('/login');
              router.replace('/login');
            },
          },
        ]
      );
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Error deactivating account:', error);
      Alert.alert(t('error'), t('deactivation_error') || 'Error deactivating account');
    }
  });

  const handleOpenModal = useCallback(() => {
    setShowModal(true);
    setBrisanje(false);
    setPoruka('');
  }, []);

  const handleOpenBrisanje = useCallback(() => {
    setShowModal(true);
    setBrisanje(true);
    setPoruka('');
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setPoruka('');
    setBrisanje(false);
  }, []);

  const handleJezikChange = useCallback(async (itemValue: string) => {
    setJezik(itemValue);
    i18n.changeLanguage(itemValue);
    try {
      await AsyncStorage.setItem('decibel_lang', itemValue);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, [i18n]);

  const handleTemaChange = useCallback(async (itemValue: string) => {
    setTema(itemValue);
    try {
      await AsyncStorage.setItem('decibel_tema', itemValue);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, []);

  const [downloadSize, setDownloadSize] = useState<string>('');

  const handleSendApplication = useCallback(() => {
    if (!poruka.trim()) {
      Alert.alert(t('error'), t('fill_all_fields') || 'Please enter a message');
      return;
    }

    artistApplicationMutation.mutate(poruka);
  }, [poruka, artistApplicationMutation, t]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t('deactivate_account') || 'Deactivate Account',
      t('account_deactivated_info') || 'Are you sure you want to deactivate your account? This action cannot be undone.',
      [
        {
          text: t('cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('deactivate_account') || 'Deactivate',
          style: 'destructive',
          onPress: () => deleteAccountMutation.mutate()
        },
      ]
    );
  }, [deleteAccountMutation, t]);

  const handleDownloadData = useCallback(async () => {
    const userData = await AsyncStorage.getItem('korisnik');
    if (!userData) {
      Alert.alert(t('error'), t('must_be_logged_in') || 'You must be logged in');
      return;
    }
    const korisnikID = JSON.parse(userData).id;
    try {
      const response = await axios.get(`${API_BASE}/korisnici/${korisnikID}/izvoz-podataka`);
      const jsonStr = JSON.stringify(response.data, null, 2);
      const sizeKB = Math.round((new TextEncoder().encode(jsonStr).length) / 1024);
      setDownloadSize(`${sizeKB} KB`);
      const fileUri = `${FileSystem.documentDirectory}korisnik_${korisnikID}_podaci.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonStr);
      Alert.alert(t('success'), t('data_saved') || `Data saved to ${fileUri}`);
    } catch (error) {
      console.error(error);
      Alert.alert(t('error'), t('download_error') || 'Error downloading data');
    }
  }, [t]);

  const themePickerItems = useMemo(() => [
    <Picker.Item key="dark" label={t('dark_mode')} value="dark" />,
    <Picker.Item key="light" label={t('white_mode')} value="light" />
  ], [t]);

  const languagePickerItems = useMemo(() => [
    <Picker.Item key="bs" label="Bosanski/Srpski/Hrvatski" value="bs" />,
    <Picker.Item key="en" label="English" value="en" />,
    <Picker.Item key="de" label="German" value="de" />
  ], []);

    useScreenCleanup();
  

  return (
    showInitialLoading ? (
      <Loading />
    ) : (
      <View style={styles.container}>
      <Back
        title={t('settings') || 'Settings'}
        onBackPress={handleBackPress}
        onProfilePress={() =>   navigateWithHistory('/edit-profile?from=settings', '/settings')}
        source={from}
        />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('settings')}</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('appearance')}:</Text>
            <Picker
              selectedValue={tema}
              onValueChange={handleTemaChange}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {themePickerItems}
            </Picker>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('language')}:</Text>
            <Picker
              selectedValue={jezik}
              onValueChange={handleJezikChange}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {languagePickerItems}
            </Picker>
          </View>

          <View style={styles.section}>
            <View style={styles.linkSection}>
              <Text style={styles.label}>{t('artist_application')}:</Text>
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenModal}>
                <Text style={styles.linkText}>{t('apply_here')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.linkSection}>
              <Text style={styles.label}>{t('delete_profile')}:</Text>
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenBrisanje}>
                <Text style={styles.linkText}>{t('deleting')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>

              <TouchableOpacity style={styles.linkButton} onPress={handleDownloadData}>
                <Text style={styles.linkText}>{t('download_my_data') || 'Download My Data'}</Text>
              </TouchableOpacity>
              {downloadSize ? (
                <Text style={[styles.linkText, { marginLeft: 8, fontSize: 12, color: '#888' }]}>({downloadSize})</Text>
              ) : null}
            </View>
          </View>

          
        </View>
      </ScrollView>

      <Tabs currentRoute="settings" />

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!brisanje ? (
              <>
                <Text style={styles.modalTitle}>{t('artist_application')}</Text>
                <Text style={styles.modalText}>{t('why_choose_you')}</Text>
                <TextInput
                  style={styles.textArea}
                  value={poruka}
                  onChangeText={setPoruka}
                  placeholder={t('experience_genre_links')}
                  placeholderTextColor="#888"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.modalButtonText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.sendButton,
                      (!poruka.trim() || artistApplicationMutation.isPending) && styles.disabledButton,
                    ]}
                    onPress={handleSendApplication}
                    disabled={!poruka.trim() || artistApplicationMutation.isPending}
                  >
                    <Text style={styles.modalButtonText}>
                      {artistApplicationMutation.isPending ? t('sending') : t('send_application')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, styles.modalTitleDelete]}>
                  {t('deactivate_account')}
                </Text>
                <Text style={styles.modalText}>
                  {t('account_deactivated_info')}
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.modalButtonText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton, 
                      styles.deleteButton,
                      deleteAccountMutation.isPending && styles.disabledButton
                    ]}
                    onPress={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending}
                  >
                    <Text style={styles.modalButtonText}>
                      {deleteAccountMutation.isPending ? t('processing') : t('deactivate_account')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
    )
  );
});

Postavke.displayName = "Postavke";

export default Postavke;

