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
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Pjesma, Album, Playlista } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './AdminPanel.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';


type ActiveTab = 'songs' | 'albums' | 'playlists';

const AdminPanel: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('songs');
  const [search, setSearch] = useState('');

  const { data: songs = [], isLoading: songsLoading, refetch: refetchSongs } = useQuery({
    queryKey: ['admin-songs'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/pjesme/`);
      return res.data || [];
    },
    staleTime: 2 * 60 * 1000, 
  });

  const { data: albums = [], isLoading: albumsLoading, refetch: refetchAlbums } = useQuery({
    queryKey: ['admin-albums'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/albumi/`);
      return res.data || [];
    },
    staleTime: 2 * 60 * 1000, 
  });

  const { data: playlists = [], isLoading: playlistsLoading, refetch: refetchPlaylists } = useQuery({
    queryKey: ['admin-playlists'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/playliste/`);
      return res.data || [];
    },
    staleTime: 2 * 60 * 1000, 
  });

  const songApprovalMutation = useMutation({
    mutationFn: async ({ song, approved }: { song: Pjesma, approved: boolean }) => {
      return axios.put(`${API_BASE}/pjesme/${song.id}`, {
        ...song,
        odobreno: approved,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      setSuccess(t('song_status_updated') || 'Song status updated successfully');
      setError(null);
    },
    onError: () => {
      setError(t('error_updating_song') || 'Error updating song status');
      setSuccess(null);
    },
  });

  const albumApprovalMutation = useMutation({
    mutationFn: async ({ album, approved }: { album: Album, approved: boolean }) => {
      return axios.put(`${API_BASE}/albumi/${album.id}`, {
        ...album,
        odobreno: approved,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-albums'] });
      setSuccess(t('album_status_updated') || 'Album status updated successfully');
      setError(null);
    },
    onError: () => {
      setError(t('error_updating_album') || 'Error updating album status');
      setSuccess(null);
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      return axios.delete(`${API_BASE}/pjesme/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      setSuccess(t('song_deleted') || 'Song deleted successfully');
      setError(null);
    },
    onError: () => {
      setError(t('error_deleting_song') || 'Error deleting song');
      setSuccess(null);
    },
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: async (albumId: number) => {
      return axios.delete(`${API_BASE}/albumi/${albumId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-albums'] });
      setSuccess(t('album_deleted') || 'Album deleted successfully');
      setError(null);
    },
    onError: () => {
      setError(t('error_deleting_album') || 'Error deleting album');
      setSuccess(null);
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async (playlistId: number) => {
      return axios.delete(`${API_BASE}/playliste/${playlistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlists'] });
      setSuccess(t('playlist_deleted') || 'Playlist deleted successfully');
      setError(null);
    },
    onError: () => {
      setError(t('error_deleting_playlist') || 'Error deleting playlist');
      setSuccess(null);
    },
  });

  const loading = songsLoading || albumsLoading || playlistsLoading;
  const refreshing = songApprovalMutation.isPending || albumApprovalMutation.isPending || 
                    deleteSongMutation.isPending || deleteAlbumMutation.isPending || 
                    deletePlaylistMutation.isPending;

  const onRefresh = useCallback(() => {
    refetchSongs();
    refetchAlbums();
    refetchPlaylists();
  }, [refetchSongs, refetchAlbums, refetchPlaylists]);

  const handleApproveSong = useCallback((song: Pjesma, approved: boolean) => {
    songApprovalMutation.mutate({ song, approved });
  }, [songApprovalMutation]);

  const handleApproveAlbum = useCallback((album: Album, approved: boolean) => {
    albumApprovalMutation.mutate({ album, approved });
  }, [albumApprovalMutation]);

  const handleDeleteSong = useCallback((songId: number) => {
    Alert.alert(
      t('confirm_delete') || 'Confirm Delete',
      t('confirm_delete_song') || 'Are you sure you want to delete this song?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: () => deleteSongMutation.mutate(songId),
        },
      ]
    );
  }, [t, deleteSongMutation]);

  const handleDeleteAlbum = useCallback((albumId: number) => {
    Alert.alert(
      t('confirm_delete') || 'Confirm Delete',
      t('confirm_delete_album') || 'Are you sure you want to delete this album?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: () => deleteAlbumMutation.mutate(albumId),
        },
      ]
    );
  }, [t, deleteAlbumMutation]);

  const handleDeletePlaylist = useCallback((playlistId: number) => {
    Alert.alert(
      t('confirm_delete') || 'Confirm Delete',
      t('confirm_delete_playlist') || 'Are you sure you want to delete this playlist?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: () => deletePlaylistMutation.mutate(playlistId),
        },
      ]
    );
  }, [t, deletePlaylistMutation]);

  const filteredSongs = useMemo(() => 
    songs.filter((s: Pjesma) => s.naziv.toLowerCase().includes(search.toLowerCase())),
    [songs, search]
  );

  const filteredAlbums = useMemo(() => 
    albums.filter((a: Album) => a.naziv.toLowerCase().includes(search.toLowerCase())),
    [albums, search]
  );

  const filteredPlaylists = useMemo(() => 
    playlists.filter((p: Playlista) => p.naziv.toLowerCase().includes(search.toLowerCase())),
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

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setSearch('');
  }, []);

  const searchPlaceholder = useMemo(() => {
    return activeTab === 'songs' ? t('search_songs') :
           activeTab === 'albums' ? t('search_albums') :
           t('search_playlists');
  }, [activeTab, t]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

    useScreenCleanup();
  

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

          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
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
