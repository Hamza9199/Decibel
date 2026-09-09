import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Back from '@/komponente/Back/Back';
import Tabs from '@/komponente/Tabs/Tabs';
import { styles } from './PrivacyPolicy.styles';

const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation();

  const title = t('privacy_policy') || 'Politika privatnosti';
  const text =
    t('privacy_policy_text') ||
    'Ovdje se nalaze informacije o načinu na koji aplikacija Decibel prikuplja, koristi i štiti vaše podatke.';

  return (
    <View style={styles.container}>
      <Back title={title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </ScrollView>
      <Tabs currentRoute="privacypolicy" />
    </View>
  );
};

export default PrivacyPolicy;
