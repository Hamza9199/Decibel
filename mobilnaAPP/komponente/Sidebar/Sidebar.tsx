import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Korisnik } from '@/types';
import { styles } from './Sidebar.styles';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

type Role = 'korisnik' | 'izvodac' | 'admin';

const Sidebar: React.FC<SidebarProps> = React.memo(({ visible, onClose }) => {
  const { t } = useTranslation();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [user, setUser] = useState<Korisnik | null>(null);
  const [role, setRole] = useState<Role>('korisnik');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [showSongsMenu, setShowSongsMenu] = useState(false);
  const [showAlbumsMenu, setShowAlbumsMenu] = useState(false);

  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setRole(parsedUser.rola || 'korisnik');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  // Load user data when component becomes visible
  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible, loadUserData]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('logout'),
      t('logout_confirmation') || 'Are you sure you want to logout?',
      [
        {
          text: t('cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('korisnik');
              onClose();
              
              setTimeout(() => {
                router.replace('/login');
              }, 300);

            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  }, [t, onClose, router]);

  const handleNavPress = useCallback((route?: string, action?: () => void) => {
    if (action) {
      action();
    } else if (route) {
      // Handle settings route specifically
      if (route === '/settings') {
        router.push('/settings');
        onClose();
        return;
      }
      // Handle edit profile route
      if (route === '/profile/edit') {
        router.push('/edit-profile');
        onClose();
        return;
      }
      // Handle admin panel route
      if (route === '/admin-panel') {
        router.push('/admin-panel');
        onClose();
        return;
      }
      // Handle history route
      if (route === '/history') {
        router.push('/history');
        onClose();
        return;
      }
      // Handle subscription route
      if (route === '/profile/subscription') {
        router.push('/pretplata');
        onClose();
        return;
      }
      // Handle favorites routes
      if (route === '/favorites/songs') {
        router.push('/omiljeno/pjesme');
        onClose();
        return;
      }
      if (route === '/favorites/playlists') {
        router.push('/omiljeno/playliste');
        onClose();
        return;
      }
      if (route === '/favorites/albums') {
        router.push('/omiljeno/albumi');
        onClose();
        return;
      }
      // Handle playlists routes
      if (route === '/playlists') {
        router.push('/sve-playliste');
        onClose();
        return;
      }
      if (route === '/playlists/create') {
        router.push('/nova-playlista');
        onClose();
        return;
      }
      // Handle songs routes
      if (route === '/songs') {
        router.push('/svepjesme');
        onClose();
        return;
      }
      if (route === '/songs/add') {
        router.push('/nova-pjesma');
        onClose();
        return;
      }
      // Handle albums routes
      if (route === '/albums') {
        router.push('/svi-albumi');
        onClose();
        return;
      }
      if (route === '/albums/add') {
        router.push('/novi-album');
        onClose();
        return;
      }
      // Handle statistics route
      if (route === '/statistics') {
        router.push('/statistika');
        onClose();
        return;
      }
      // Handle users route
      if (route === '/users') {
        router.push('/svi-korisnici');
        onClose();
        return;
      }
      // For any unhandled routes, show alert
      Alert.alert(
        t('coming_soon') || 'Coming Soon',
        t('feature_coming_soon') || 'This feature is coming soon!'
      );
    }
    onClose();
  }, [router, onClose, t]);

  const renderIcon = useCallback((name: keyof typeof MaterialIcons.glyphMap, size = 22, color = '#ffe6ec') => (
    <MaterialIcons name={name} size={size} color={color} />
  ), []);

  const handleProfileMenuToggle = useCallback(() => {
    setShowProfileMenu(!showProfileMenu);
  }, [showProfileMenu]);

  const handlePlaylistMenuToggle = useCallback(() => {
    setShowPlaylistMenu(!showPlaylistMenu);
  }, [showPlaylistMenu]);

  const handleSongsMenuToggle = useCallback(() => {
    setShowSongsMenu(!showSongsMenu);
  }, [showSongsMenu]);

  const handleAlbumsMenuToggle = useCallback(() => {
    setShowAlbumsMenu(!showAlbumsMenu);
  }, [showAlbumsMenu]);

  const handleLogoPress = useCallback(() => {
    router.push('/(tabs)');
  }, [router]);

  const handleOfflinePress = useCallback(() => {
    router.push('/offline');
    onClose();
  }, [router, onClose]);

  // Memoize role-based sections
  const isArtistOrAdmin = useMemo(() => role === 'izvodac' || role === 'admin', [role]);
  const isAdmin = useMemo(() => role === 'admin', [role]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} onPress={onClose} />
        <View style={styles.sidebar}>
          {/* Logo */}
          <TouchableOpacity style={styles.logoWrap} onPress={handleLogoPress}>
            <Image
              source={require('../../assets/images/logo.gif')}
              style={styles.logoImg}
            />
            <Text style={styles.logoText}>Decibel</Text>
          </TouchableOpacity>

          <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
            {/* Profile Menu */}
            <View style={styles.profileMenu}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={handleProfileMenuToggle}
              >
                {renderIcon('person')}
                <Text style={styles.navBtnText}>{t('profile')}</Text>
              </TouchableOpacity>
              {showProfileMenu && (
                <View style={styles.subMenu}>
                  <TouchableOpacity
                    style={[styles.subNavBtn]}
                    onPress={() => handleNavPress('/profile/edit')}
                  >
                    {renderIcon('edit', 18, '#ffe6ec')}
                    <Text style={[styles.subNavBtnText]}>
                      {t('edit_profile')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subNavBtn]}
                    onPress={() => handleNavPress('/settings')}
                  >
                    {renderIcon('settings', 18, '#ffe6ec')}
                    <Text style={[styles.subNavBtnText]}>
                      {t('settings')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.subNavBtn}
                    onPress={() => handleNavPress('/profile/subscription')}
                  >
                    {renderIcon('card-membership', 18, '#ffe6ec')}
                    <Text style={styles.subNavBtnText}>
                      {t('subscription')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* History */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => handleNavPress('/history')}
            >
              {renderIcon('history')}
              <Text style={styles.navBtnText}>
                {t('history')}
              </Text>
            </TouchableOpacity>

            {/* Offline mode */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={handleOfflinePress}
            >
              {renderIcon('cloud-off')}
              <Text style={styles.navBtnText}>
                {t('offline_mode')}
              </Text>
            </TouchableOpacity>

            {/* Playlists Menu */}
            <View style={styles.profileMenu}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={handlePlaylistMenuToggle}
              >
                {renderIcon('queue-music')}
                <Text style={styles.navBtnText}>{t('playlists')}</Text>
              </TouchableOpacity>
              {showPlaylistMenu && (
                <View style={styles.subMenu}>
                  <TouchableOpacity
                    style={styles.subNavBtn}
                    onPress={() => handleNavPress('/playlists')}
                  >
                    {renderIcon('list', 18, '#ffe6ec')}
                    <Text style={styles.subNavBtnText}>
                      {t('all_playlists') || 'All Playlists'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.subNavBtn}
                    onPress={() => handleNavPress('/playlists/create')}
                  >
                    {renderIcon('add', 18, '#ffe6ec')}
                    <Text style={styles.subNavBtnText}>
                      {t('create_playlist') || 'Create Playlist'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Artist/Producer Section */}
            {isArtistOrAdmin && (
              <>
                <Text style={styles.sectionTitle}>{t('artists') || 'Artists'}</Text>
                
                {/* Songs Menu */}
                <View style={styles.profileMenu}>
                  <TouchableOpacity
                    style={styles.navBtn}
                    onPress={handleSongsMenuToggle}
                  >
                    {renderIcon('music-note')}
                    <Text style={styles.navBtnText}>{t('songs')}</Text>
                  </TouchableOpacity>
                  {showSongsMenu && (
                    <View style={styles.subMenu}>
                      <TouchableOpacity
                        style={styles.subNavBtn}
                        onPress={() => handleNavPress('/songs')}
                      >
                        {renderIcon('list', 18, '#ffe6ec')}
                        <Text style={styles.subNavBtnText}>
                          {t('all_songs') || 'All Songs'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.subNavBtn}
                        onPress={() => handleNavPress('/songs/add')}
                      >
                        {renderIcon('add', 18, '#ffe6ec')}
                        <Text style={styles.subNavBtnText}>
                          {t('new_song') || 'New Song'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Albums Menu */}
                <View style={styles.profileMenu}>
                  <TouchableOpacity
                    style={styles.navBtn}
                    onPress={handleAlbumsMenuToggle}
                  >
                    {renderIcon('album')}
                    <Text style={styles.navBtnText}>{t('albums')}</Text>
                  </TouchableOpacity>
                  {showAlbumsMenu && (
                    <View style={styles.subMenu}>
                      <TouchableOpacity
                        style={styles.subNavBtn}
                        onPress={() => handleNavPress('/albums')}
                      >
                        {renderIcon('list', 18, '#ffe6ec')}
                        <Text style={styles.subNavBtnText}>
                          {t('all_albums') || 'All Albums'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.subNavBtn}
                        onPress={() => handleNavPress('/albums/add')}
                      >
                        {renderIcon('add', 18, '#ffe6ec')}
                        <Text style={styles.subNavBtnText}>
                          {t('new_album') || 'New Album'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Admin Section */}
            {isAdmin && (
              <>
                <Text style={styles.sectionTitle}>Admin</Text>
                
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => handleNavPress('/admin-panel')}
                >
                  {renderIcon('admin-panel-settings', 22, '#ffe6ec')}
                  <Text style={styles.navBtnText}>
                    {t('admin_panel') || 'Admin Panel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => handleNavPress('/statistics')}
                >
                  {renderIcon('bar-chart', 22, '#ffe6ec')}
                  <Text style={styles.navBtnText}>
                    {t('statistics') || 'Statistics'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => handleNavPress('/users')}
                >
                  {renderIcon('group', 22, '#ffe6ec')}
                  <Text style={styles.navBtnText}>
                    {t('all_users') || 'All Users'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            {renderIcon('logout', 22, '#ffb3c6')}
            <Text style={styles.logoutBtnText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

Sidebar.displayName = "Sidebar";

export default Sidebar;
