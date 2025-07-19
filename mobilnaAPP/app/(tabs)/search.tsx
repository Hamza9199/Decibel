import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import Search from '@/screens/Search/Search';

export default function SearchTab() {
  return (
    <AudioProvider>
      <Search />
    </AudioProvider>
  );
}
