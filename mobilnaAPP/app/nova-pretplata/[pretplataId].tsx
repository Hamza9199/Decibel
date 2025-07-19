import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import NovaPretplata from '@/screens/NovaPretplata/NovaPretplata';

export default function NovaPretplataScreen() {
  return (
    <AudioProvider>
      <NovaPretplata />
    </AudioProvider>
  );
}
