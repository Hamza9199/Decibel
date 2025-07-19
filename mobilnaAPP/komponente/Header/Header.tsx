import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Korisnik } from '@/types';
import { API_BASE } from '@/config/api';
import Sidebar from '@/komponente/Sidebar/Sidebar';
import { styles } from './Header.styles';
import { router } from 'expo-router';

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
  const { ready } = useTranslation();
  const [korisnik, setKorisnik] = useState<Korisnik | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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


  if (!ready) {
    return (
      <View style={styles.header}>
        <Text style={styles.logo}>Decibel</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.header}>
        {/* Menu Button */}
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowSidebar(true)}
        >
          <MaterialIcons name="menu" size={24} color="#ffe6ec" />
        </TouchableOpacity>

        {/* Logo */}
        <TouchableOpacity  
          style={styles.logoContainer}
        >
          <Image
            source={require('../../assets/images/logo.gif')}
            style={styles.logoImg}
            contentFit="contain"
          />
          <Text style={styles.logo}>Decibel</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          {/* Profile Button */}
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => router.push('/edit-profile')}
          >
            <Image
              source={{ 
                uri: korisnik?.putanjaProfilneSlike || 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.iconfinder.com%2Fdata%2Ficons%2Fflaticons-solid%2F16%2Fprofile-1-512.png&f=1&nofb=1&ipt=6b148c0994b76fe50e9a2fbb9e360cc3858b81f150251aca12a5ca51d932aca8' 
              }}
              style={styles.profileImgMobile}
              contentFit="cover"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sidebar */}
      <Sidebar 
        visible={showSidebar} 
        onClose={() => setShowSidebar(false)} 
      />
    </>
  );
};

export default Header;
