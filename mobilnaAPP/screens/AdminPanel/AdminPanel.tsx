import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma, Album, Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './AdminPanel.styles';

type ActiveTab = 'songs' | 'albums' | 'playlists';

const AdminPanel: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Pjesma[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('songs');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [songsRes, albumsRes, playlistsRes] = await Promise.all([
        axios.get(`${API_BASE}/pjesme/`),
        axios.get(`${API_BASE}/albumi/`),
        axios.get(`${API_BASE}/playliste/`),
      ]);

      setSongs(songsRes.data || []);
      setAlbums(albumsRes.data || []);
      setPlaylists(playlistsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(t('error_loading_data') || 'Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Load data when component mounts
  useMemo(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleApproveSong = useCallback(async (song: Pjesma, approved: boolean) => {
    setError(null);
    setSuccess(null);
    
    try {
      await axios.put(`${API_BASE}/pjesme/${song.id}`, {
        ...song,
        odobreno: approved,
      });
      
      setSongs(prev => prev.map(s => 
        s.id === song.id ? { ...s, odobreno: approved } : s
      ));
      
      setSuccess(t('song_status_updated') || 'Song status updated successfully');
    } catch (error) {
      console.error('Error updating song status:', error);
      setError(t('error_updating_song') || 'Error updating song status');
    }
  }, [t]);

  const handleApproveAlbum = useCallback(async (album: Album, approved: boolean) => {
    setError(null);
    setSuccess(null);
    
    try {
      await axios.put(`${API_BASE}/albumi/${album.id}`, {
        ...album,
        odobreno: approved,
      });
      
      setAlbums(prev => prev.map(a => 
        a.id === album.id ? { ...a, odobreno: approved } : a
      ));
      
      setSuccess(t('album_status_updated') || 'Album status updated successfully');
    } catch (error) {
      console.error('Error updating album status:', error);
      setError(t('error_updating_album') || 'Error updating album status');
    }
  }, [t]);

  const handleDeleteSong = useCallback(async (songId: number) => {
    Alert.alert(
      t('confirm_delete') || 'Confirm Delete',
      t('confirm_delete_song') || 'Are you sure you want to delete this song?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/pjesme/${songId}`);
              setSongs(prev => prev.filter(s => s.id !== songId));
              setSuccess(t('song_deleted') || 'Song deleted successfully');
            } catch (error) {
              console.error('Error deleting song:', error);
              setError(t('error_deleting_song') || 'Error deleting song');
            }
          },
        },
      ]
    );
  }, [t]);

  const handleDeleteAlbum = useCallback(async (albumId: number) => {
    Alert.alert(
      t('confirm_delete') || 'Confirm Delete',
      t('confirm_delete_album') || 'Are you sure you want to delete this album?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/albumi/${albumId}`);
              setAlbums(prev => prev.filter(a => a.id !== albumId));
              setSuccess(t('album_deleted') || 'Album deleted successfully');
            } catch (error) {
              console.error('Error deleting album:', error);
              setError(t('error_deleting_album') || 'Error deleting album');
            }
          },
        },
      ]
    );
  }, [t]);

  const handleDeletePlaylist = useCallback(async (playlistId: number) => {
    Alert.alert(
      t('confirm_delete') || 'Confirm Delete',
      t('confirm_delete_playlist') || 'Are you sure you want to delete this playlist?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/playliste/${playlistId}`);
              setPlaylists(prev => prev.filter(p => p.id !== playlistId));
              setSuccess(t('playlist_deleted') || 'Playlist deleted successfully');
            } catch (error) {
              console.error('Error deleting playlist:', error);
              setError(t('error_deleting_playlist') || 'Error deleting playlist');
            }
          },
        },
      ]
    );
  }, [t]);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setSearch('');
  }, []);

  // Memoize filtered data
  const filteredSongs = useMemo(() => 
    songs.filter(s => s.naziv.toLowerCase().includes(search.toLowerCase())),
    [songs, search]
  );

  const filteredAlbums = useMemo(() => 
    albums.filter(a => a.naziv.toLowerCase().includes(search.toLowerCase())),
    [albums, search]
  );

  const filteredPlaylists = useMemo(() => 
    playlists.filter(p => p.naziv.toLowerCase().includes(search.toLowerCase())),
    [playlists, search]
  );

  const renderSongItem = useCallback((song: Pjesma) => (
    <View key={song.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {song.naziv}
          </Text>
          <Text style={styles.itemArtist} numberOfLines={1}>
            {song.korisnik?.korisnicko_ime || song.korisnikID}
          </Text>
          <Text style={[
            styles.itemStatus,
            song.odobreno ? styles.approvedStatus : styles.unapprovedStatus
          ]}>
            {song.odobreno ? t('approved') : t('pending')}
          </Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        {song.putanjaAudio && (
          <TouchableOpacity style={[styles.actionButton, styles.playButton]}>
            <MaterialIcons name="play-arrow" size={16} color="#fff" />
            <Text style={styles.buttonText}>{t('play')}</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            song.odobreno ? styles.revokeButton : styles.approveButton
          ]}
          onPress={() => handleApproveSong(song, !song.odobreno)}
        >
          <Text style={styles.buttonText}>
            {song.odobreno ? t('revoke') : t('approve')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSong(song.id)}
        >
          <MaterialIcons name="delete" size={16} color="#fff" />
          <Text style={styles.buttonText}>{t('delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [t, handleApproveSong, handleDeleteSong]);

  const renderAlbumItem = useCallback((album: Album) => (
    <View key={album.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {album.naziv}
          </Text>
          <Text style={styles.itemArtist} numberOfLines={1}>
            {album.korisnik?.korisnicko_ime || album.korisnikID}
          </Text>
          <Text style={styles.itemArtist}>
            {t('likes')}: {album.brojLajkova || 0}
          </Text>
          <Text style={[
            styles.itemStatus,
            album.odobreno ? styles.approvedStatus : styles.unapprovedStatus
          ]}>
            {album.odobreno ? t('approved') : t('pending')}
          </Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.playButton]}>
          <MaterialIcons name="play-arrow" size={16} color="#fff" />
          <Text style={styles.buttonText}>{t('play')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            album.odobreno ? styles.revokeButton : styles.approveButton
          ]}
          onPress={() => handleApproveAlbum(album, !album.odobreno)}
        >
          <Text style={styles.buttonText}>
            {album.odobreno ? t('revoke') : t('approve')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAlbum(album.id)}
        >
          <MaterialIcons name="delete" size={16} color="#fff" />
          <Text style={styles.buttonText}>{t('delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [t, handleApproveAlbum, handleDeleteAlbum]);

  const renderPlaylistItem = useCallback((playlist: Playlista) => (
    <View key={playlist.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {playlist.naziv}
          </Text>
          <Text style={styles.itemArtist} numberOfLines={1}>
            {playlist.korisnik?.korisnicko_ime || playlist.korisnikID}
          </Text>
          <Text style={styles.itemArtist}>
            {t('likes')}: {playlist.brojLajkova || 0}
          </Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.playButton]}>
          <MaterialIcons name="play-arrow" size={16} color="#fff" />
          <Text style={styles.buttonText}>{t('play')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeletePlaylist(playlist.id)}
        >
          <MaterialIcons name="delete" size={16} color="#fff" />
          <Text style={styles.buttonText}>{t('delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [t, handleDeletePlaylist]);

  // Memoize search placeholder
  const searchPlaceholder = useMemo(() => {
    return activeTab === 'songs' ? t('search_songs') :
           activeTab === 'albums' ? t('search_albums') :
           t('search_playlists');
  }, [activeTab, t]);

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
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('admin_panel')}</Text>
            <View style={styles.spacer} />
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'songs' && styles.activeTab]}
              onPress={() => handleTabChange('songs')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'songs' && styles.activeTabText
              ]}>
                {t('songs')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'albums' && styles.activeTab]}
              onPress={() => handleTabChange('albums')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'albums' && styles.activeTabText
              ]}>
                {t('albums')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
              onPress={() => handleTabChange('playlists')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'playlists' && styles.activeTabText
              ]}>
                {t('playlists')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

          {/* Messages */}
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

          {/* Content */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'songs' ? t('songs') :
               activeTab === 'albums' ? t('albums') :
               t('playlists')}
            </Text>

            {activeTab === 'songs' && (
              <>
                {filteredSongs.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {songs.length === 0 ? t('no_songs') : t('no_results')}
                    </Text>
                  </View>
                ) : (
                  filteredSongs.map(renderSongItem)
                )}
              </>
            )}

            {activeTab === 'albums' && (
              <>
                {filteredAlbums.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {albums.length === 0 ? t('no_albums') : t('no_results')}
                    </Text>
                  </View>
                ) : (
                  filteredAlbums.map(renderAlbumItem)
                )}
              </>
            )}

            {activeTab === 'playlists' && (
              <>
                {filteredPlaylists.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {playlists.length === 0 ? t('no_playlists') : t('no_results')}
                    </Text>
                  </View>
                ) : (
                  filteredPlaylists.map(renderPlaylistItem)
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="admin" />
    </View>
  );
});

AdminPanel.displayName = "AdminPanel";

export default AdminPanel;
