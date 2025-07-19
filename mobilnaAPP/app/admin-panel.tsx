import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import AdminPanel from '@/screens/AdminPanel/AdminPanel';

export default function AdminPanelScreen() {
  return (
    <AudioProvider>
      <AdminPanel />
    </AudioProvider>
  );
}
