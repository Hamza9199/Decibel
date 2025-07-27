import React, { useState, useCallback, useMemo } from 'react';
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
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { API_BASE } from '@/config/api';
import { styles } from './Postavke.styles';

const Postavke: React.FC = React.memo(() => {
  const { t, i18n } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [poruka, setPoruka] = useState('');
  const [brisanje, setBrisanje] = useState(false);
  const [jezik, setJezik] = useState(i18n.language || 'bs');
  const [tema, setTema] = useState('dark');

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

  // Load settings when component mounts
  useMemo(() => {
    loadSettings();
  }, [loadSettings]);

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

  const handleSendApplication = useCallback(async () => {
    if (!poruka.trim()) {
      Alert.alert(t('error'), t('fill_all_fields') || 'Please enter a message');
      return;
    }

    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (!userData) {
        Alert.alert(t('error'), 'You must be logged in');
        return;
      }

      const user = JSON.parse(userData);
      const korisnikID = user?.id;

      if (!korisnikID) {
        Alert.alert(t('error'), 'You must be logged in');
        return;
      }

      await axios.post(`${API_BASE}/prijave_izvodjaca/`, {
        korisnikID,
        poruka: poruka.trim(),
        datum: new Date().toISOString(),
      });

      Alert.alert(t('success'), t('application_sent') || 'Application sent successfully!');
      handleCloseModal();
    } catch (error) {
      console.error('Error sending application:', error);
      Alert.alert(t('error'), t('application_error') || 'Error sending application');
    }
  }, [poruka, t, handleCloseModal]);

  const handleDeleteAccount = useCallback(async () => {
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
          onPress: async () => {
            try {
              const userData = await AsyncStorage.getItem('korisnik');
              if (!userData) {
                Alert.alert(t('error'), 'You must be logged in');
                return;
              }

              const user = JSON.parse(userData);
              const korisnikID = user?.id;

              if (!korisnikID) {
                Alert.alert(t('error'), 'You must be logged in');
                return;
              }

              await axios.delete(`${API_BASE}/korisnici/${korisnikID}`);
              await AsyncStorage.removeItem('korisnik');
              
              Alert.alert(
                t('success'),
                t('account_deactivated') || 'Your account has been deactivated',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate to login screen
                      // This would need proper navigation setup
                    },
                  },
                ]
              );
              handleCloseModal();
            } catch (error) {
              console.error('Error deactivating account:', error);
              Alert.alert(t('error'), t('deactivation_error') || 'Error deactivating account');
            }
          },
        },
      ]
    );
  }, [t, handleCloseModal]);

  // Memoize picker items
  const themePickerItems = useMemo(() => [
    <Picker.Item key="dark" label={t('dark_mode')} value="dark" />,
    <Picker.Item key="light" label={t('white_mode')} value="light" />
  ], [t]);

  const languagePickerItems = useMemo(() => [
    <Picker.Item key="bs" label="Bosanski/Srpski/Hrvatski" value="bs" />,
    <Picker.Item key="en" label="English" value="en" />,
    <Picker.Item key="de" label="German" value="de" />
  ], []);

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('settings')}</Text>
            <View style={styles.spacer} />
          </View>

          {/* Appearance Settings */}
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

          {/* Language Settings */}
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

          {/* Artist Application */}
          <View style={styles.section}>
            <View style={styles.linkSection}>
              <Text style={styles.label}>{t('artist_application')}:</Text>
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenModal}>
                <Text style={styles.linkText}>{t('apply_here')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delete Profile */}
          <View style={styles.section}>
            <View style={styles.linkSection}>
              <Text style={styles.label}>{t('delete_profile')}:</Text>
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenBrisanje}>
                <Text style={styles.linkText}>{t('deleting')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.additionalText}>
            {t('additional_settings')}
          </Text>
        </View>
      </ScrollView>

      {/* Use the new Tabs component */}
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
                      !poruka.trim() && styles.disabledButton,
                    ]}
                    onPress={handleSendApplication}
                    disabled={!poruka.trim()}
                  >
                    <Text style={styles.modalButtonText}>{t('send_application')}</Text>
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
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={handleDeleteAccount}
                  >
                    <Text style={styles.modalButtonText}>{t('deactivate_account')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
});

Postavke.displayName = "Postavke";

export default Postavke;

