import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import Izvodjac from '@/screens/Izvodjac/Izvodjac';

export default function IzvodjacPage() {
  return (
    <AudioProvider>
      <Izvodjac />
    </AudioProvider>
  );
}
