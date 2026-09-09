import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import Back from '@/komponente/Back/Back';
import { styles } from './TermsConditions.styles';
import { useTranslation } from 'react-i18next';
import Tabs from '@/komponente/Tabs/Tabs';

const TermsConditions: React.FC = () => {
  const { t } = useTranslation();

 

  return (
    <View style={styles.container}>
      <Back title={t('terms_conditions') || 'Uslovi korištenja'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('terms_conditions') || 'Uslovi korištenja'}</Text>
        <Text style={styles.text}>{t('terms_conditions_text') || 'Ovdje se nalaze uslovi korištenja aplikacije Decibel.'}</Text>
      </ScrollView>
      <Tabs currentRoute="terms" />
    </View>
  );
};

export default TermsConditions;
