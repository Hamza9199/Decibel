import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import Postavke from '@/screens/Postavke/Postavke';

export default function SettingsScreen() {
  return (
    <AudioProvider>
      <Postavke />
    </AudioProvider>
  );
}
