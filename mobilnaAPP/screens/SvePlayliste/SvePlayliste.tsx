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
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter,useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import Tabs from '@/komponente/Tabs/Tabs';
import { Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './SvePlayliste.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { useBackPress } from '@/hooks/handleBackPress';
import Back from '@/komponente/Back/Back';

const SvePlayliste: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [korisnikID, setKorisnikID] = useState<string>('');

  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/sve-playliste' });
  

  useScreenCleanup();


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

  const playlistsQuery = useQuery({
    queryKey: ['userPlaylists', korisnikID],
    queryFn: async () => {
      if (!korisnikID) return [];
      
      const response = await axios.get(`${API_BASE}/playliste/`);
      
      return (response.data || []).filter(
        (pl: Playlista) => pl.korisnikID === korisnikID
      );
    },
    enabled: !!korisnikID,
    staleTime: 5 * 60 * 1000, 
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async (playlistId: number) => {
      await axios.delete(`${API_BASE}/playliste/${playlistId}`);
      return playlistId;
    },
    onSuccess: (playlistId) => {
      queryClient.setQueryData(['userPlaylists', korisnikID], (old: any) => 
        old ? old.filter((pl: Playlista) => pl.id !== playlistId) : []
      );
      Alert.alert(t('success'), t('playlist_deleted') || 'Playlist deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting playlist:', error);
      Alert.alert(t('error'), t('error_deleting_playlist') || 'Error deleting playlist');
    }
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['userPlaylists', korisnikID] }).finally(() => {
      setRefreshing(false);
    });
  }, [korisnikID]);

  const handlePlayPlaylist = useCallback(async (playlistId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const songIds: number[] = res.data || [];
      
      if (songIds.length === 0) {
        Alert.alert(t('info'), t('empty_playlist') || 'Playlist is empty');
        return;
      }
      
      const songsPromises = songIds.map(id =>
        axios.get(`${API_BASE}/pjesme/${id}`)
          .then(r => r.data)
          .catch(() => null)
      );
      
      const playlistSongs = (await Promise.all(songsPromises)).filter(Boolean);
      
      if (playlistSongs.length === 0) {
        Alert.alert(t('info'), t('no_playable_songs') || 'No playable songs in playlist');
        return;
      }
      
      const firstSong = playlistSongs[0];
      if (firstSong?.putanjaAudio) {
        console.log('Playing playlist:', playlistId, 'First song:', firstSong.naziv);
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert(t('error'), t('error_playing_playlist') || 'Error playing playlist');
    }
  }, [t]);

  const handleEdit = useCallback((playlistId: number) => {
    router.replace(`/uredi-playlistu/${playlistId}`);
  }, [router]);

  const handleDelete = useCallback((playlistId: number) => {
    Alert.alert(
      t('confirm_action') || 'Confirm Action',
      t('confirm_delete_playlist') || 'Are you sure you want to delete this playlist?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: () => deletePlaylistMutation.mutate(playlistId)
        }
      ]
    );
  }, [deletePlaylistMutation, t]);

  const handleNavigateToPlaylist = useCallback((playlistId: number) => {
    router.replace(`/playlista/${playlistId}`);
  }, [router]);

  const handleNavigateToUser = useCallback((userId: string) => {
    router.replace(`/izvodjac/${userId}`);
  }, [router]);

  const filtriranePlayliste = useMemo(() => {
    const playliste = playlistsQuery.data || [];
    return playliste.filter((pl: Playlista) =>
      pl.naziv.toLowerCase().includes(search.toLowerCase())
    );
  }, [playlistsQuery.data, search]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = playlistsQuery.isLoading;
  const playliste = playlistsQuery.data || [];

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
        title={t('all_playlists') || 'All Playlists'}
        onBackPress={handleBackPress}
        onProfilePress={() => router.push('/profile')}
        />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('my_playlists') || 'My Playlists'}</Text>
          
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_playlists') || 'Search playlists...'}
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

          {filtriranePlayliste.length === 0 ? (
            <Text style={styles.noPlaylists}>
              {playliste.length === 0
                ? t('no_playlists_user') || 'You have no playlists'
                : t('no_results') || 'No results found'}
            </Text>
          ) : (
            <View style={styles.playlistGrid}>
              {filtriranePlayliste.map((playlist: Playlista) => (
                <View key={playlist.id} style={styles.card}>
                  <View style={styles.cardImageWrap}>
                    <Image
                      source={{ 
                        uri: playlist.putanjaSlika || 'https://via.placeholder.com/150' 
                      }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => handlePlayPlaylist(playlist.id)}
                    >
                      <MaterialIcons name="play-arrow" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity onPress={() => handleNavigateToPlaylist(playlist.id)}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {playlist.naziv}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => handleNavigateToUser(playlist.korisnikID ?? '')} disabled={!playlist.korisnikID}>
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {playlist.korisnik?.korisnicko_ime || t('unknown_user')}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(playlist.id)}
                    >
                      <Text style={styles.buttonText}>{t('edit')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(playlist.id)}
                      disabled={deletePlaylistMutation.isPending}
                    >
                      <Text style={styles.buttonText}>
                        {deletePlaylistMutation.isPending ? t('deleting') : t('delete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Tabs currentRoute="playlists" />
    </View>
  );
});

SvePlayliste.displayName = "SvePlayliste";

export default SvePlayliste;
