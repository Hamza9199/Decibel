import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Korisnik } from '@/types';
import { styles } from './Sidebar.styles';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  source?: string; 
}

type Role = 'korisnik' | 'izvodac' | 'admin';

const Sidebar: React.FC<SidebarProps> = React.memo(({ visible, onClose, source }) => {
  const { t } = useTranslation();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [user, setUser] = useState<Korisnik | null>(null);
  const [role, setRole] = useState<Role>('korisnik');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [showSongsMenu, setShowSongsMenu] = useState(false);
  const [showAlbumsMenu, setShowAlbumsMenu] = useState(false);
  
  const translateX = useState(new Animated.Value(-280))[0];

  useEffect(() => {
    if (visible) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(translateX, {
        toValue: -280,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible, translateX]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // If swiped left significantly or with high velocity, close sidebar
      if (translationX < -100 || velocityX < -500) {
        onClose();
      } else {
        // Return to open position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  }, [onClose, translateX]);

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
      if (route === '/settings') {
        router.replace(`/settings?from=${source}`);
        onClose();
        return;
      }
      if (route === '/profile/edit') {
        router.replace(`/edit-profile?from=${source}`);
        onClose();
        return;
      }
      if (route === '/admin-panel') {
        router.replace(`/admin-panel?from=${source}`);
        onClose();
        return;
      }
      if (route === '/history') {
        router.replace(`/history?from=${source}`);
        onClose();
        return;
      }
      if (route === '/profile/subscription') {
        router.replace(`/pretplata?from=${source}`);
        onClose();
        return;
      }
      if (route === '/favorites/songs') {
        router.replace(`/omiljeno/pjesme?from=${source}`);
        onClose();
        return;
      }
      if (route === '/favorites/playlists') {
        router.replace(`/omiljeno/playliste?from=${source}`);
        onClose();
        return;
      }
      if (route === '/favorites/albums') {
        router.replace(`/omiljeno/albumi?from=${source}`);
        onClose();
        return;
      }
      if (route === '/playlists') {
        router.replace(`/sve-playliste?from=${source}`);
        onClose();
        return;
      }
      if (route === '/playlists/create') {
        router.replace(`/nova-playlista?from=${source}`);
        onClose();
        return;
      }
      if (route === '/songs') {
        router.replace(`/svepjesme?from=${source}`);
        onClose();
        return;
      }
      if (route === '/songs/add') {
        router.replace(`/nova-pjesma?from=${source}`);
        onClose();
        return;
      }
      if (route === '/albums') {
        router.replace(`/svi-albumi?from=${source}`);
        onClose();
        return;
      }
      if (route === '/albums/add') {
        router.replace(`/novi-album?from=${source}`);
        onClose();
        return;
      }
      if (route === '/statistics') {
        router.replace(`/statistika?from=${source}`);
        onClose();
        return;
      }
      if (route === '/users') {
        router.replace(`/svi-korisnici?from=${source}`);
        onClose();
        return;
      }
      Alert.alert(
        t('coming_soon') || 'Coming Soon',
        t('feature_coming_soon') || 'This feature is coming soon!'
      );
    }
    onClose();
  }, [router, onClose, t, source]);

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
    router.replace('/(tabs)?from=' + source);
  }, [router, source]);

  const handleOfflinePress = useCallback(() => {
    router.replace('/offline?from=' + source);
    onClose();
  }, [router, onClose, source]);

  const isArtistOrAdmin = useMemo(() => role === 'izvodac' || role === 'admin', [role]);
  const isAdmin = useMemo(() => role === 'admin', [role]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} onPress={onClose} />
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View 
            style={[
              styles.sidebar,
              {
                transform: [{ translateX }],
              }
            ]}
          >
            <TouchableOpacity style={styles.logoWrap} onPress={handleLogoPress}>
              <Image
                source={require('../../assets/images/logo.gif')}
                style={styles.logoImg}
              />
              <Text style={styles.logoText}>Decibel</Text>
            </TouchableOpacity>

            <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
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

              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => handleNavPress('/history')}
              >
                {renderIcon('history')}
                <Text style={styles.navBtnText}>
                  {t('history')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navBtn}
                onPress={handleOfflinePress}
              >
                {renderIcon('cloud-off')}
                <Text style={styles.navBtnText}>
                  {t('offline_mode')}
                </Text>
              </TouchableOpacity>

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

              {isArtistOrAdmin && (
                <>
                  <Text style={styles.sectionTitle}>{t('artists') || 'Artists'}</Text>
                  
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

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              {renderIcon('logout', 22, '#ffb3c6')}
              <Text style={styles.logoutBtnText}>{t('logout')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
});

Sidebar.displayName = "Sidebar";

export default Sidebar;
