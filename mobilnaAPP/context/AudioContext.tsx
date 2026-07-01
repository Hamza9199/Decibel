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
  globalPlaylist?: Pjesma[];
  playlistIdx?: number;
  playlistRepeat?: boolean;
  playerRefreshKey: number;
}

interface AudioContextType {
  audioState: AudioState;
  playAudio: (song: Pjesma) => void;
  playPlaylist: (playlist: Pjesma[], startIdx: number, repeatAll?: boolean) => void;
  closeAudio: () => void;
  stopAudio: () => void;
  minimizeAudio: () => void;
  expandAudio: () => void;
  setGlobalPlaylist: (playlist: Pjesma[]) => void;
  setPlaylistIdx: (idx: number) => void;
  setPlaylistRepeat: (repeat: boolean) => void;
  refreshAudioPlayer: () => void;
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
    globalPlaylist: [],
    playlistIdx: -1,
    playlistRepeat: false,
    playerRefreshKey: 0,
  });

  const playAudio = (song: Pjesma) => {
    setAudioState(prev => ({
      ...prev,
      id: song.id,
      src: song.putanjaAudio,
      title: song.naziv,
      putanjaGif: song.putanjaGif,
      putanjaSlika: song.putanjaSlika,
      korisnikID: song.korisnikID,
      visible: true,
      minimized: false,
      currentSong: song,
      globalPlaylist: [],
      playlistIdx: -1,
      playlistRepeat: false,
    }));
  };

  const playPlaylist = (playlist: Pjesma[], startIdx: number, repeatAll: boolean = false) => {
    if (playlist.length === 0 || startIdx < 0 || startIdx >= playlist.length) return;
    
    const song = playlist[startIdx];
    setAudioState(prev => ({
      ...prev,
      id: song.id,
      src: song.putanjaAudio,
      title: song.naziv,
      putanjaGif: song.putanjaGif,
      putanjaSlika: song.putanjaSlika,
      korisnikID: song.korisnikID,
      visible: true,
      minimized: false,
      currentSong: song,
      globalPlaylist: playlist,
      playlistIdx: startIdx,
      playlistRepeat: repeatAll,
    }));
  };

  const closeAudio = () => {
    setAudioState(prev => ({
      ...prev,
      visible: false,
      minimized: true,
    }));
  };

  const stopAudio = () => {
    setAudioState(prev => {
      if (
        !prev.visible &&
        !prev.minimized &&
        !prev.src &&
        (!prev.globalPlaylist || prev.globalPlaylist.length === 0) &&
        (prev.playlistIdx ?? -1) === -1 &&
        !prev.playlistRepeat
      ) {
        return prev;
      }

      return {
      ...prev,
      visible: false,
      minimized: false,
      globalPlaylist: [],
      playlistIdx: -1,
      playlistRepeat: false,
      };
    });
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

  const setGlobalPlaylist = (playlist: Pjesma[]) => {
    setAudioState(prev => ({
      ...prev,
      globalPlaylist: playlist,
    }));
  };

  const setPlaylistIdx = (idx: number) => {
    setAudioState(prev => {
      const song = prev.globalPlaylist?.[idx];
      if (song) {
        return {
          ...prev,
          id: song.id,
          src: song.putanjaAudio,
          title: song.naziv,
          putanjaGif: song.putanjaGif,
          putanjaSlika: song.putanjaSlika,
          korisnikID: song.korisnikID,
          currentSong: song,
          playlistIdx: idx,
        };
      }
      return {
        ...prev,
        playlistIdx: idx,
      };
    });
  };

  const setPlaylistRepeat = (repeat: boolean) => {
    setAudioState(prev => ({
      ...prev,
      playlistRepeat: repeat,
    }));
  };

  const refreshAudioPlayer = () => {
    setAudioState(prev => ({
      ...prev,
      playerRefreshKey: prev.playerRefreshKey + 1,
    }));
  };

  return (
    <AudioContext.Provider value={{
      audioState,
      playAudio,
      playPlaylist,
      closeAudio,
      stopAudio,
      minimizeAudio,
      expandAudio,
      setGlobalPlaylist,
      setPlaylistIdx,
      setPlaylistRepeat,
      refreshAudioPlayer,
    }}>
      {children}
    </AudioContext.Provider>
  );
};
    
