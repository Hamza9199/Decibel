import React from 'react';
import { AudioProvider } from '@/context/AudioContext';
import NoviAlbum from '@/screens/NoviAlbum/NoviAlbum';

export default function NoviAlbumScreen() {
  return (
    <AudioProvider>
      <NoviAlbum />
    </AudioProvider>
  );
}
