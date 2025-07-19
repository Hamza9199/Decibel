import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import Historija from '@/screens/Historija/Historija';

export default function HistoryScreen() {
  return (
    <AudioProvider>
      <Historija />
    </AudioProvider>
  );
}
