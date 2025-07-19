import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import Omiljeno from '@/screens/Omiljeno/Omiljeno';

export default function OmiljenoPage() {
  return (
    <AudioProvider>
      <Omiljeno />
    </AudioProvider>
  );
}
