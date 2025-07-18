import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Korisnik } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Header.styles';

interface HeaderProps {
  onSearchPress?: () => void;
  onProfilePress?: () => void;
  onLogoPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onSearchPress, 
  onProfilePress, 
  onLogoPress 
}) => {
  const [korisnik, setKorisnik] = useState<Korisnik | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screenWidth] = useState(Dimensions.get('window').width);
  const isMobile = screenWidth <= 480;

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setIsLoggedIn(true);
        
        // Fetch complete user data
        const response = await axios.get(`${API_BASE}/korisnici/${user.id}`);
        setKorisnik(response.data);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      setIsLoggedIn(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('korisnik');
              setIsLoggedIn(false);
              setKorisnik(null);
              // Navigate to login screen
              // You might want to use navigation here
            } catch (error) {
              console.error('Failed to logout:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.header}>
      {!isMobile && (
        <>
          <TouchableOpacity onPress={onLogoPress} style={styles.logoContainer}>
            <Image
              source={{ uri: '/logo.gif' }}
              style={styles.logoImg}
              contentFit="contain"
            />
            <Text style={styles.logo}>Decibel</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.searchContainer}>
        <TouchableOpacity onPress={onSearchPress} style={styles.searchButton}>
          <MaterialIcons name="search" size={24} color="#888" />
          <Text style={styles.searchPlaceholder}>Search...</Text>
        </TouchableOpacity>
      </View>

      {isMobile ? (
        <View style={styles.mobileActions}>
          <TouchableOpacity onPress={onProfilePress}>
            <Image
              source={{ 
                uri: korisnik?.putanjaProfilneSlike || 'https://via.placeholder.com/50' 
              }}
              style={styles.profileImgMobile}
              contentFit="cover"
            />
          </TouchableOpacity>
          {isLoggedIn && (
            <TouchableOpacity
              style={styles.logoutBtnMobile}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.desktopActions}>
          <Text style={styles.welcomeMessage}>
            Welcome {korisnik?.korisnicko_ime}!
          </Text>
          <TouchableOpacity onPress={onProfilePress}>
            <Image
              source={{ 
                uri: korisnik?.putanjaProfilneSlike || 'https://via.placeholder.com/50' 
              }}
              style={styles.profileImg}
              contentFit="cover"
            />
          </TouchableOpacity>
          {isLoggedIn && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default Header;
