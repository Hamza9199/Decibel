import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { styles } from './Tabs.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabsProps {
  currentRoute?: string;
}

const Tabs: React.FC<TabsProps> = ({ currentRoute }) => {
  const router = useRouter();
  const segments = useSegments();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const getCurrentTab = () => {
    if (currentRoute) return currentRoute;
    const currentSegment = segments[segments.length - 1];
    if (currentSegment === 'search') return 'search';
    if (currentSegment === 'library') return 'library';
    if (currentSegment === 'profile') return 'profile';
    return 'home';
  };

  const activeTab = getCurrentTab();

  const handleTabPress = (route: string) => {
    switch (route) {
      case 'home':
        router.push('/(tabs)/');
        break;
      case 'search':
        router.push('/(tabs)/search');
        break;
    }
  };

  return (
    <View style={[styles.bottomTabBar, { bottom: insets.bottom }]}>
      <TouchableOpacity 
        style={styles.tabBarItem} 
        onPress={() => handleTabPress('home')}
      >
        <MaterialIcons 
          name="home" 
          size={24} 
          color={activeTab === 'home' ? '#b91d95' : '#888'} 
        />
        <Text style={[
          styles.tabBarLabel,
          activeTab === 'home' && styles.tabBarLabelActive
        ]}>
          {t('home')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.tabBarItem} 
        onPress={() => handleTabPress('search')}
      >
        <MaterialIcons 
          name="search" 
          size={24} 
          color={activeTab === 'search' ? '#b91d95' : '#888'} 
        />
        <Text style={[
          styles.tabBarLabel,
          activeTab === 'search' && styles.tabBarLabelActive
        ]}>
          {t('search')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tabBarItem} 
        onPress={() => router.push('/(tabs)/library')}
      >
        <MaterialIcons 
          name="library-music" 
          size={24} 
          color={activeTab === 'library' ? '#b91d95' : '#888'}
        />
        <Text style={[
          styles.tabBarLabel,
          activeTab === 'library' && styles.tabBarLabelActive
        ]}>
          {t('library')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Tabs;
