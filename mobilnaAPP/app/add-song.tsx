import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import NovaPjesma from '@/screens/NovaPjesma/NovaPjesma';

export default function AddSongScreen() {
  return (
    <AudioProvider>
      <NovaPjesma />
    </AudioProvider>
  );
}
