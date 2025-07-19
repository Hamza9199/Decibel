import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import Playlista from '@/screens/Playlista/Playlista';

export default function PlaylistaScreen() {
  return (
    <AudioProvider>
      <Playlista />
    </AudioProvider>
  );
}
