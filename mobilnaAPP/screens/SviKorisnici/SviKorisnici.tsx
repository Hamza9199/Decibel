import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Korisnik, PrijavaIzvodjaca } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './SviKorisnici.styles';

const SviKorisnici: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [prijavaModal, setPrijavaModal] = useState<{ korisnikID: string; prijava: PrijavaIzvodjaca } | null>(null);
  const [suspendModal, setSuspendModal] = useState<{
    korisnik: Korisnik;
    poruka: string;
    vrijemeDo: string;
  } | null>(null);

  const queryClient = useQueryClient();

  // Query for users data
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/korisnici/`);
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for applications data
  const applicationsQuery = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/prijave_izvodjaca/`);
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for updating user
  const updateUserMutation = useMutation({
    mutationFn: async ({ 
      korisnik, 
      field, 
      value 
    }: { 
      korisnik: Korisnik; 
      field: 'rola' | 'statusKorisnika'; 
      value: string 
    }) => {
      const updatedUser = {
        ...korisnik,
        rola: field === 'rola' ? value : korisnik.rola,
        statusKorisnika: field === 'statusKorisnika' ? value : korisnik.statusKorisnika,
      };

      await axios.put(`${API_BASE}/korisnici/${korisnik.id}`, updatedUser);

      // If status changes to active or inactive, delete suspension if exists
      if (
        field === 'statusKorisnika' &&
        (value === 'aktivan' || value === 'neaktivan')
      ) {
        try {
          const res = await axios.get(`${API_BASE}/suspendovani/korisnik/${korisnik.id}`);
          if (res.data && res.data.id) {
            await axios.delete(`${API_BASE}/suspendovani/${res.data.id}`);
          }
        } catch {
          // No suspension exists, ignore error
        }
      }

      return { korisnik, field, value };
    },
    onSuccess: ({ korisnik, field, value }) => {
      queryClient.setQueryData(['users'], (old: any) =>
        old ? old.map((k: Korisnik) =>
          k.id === korisnik.id
            ? {
                ...k,
                rola: field === 'rola' ? value : k.rola,
                statusKorisnika: field === 'statusKorisnika' ? value : k.statusKorisnika,
              }
            : k
        ) : []
      );
      setSuccess(t('successfully_updated') || 'Successfully updated');
      setError(null);
    },
    onError: (error) => {
      console.error('Error updating user:', error);
      setError(t('error_updating_user') || 'Error updating user');
      setSuccess(null);
    }
  });

  // Mutation for suspending user
  const suspendUserMutation = useMutation({
    mutationFn: async ({ 
      korisnik, 
      poruka, 
      vrijemeDo 
    }: { 
      korisnik: Korisnik; 
      poruka: string; 
      vrijemeDo: string 
    }) => {
      // First update user to suspended
      await axios.put(`${API_BASE}/korisnici/${korisnik.id}`, {
        ...korisnik,
        statusKorisnika: 'suspendovan',
      });
      
      // Then create suspension record
      await axios.post(`${API_BASE}/suspendovani/`, {
        korisnikID: korisnik.id,
        vrijemeDo,
        poruka,
      });

      return korisnik;
    },
    onSuccess: (korisnik) => {
      queryClient.setQueryData(['users'], (old: any) =>
        old ? old.map((k: Korisnik) =>
          k.id === korisnik.id
            ? { ...k, statusKorisnika: 'suspendovan' }
            : k
        ) : []
      );
      setSuccess(t('user_suspended') || 'User has been suspended');
      setError(null);
      setSuspendModal(null);
    },
    onError: (error) => {
      console.error('Error suspending user:', error);
      setError(t('error_suspending_user') || 'Error suspending user');
      setSuccess(null);
    }
  });

  // Mutation for deleting application
  const deleteApplicationMutation = useMutation({
    mutationFn: async (prijavaId: number) => {
      await axios.delete(`${API_BASE}/prijave_izvodjaca/${prijavaId}`);
      return prijavaId;
    },
    onSuccess: (prijavaId) => {
      queryClient.setQueryData(['applications'], (old: any) =>
        old ? old.filter((p: PrijavaIzvodjaca) => Number(p.id) !== prijavaId) : []
      );
      setPrijavaModal(null);
      setSuccess(t('application_deleted') || 'Application deleted successfully');
      setError(null);
    },
    onError: (error) => {
      console.error('Error deleting application:', error);
      setError(t('error_deleting_application') || 'Error deleting application');
      setSuccess(null);
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['applications'] }),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [queryClient]);

  const handleChange = useCallback(async (
    korisnik: Korisnik,
    field: 'rola' | 'statusKorisnika',
    value: string
  ) => {
    setError(null);
    setSuccess(null);

    // If selecting "suspended" status, open modal for message and time input
    if (field === 'statusKorisnika' && value === 'suspendovan') {
      setSuspendModal({
        korisnik,
        poruka: '',
        vrijemeDo: '',
      });
      return;
    }

    updateUserMutation.mutate({ korisnik, field, value });
  }, [updateUserMutation]);

  const handleConfirmSuspension = useCallback(async () => {
    if (!suspendModal) return;
    
    if (!suspendModal.poruka.trim() || !suspendModal.vrijemeDo.trim()) {
      Alert.alert(t('error'), t('fill_all_fields') || 'Please fill all fields');
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    suspendUserMutation.mutate({
      korisnik: suspendModal.korisnik,
      poruka: suspendModal.poruka,
      vrijemeDo: suspendModal.vrijemeDo,
    });
  }, [suspendModal, suspendUserMutation, t]);

  const handleCancelSuspension = useCallback(() => {
    if (!suspendModal) return;
    // Reset select to "active" without sending to backend
    queryClient.setQueryData(['users'], (old: any) =>
      old ? old.map((k: Korisnik) =>
        k.id === suspendModal.korisnik.id
          ? { ...k, statusKorisnika: 'aktivan' }
          : k
      ) : []
    );
    setSuspendModal(null);
  }, [suspendModal, queryClient]);

  const handleDeleteApplication = useCallback(async (prijavaId: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('confirm_delete_application') || 'Are you sure you want to delete this application?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => deleteApplicationMutation.mutate(prijavaId)
        }
      ]
    );
  }, [deleteApplicationMutation, t]);

  const handleModalClose = useCallback(() => {
    setPrijavaModal(null);
  }, []);

  const handleSuspendModalPorukaChange = useCallback((text: string) => {
    setSuspendModal(prev => prev ? { ...prev, poruka: text } : prev);
  }, []);

  const handleSuspendModalVrijemeDoChange = useCallback((text: string) => {
    setSuspendModal(prev => prev ? { ...prev, vrijemeDo: text } : prev);
  }, []);

  // Memoize filtered users
  const filtriraniKorisnici = useMemo(() => {
    const korisnici = usersQuery.data || [];
    return korisnici.filter((k: Korisnik) =>
      k.korisnicko_ime.toLowerCase().includes(search.toLowerCase())
    );
  }, [usersQuery.data, search]);

  const renderUserItem = useCallback(({ item }: { item: Korisnik }) => {
    const prijave = applicationsQuery.data || [];
    const prijava = prijave.find((p: PrijavaIzvodjaca) => p.korisnikID === item.id);
    
    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <Image
            source={{ 
              uri: item.putanjaProfilneSlike || 'https://via.placeholder.com/150' 
            }}
            style={styles.profileImage}
            contentFit="cover"
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.korisnicko_ime}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>

        <View style={styles.userDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('name')}:</Text>
            <Text style={styles.detailValue}>{item.ime}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('surname')}:</Text>
            <Text style={styles.detailValue}>{item.prezime}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('role')}:</Text>
            <View style={{ flex: 2 }}>
              <Picker
                selectedValue={item.rola}
                onValueChange={(value) => handleChange(item, 'rola', value)}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                <Picker.Item label={t('role_user') || 'User'} value="korisnik" />
                <Picker.Item label={t('role_artist') || 'Artist'} value="izvodac" />
                <Picker.Item label={t('role_admin') || 'Admin'} value="admin" />
              </Picker>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('status')}:</Text>
            <View style={{ flex: 2 }}>
              <Picker
                selectedValue={item.statusKorisnika}
                onValueChange={(value) => handleChange(item, 'statusKorisnika', value)}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                <Picker.Item label={t('status_active') || 'Active'} value="aktivan" />
                <Picker.Item label={t('status_inactive') || 'Inactive'} value="neaktivan" />
                <Picker.Item label={t('status_suspended') || 'Suspended'} value="suspendovan" />
              </Picker>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('artist_application')}:</Text>
            <View style={{ flex: 2 }}>
              {prijava ? (
                <TouchableOpacity
                  style={styles.applicationButton}
                  onPress={() => setPrijavaModal({ korisnikID: item.id, prijava })}
                >
                  <Text style={styles.applicationButtonText}>
                    {t('show_application') || 'Show Application'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noApplicationText}>
                  {t('no_application') || 'No application'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }, [applicationsQuery.data, handleChange, t]);

  // Memoize user in modal
  const modalUser = useMemo(() => {
    if (!prijavaModal) return null;
    const korisnici = usersQuery.data || [];
    return korisnici.find((k: Korisnik) => k.id === prijavaModal.korisnikID);
  }, [prijavaModal, usersQuery.data]);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = usersQuery.isLoading || applicationsQuery.isLoading;

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
          <Text style={styles.title}>{t('all_users') || 'All Users'}</Text>
          
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_users') || 'Search users...'}
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

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

          {filtriraniKorisnici.length === 0 ? (
            <Text style={styles.noUsers}>
              {(usersQuery.data?.length || 0) === 0
                ? t('no_users') || 'No users found'
                : t('no_results') || 'No results found'}
            </Text>
          ) : (
            <FlatList
              data={filtriraniKorisnici}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Application Modal */}
      <Modal
        visible={prijavaModal !== null}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('artist_application')}</Text>
            
            {prijavaModal && (
              <>
                <Text style={styles.modalText}>
                  <Text style={{ fontWeight: 'bold' }}>{t('user')}:</Text>{' '}
                  {modalUser
                    ? `${modalUser.korisnicko_ime} (${modalUser.ime} ${modalUser.prezime})`
                    : prijavaModal.korisnikID}
                </Text>

                <Text style={styles.modalText}>
                  <Text style={{ fontWeight: 'bold' }}>{t('message')}:</Text>
                </Text>
                <View style={styles.modalMessageBox}>
                  <Text style={styles.modalMessageText}>
                    {prijavaModal.prijava.poruka}
                  </Text>
                </View>

                <Text style={styles.modalText}>
                  <Text style={{ fontWeight: 'bold' }}>{t('date')}:</Text>{' '}
                  {prijavaModal.prijava.datum 
                    ? new Date(prijavaModal.prijava.datum).toLocaleString() 
                    : ''}
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={() => handleDeleteApplication(Number(prijavaModal.prijava.id))}
                    disabled={deleteApplicationMutation.isPending}
                  >
                    <Text style={styles.modalButtonText}>
                      {deleteApplicationMutation.isPending 
                        ? t('deleting') 
                        : t('delete_application') || 'Delete Application'
                      }
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={handleModalClose}
                  >
                    <Text style={styles.modalButtonText}>{t('close')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Suspension Modal */}
      <Modal
        visible={suspendModal !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelSuspension}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('suspend_user') || 'Suspend User'}</Text>
            
            {suspendModal && (
              <>
                <Text style={styles.modalText}>
                  <Text style={{ fontWeight: 'bold' }}>{t('user')}:</Text>{' '}
                  {suspendModal.korisnik.korisnicko_ime}
                </Text>

                <Text style={styles.modalText}>
                  {t('suspension_reason') || 'Reason for suspension'}:
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={t('enter_suspension_reason') || 'Enter reason for suspension'}
                  placeholderTextColor="#888"
                  value={suspendModal.poruka}
                  onChangeText={handleSuspendModalPorukaChange}
                  multiline
                />

                <Text style={styles.modalText}>
                  {t('suspension_until') || 'Suspension until (YYYY-MM-DDTHH:mm)'}:
                </Text>
                <TextInput
                  style={styles.modalDateInput}
                  placeholder="2024-12-31T23:59"
                  placeholderTextColor="#888"
                  value={suspendModal.vrijemeDo}
                  onChangeText={handleSuspendModalVrijemeDoChange}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={handleConfirmSuspension}
                    disabled={suspendUserMutation.isPending}
                  >
                    <Text style={styles.modalButtonText}>
                      {suspendUserMutation.isPending 
                        ? t('suspending') 
                        : t('confirm_suspension') || 'Confirm Suspension'
                      }
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={handleCancelSuspension}
                  >
                    <Text style={styles.modalButtonText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Tabs currentRoute="users" />
    </View>
  );
});

SviKorisnici.displayName = "SviKorisnici";

export default SviKorisnici;
