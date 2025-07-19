import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import UrediProfil from '@/screens/UrediProfil/UrediProfil';

export default function EditProfileScreen() {
  return (
    <AudioProvider>
      <UrediProfil />
    </AudioProvider>
  );
}
