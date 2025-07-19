import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import Biblioteka from '@/screens/Biblioteka/Biblioteka';

export default function LibraryScreen() {
  return (
    <AudioProvider>
      <Biblioteka />
    </AudioProvider>
  );
}
