import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import AlbumScreen from '@/screens/Album/Album';

export default function AlbumPage() {
  return (
    <AudioProvider>
      <AlbumScreen />
    </AudioProvider>
  );
}
