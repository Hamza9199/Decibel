import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import PretplataScreen from '@/screens/Pretplata/Pretplata';

export default function HistoryScreen() {
  return (
    <AudioProvider>
      <PretplataScreen />
    </AudioProvider>
  );
}
