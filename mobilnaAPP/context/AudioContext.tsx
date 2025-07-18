import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Pjesma } from '@/types';

interface AudioState {
  id?: number;
  src?: string;
  title?: string;
  putanjaGif?: string;
  putanjaSlika?: string;
  korisnikID?: string;
  visible: boolean;
  minimized: boolean;
  currentSong?: Pjesma;
}

interface AudioContextType {
  audioState: AudioState;
  playAudio: (song: Pjesma) => void;
  closeAudio: () => void;
  minimizeAudio: () => void;
  expandAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [audioState, setAudioState] = useState<AudioState>({
    visible: false,
    minimized: false,
  });

  const playAudio = (song: Pjesma) => {
    setAudioState({
      id: song.id,
      src: song.putanjaAudio,
      title: song.naziv,
      putanjaGif: song.putanjaGif,
      putanjaSlika: song.putanjaSlika,
      korisnikID: song.korisnikID,
      visible: true,
      minimized: false,
      currentSong: song,
    });
  };

  const closeAudio = () => {
    setAudioState(prev => ({
      ...prev,
      visible: false,
      minimized: true,
    }));
  };

  const minimizeAudio = () => {
    setAudioState(prev => ({
      ...prev,
      visible: false,
      minimized: true,
    }));
  };

  const expandAudio = () => {
    setAudioState(prev => ({
      ...prev,
      visible: true,
      minimized: false,
    }));
  };

  return (
    <AudioContext.Provider value={{
      audioState,
      playAudio,
      closeAudio,
      minimizeAudio,
      expandAudio,
    }}>
      {children}
    </AudioContext.Provider>
  );
};
