import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import PjesmePage from '@/screens/Pjesma/Pjesma';

export default function PjesmaScreen() {
  return (
    <AudioProvider>
      <PjesmePage />
    </AudioProvider>
  );
}
