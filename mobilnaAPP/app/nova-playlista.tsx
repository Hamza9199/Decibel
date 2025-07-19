import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import NovaPlaylista from '@/screens/NovaPlaylista/NovaPlaylista';

export default function NovaPlaylistaScreen() {
  return (
    <AudioProvider>
      <NovaPlaylista />
    </AudioProvider>
  );
}
