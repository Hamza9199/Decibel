import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import Home from '@/screens/Home/Home';

export default function HomeTab() {
  return (
    <AudioProvider>
      <Home />
    </AudioProvider>
  );
}
