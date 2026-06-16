import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { styles as darkStyles } from './Zahtjevi.styles';
import { styles as lightStyles } from './ZahtjeviWhite.styles';
import Back from '@/komponente/Back/Back';
import Tabs from '@/komponente/Tabs/Tabs';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBackPress } from '@/hooks/handleBackPress';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Zahtjevi: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/home', currentRoute: '/zahtjevi' });

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const activeStyles = theme === 'light' ? lightStyles : darkStyles;

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('decibel_tema');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTheme(); }, [loadTheme]);
  useEffect(() => {
    const interval = setInterval(loadTheme, 3000); 
    return () => clearInterval(interval);
  }, [loadTheme]);

  useScreenCleanup();

  return (
    <View style={activeStyles.container}>
      <Back
        title={t('zahtjevi') || 'Zahtjevi'}
        onBackPress={handleBackPress}
        onProfilePress={() => router.replace('/edit-profile')}
        source={from}
      />
      
      <ScrollView contentContainerStyle={activeStyles.scrollContainer}>
        <View style={activeStyles.headerRow}>
          <Text style={activeStyles.title}>
            {t('zahtjevi') || 'Zahtjevi'}
          </Text>
        </View>

        <View style={activeStyles.section}>
          <Text style={activeStyles.label}>{t('no_requests') || 'Trenutno nema zahtjeva'}</Text>
        </View>
      </ScrollView>

      <Tabs currentRoute="zahtjevi" />
    </View>
  );
});

Zahtjevi.displayName = "Zahtjevi";

export default Zahtjevi;