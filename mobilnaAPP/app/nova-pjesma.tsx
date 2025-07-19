import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import NovaPjesma from '@/screens/NovaPjesma/NovaPjesma';

export default function NovaPjesmaScreen() {
  return (
    <AudioProvider>
      <NovaPjesma />
    </AudioProvider>
  );
}
