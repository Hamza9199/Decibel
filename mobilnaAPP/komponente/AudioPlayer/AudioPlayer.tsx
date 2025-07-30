import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Slider } from '@miblanchard/react-native-slider';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Korisnik, Playlista, Pjesma, KorisnikPretplata } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './AudioPlayer.styles';
import { useAudio } from '@/context/AudioContext';
import * as FileSystem from 'expo-file-system';
import { queryClient } from '@/config/queryClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


interface AudioPlayerProps {
  id?: number;
  src?: string;
  title?: string;
  putanjaGif?: string;
  putanjaSlika?: string;
  korisnikID?: string;
  visible: boolean;
  onClose?: () => void;
  minimized?: boolean;
  onExpand?: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = React.memo(({
  id,
  src,
  title,
  putanjaGif,
  putanjaSlika,
  korisnikID,
  visible,
  onClose,
  minimized,
  onExpand,
}) => {
  const { t } = useTranslation();
  const audioCtx = useAudio();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.3);
  const [muted, setMuted] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [currentSong, setCurrentSong] = useState<Pjesma | null>(null);
  const [currentOwner, setCurrentOwner] = useState<Korisnik | null>(null);
  const [pretplataValid, setPretplataValid] = useState<boolean | null>(null);
  const [showNoSubMsg, setShowNoSubMsg] = useState(true);
  const [playlistRepeat, setPlaylistRepeat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [lastLoadedSrc, setLastLoadedSrc] = useState<string | null>(null);
  const [seekValue, setSeekValue] = useState(0);
  const [isSeekingProgress, setIsSeekingProgress] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSeekingVolume, setIsSeekingVolume] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [statistikaSent, setStatistikaSent] = useState(false);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 65;
  const { data: korisnik } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const userData = await AsyncStorage.getItem('korisnik');
      return userData ? JSON.parse(userData) : null;
    },
    staleTime: 5 * 60 * 1000, 
        gcTime: 30 * 60 * 1000, 

  });

  const { data: allSongs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/pjesme/`);
      return response.data as Pjesma[];
    },
    staleTime: 2 * 60 * 1000, 
        gcTime: 30 * 60 * 1000, 

  });

  const { data: playlists = [] } = useQuery({
    queryKey: ['playlists', korisnik?.id],
    queryFn: async () => {
      if (!korisnik?.id) return [];
      const response = await axios.get(`${API_BASE}/playliste/`);
      return response.data || [];
    },
    enabled: !!korisnik?.id,
    staleTime: 2 * 60 * 1000,
        gcTime: 30 * 60 * 1000, 

  });

  const { data: likedSongs = [] } = useQuery({
    queryKey: ['likedSongs', korisnik?.id],
    queryFn: async () => {
      if (!korisnik?.id) return [];
      const response = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      return response.data || [];
    },
    enabled: !!korisnik?.id,
    staleTime: 2 * 60 * 1000,
        gcTime: 30 * 60 * 1000, 

  });

  const { data: songOwner } = useQuery({
    queryKey: ['user', currentSong?.korisnikID],
    queryFn: async () => {
      if (!currentSong?.korisnikID) return null;
      const response = await axios.get(`${API_BASE}/korisnici/${currentSong.korisnikID}`);
      return response.data;
    },
    enabled: !!currentSong?.korisnikID,
    staleTime: 5 * 60 * 1000,
  });

  const likeMutation = useMutation({
    mutationFn: async ({ action, pjesmaID }: { action: 'like' | 'unlike', pjesmaID: number }) => {
      if (action === 'like') {
        return axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID: korisnik?.id,
          pjesmaID,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
      } else {
        return axios.delete(`${API_BASE}/korisnik_pjesma/${korisnik?.id}/${pjesmaID}`);
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['likedSongs', korisnik?.id] });
      Alert.alert(t('success'), action === 'like' ? t('added_to_favorites') : t('removed_from_favorites'));
    },
    onError: () => {
      Alert.alert(t('error'), t('error_favorites'));
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ pjesmaID, playlistaID }: { pjesmaID: number, playlistaID: number }) => {
      return axios.post(`${API_BASE}/pjesna_playlista/dodaj-na-kraj/`, {
        pjesmaID,
        playlistaID,
      });
    },
    onSuccess: () => {
      setShowPlaylistModal(false);
      Alert.alert(t('success'), t('song_added_to_playlist'));
    },
    onError: () => {
      setShowPlaylistModal(false);
      Alert.alert(t('error'), t('error_adding_to_playlist'));
    },
  });

  const addToHistoryMutation = useMutation({
    mutationFn: async ({ korisnikID, pjesmaID }: { korisnikID: string, pjesmaID: number }) => {
      await axios.delete(`${API_BASE}/historija/obrisi/${korisnikID}/${pjesmaID}`).catch(() => {});
      
      return axios.post(`${API_BASE}/historija/`, {
        korisnikID,
        pjesmaID,
        playlistaID: null,
        kreiranDatumVrijeme: new Date().toISOString(),
        trajanje: currentSong?.trajanjeSekunde || 0,
        kontekstPustanjaURL: null,
        offline: false,
        kontekstPustanja: null,
      });
    },
  });

  const statistikaMutation = useMutation({
    mutationFn: async ({ korisnikID, pjesmaID }: { korisnikID: string, pjesmaID: number }) => {
      await axios.post(`${API_BASE}/statistika/`, {
        korisnikID,
        pjesmaID,
        brojReprodukcija: 1,
        ukupnoTrajanje: currentSong?.trajanjeSekunde || 0,
        zadnjePustanje: new Date().toISOString(),
      }).catch(() => {});

      if (currentSong) {
        await axios.put(`${API_BASE}/pjesme/${pjesmaID}`, {
          ...currentSong,
          brojReprodukcija: (currentSong.brojReprodukcija || 0) + 1,
        }).catch(() => {});
      }
    },
  });

  const playlistIdx = useMemo(
    () => audioCtx.audioState.playlistIdx ?? -1,
    [audioCtx.audioState.playlistIdx]
  );

  const globalPlaylist = useMemo(
    () => audioCtx.audioState.globalPlaylist ?? [],
    [audioCtx.audioState.globalPlaylist]
  );

  const pjesma = useMemo(
    () => allSongs.find(p => p.putanjaAudio === src) || null,
    [allSongs, src]
  );

  const isLiked = useMemo(() => {
    if (!pjesma?.id || !korisnik?.id) return false;
    return likedSongs.some((item: any) => 
      item.korisnikID === korisnik.id && item.pjesmaID === pjesma.id
    );
  }, [likedSongs, pjesma?.id, korisnik?.id]);

  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked]);

  useEffect(() => {
    setCurrentOwner(songOwner || null);
  }, [songOwner]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    setPretplataValid(true); 
  }, []);

  useEffect(() => {
    if (sound && isLoaded) {
      sound.setIsLoopingAsync(repeatOne);
    }
  }, [repeatOne, sound, isLoaded]);

  const handleEnded = useCallback(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0) {
      const nextIdx = playlistIdx + 1;
      if (nextIdx < globalPlaylist.length) {
        audioCtx.setPlaylistIdx(nextIdx);
      } else if (playlistRepeat) {
        audioCtx.setPlaylistIdx(0);
      } else {
        setPlaying(false);
      }
    } else {
      setPlaying(false);
    }
  }, [globalPlaylist, playlistIdx, playlistRepeat, audioCtx]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis / 1000);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      setPlaying(status.isPlaying);

      if (!isLoaded) {
        setIsLoaded(true);
      }

      if ('didJustFinish' in status && status.didJustFinish) {
        handleEnded();
      }
    } else {
      if (isLoaded) {
        setIsLoaded(false);
      }
      if ('error' in status && status.error) {
        setIsLoaded(false);
        setPlaying(false);
      }
    }
  }, [handleEnded, isLoaded]);

  const loadAudio = useCallback(async () => {
    if (!src || isLoading) return;

    if (src === lastLoadedSrc && isLoaded && sound) {
      return;
    }
    
    try {
      setIsLoading(true);
      setIsLoaded(false);
      setLoadingAttempts(prev => prev + 1);
      
      console.log('Loading audio:', src);
      
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const soundConfig = {
        uri: src,
        headers: {
          'Accept': 'audio/*',
          'Range': 'bytes=0-',
        }
      };

      const initialStatus = {
        shouldPlay: false,
        volume: volume,
        rate: playbackRate,
        positionMillis: 0,
        isLooping: false,
      };

      console.log('Creating new sound with config:', soundConfig);
      const { sound: newSound } = await Audio.Sound.createAsync(
        soundConfig,
        initialStatus,
        onPlaybackStatusUpdate
      );

      console.log('Sound created successfully');
      setSound(newSound);
      setLastLoadedSrc(src);
      
      let loadCheckAttempts = 0;
      const maxLoadAttempts = 20;
      
      const checkIfLoaded = async (): Promise<boolean> => {
        try {
          const status = await newSound.getStatusAsync();
          if (status.isLoaded) {
            console.log('Sound is loaded and ready');
            setIsLoaded(true);
            return true;
          }
          
          loadCheckAttempts++;
          if (loadCheckAttempts < maxLoadAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return checkIfLoaded();
          }
          
          console.warn('Sound loading timeout after', loadCheckAttempts, 'attempts');
          return false;
        } catch (error) {
          console.error('Error checking sound status:', error);
          return false;
        }
      };

      const isReadyToPlay = await checkIfLoaded();
      
      if (isReadyToPlay) {
        console.log('Attempting to play loaded sound');
        try {
          await newSound.playAsync();
          setPlaying(true);
          console.log('Playback started successfully');
        } catch (playError) {
          console.error('Error starting playback:', playError);
          setPlaying(false);
        }
      } else {
        console.error('Sound failed to load properly');
        setIsLoaded(false);
      }
      
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoaded(false);
      setPlaying(false);
      
      if (loadingAttempts < 3) {
        console.log(`Retrying audio load (attempt ${loadingAttempts + 1})`);
        setTimeout(() => {
          setIsLoading(false);
          loadAudio();
        }, 1000);
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, [src, volume, playbackRate, onPlaybackStatusUpdate, sound, isLoading, lastLoadedSrc, isLoaded, loadingAttempts]);

  const lastPlaylistIdxRef = React.useRef<number | null>(null);
  const lastPlaylistRepeatRef = React.useRef<boolean | null>(null);

  useEffect(() => {
    if (
      globalPlaylist.length > 0 &&
      playlistIdx >= 0 &&
      playlistIdx < globalPlaylist.length
    ) {
      const song = globalPlaylist[playlistIdx];
      setCurrentSong(song);

      if (
        lastPlaylistIdxRef.current !== playlistIdx ||
        lastPlaylistRepeatRef.current !== playlistRepeat
      ) {
        if (song?.putanjaAudio) {
          setStatistikaSent(false);
          audioCtx.playPlaylist(globalPlaylist, playlistIdx, playlistRepeat);
        }
        lastPlaylistIdxRef.current = playlistIdx;
        lastPlaylistRepeatRef.current = playlistRepeat;
      }
    }
  }, [playlistIdx, globalPlaylist, playlistRepeat, audioCtx]);

  useEffect(() => {
    if (globalPlaylist.length === 0 && visible && src && id) {
      setCurrentSong({
        id,
        naziv: title || 'Unknown Song',
        putanjaAudio: src,
        putanjaGif,
        putanjaSlika,
        korisnikID,
      } as Pjesma);
      setStatistikaSent(false);
    }
  }, [visible, src, id, title, putanjaGif, putanjaSlika, korisnikID, globalPlaylist.length]);

  useEffect(() => {
    if (src && pretplataValid && visible) {
      if (src !== lastLoadedSrc) {
        setLoadingAttempts(0);
      }
      loadAudio();
    }
  }, [src, pretplataValid, visible, loadAudio, lastLoadedSrc]);

  const handlePlayPause = useCallback(async () => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0 && playlistIdx < globalPlaylist.length) {
      setPlaying(prev => !prev);
    } else if (globalPlaylist.length === 0 && src) {
      setPlaying(prev => !prev);
    }

    if (!sound) {
      console.warn('No sound object available');
      return;
    }

    if (isLoading) {
      console.warn('Sound is still loading');
      return;
    }

    try {
      const status = await sound.getStatusAsync();
      
      if (!status.isLoaded) {
        console.warn('Sound is not loaded');
        if (src) {
          loadAudio();
        }
        return;
      }

      if (playing) {
        console.log('Pausing playback');
        await sound.pauseAsync();
      } else {
        console.log('Starting playback');
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error in play/pause:', error);
      if (src) {
        console.log('Attempting to reload audio after play/pause error');
        setIsLoaded(false);
        loadAudio();
      }
    }
  }, [sound, isLoading, playing, src, loadAudio, globalPlaylist.length, playlistIdx]);

  useEffect(() => {
    if (!isSeekingProgress) {
      setSeekValue(progress);
    }
  }, [progress, isSeekingProgress]);

  const handleSeek = useCallback(async (value: number) => {
    if (!sound || !isLoaded || isLoading) return;

    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      const seekPosition = Math.max(0, Math.min(value, status.durationMillis ? status.durationMillis / 1000 : 0)) * 1000;
      
      const wasPlaying = status.isPlaying;
      
      await sound.setPositionAsync(seekPosition);
      
      if (wasPlaying) {
        await sound.playAsync();
      }
      
      setProgress(seekPosition / 1000);
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  }, [sound, isLoaded, isLoading]);

  const handleProgressSeekStart = useCallback(() => {
    setIsSeekingProgress(true);
  }, []);

  const handleProgressSeekChange = useCallback((value: number | number[]) => {
    const seekTime = Array.isArray(value) ? value[0] : value;
    setSeekValue(seekTime);
  }, []);

  const handleProgressSeekComplete = useCallback(async (value: number | number[]) => {
    const seekTime = Array.isArray(value) ? value[0] : value;
    await handleSeek(seekTime);
    setIsSeekingProgress(false);
  }, [handleSeek]);

  const handleVolumeSeekStart = useCallback(() => {
    setIsSeekingVolume(true);
  }, []);

  const handleVolumeSeekChange = useCallback((value: number | number[]) => {
    const newVolume = Array.isArray(value) ? value[0] : value;
    setVolume(newVolume);
  }, []);

  const handleVolumeSeekComplete = useCallback(async (value: number | number[]) => {
    const newVolume = Array.isArray(value) ? value[0] : value;
    setVolume(newVolume);
    if (sound && isLoaded && !isLoading) {
      try {
        await sound.setVolumeAsync(newVolume);
        if (muted && newVolume > 0) setMuted(false);
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
    setIsSeekingVolume(false);
  }, [sound, isLoaded, isLoading, muted]);

  const handleRateChange = useCallback(async (rate: number) => {
    setPlaybackRate(rate);
    if (sound && isLoaded && !isLoading) {
      try {
        await sound.setRateAsync(rate, true);
      } catch (error) {
        console.error('Error setting playback rate:', error);
      }
    }
  }, [sound, isLoaded, isLoading]);

  const handleMuteToggle = useCallback(async () => {
    if (!sound || !isLoaded || isLoading) return;
    try {
      if (muted) {
        await sound.setIsMutedAsync(false);
        setMuted(false);
      } else {
        await sound.setIsMutedAsync(true);
        setMuted(true);
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [sound, isLoaded, isLoading, muted]);

  const handleRepeatToggle = useCallback(() => {
    setRepeatOne(prev => {
      if (!prev) setPlaylistRepeat(false);
      return !prev;
    });
  }, []);

  const handleRepeatAllToggle = useCallback(() => {
    setPlaylistRepeat(prev => {
      if (!prev) setRepeatOne(false);
      return !prev;
    });
  }, []);

  const handleLike = useCallback(async () => {
    if (!pjesma || !korisnik?.id || likeMutation.isPending) return;
    
    const action = liked ? 'unlike' : 'like';
    setLiked(!liked); 
    
    try {
      await likeMutation.mutateAsync({ action, pjesmaID: pjesma.id });
    } catch {
      setLiked(liked); 
    }
  }, [pjesma, korisnik?.id, liked, likeMutation]);


  const ensureDirectoryExists = useCallback(async (filePath: string) => {
    const lastSlash = filePath.lastIndexOf('/');
    if (lastSlash === -1) return;
    const dirPath = filePath.substring(0, lastSlash + 1);
    try {
      const info = await FileSystem.getInfoAsync(dirPath);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }
    } catch {
    }
  }, []);

  const getSafeLocalPath = useCallback((remoteUrl: string, baseDir: string) => {
    const filename = remoteUrl.split('/').pop()?.replace(/[^a-zA-Z0-9_.-]/g, '_') || `file_${Date.now()}`;
    return baseDir + filename;
  }, []);

  const handleDownloadCurrentSong = useCallback(async () => {
    if (!src) return;

    try {
      const documentDirectory = FileSystem.documentDirectory;
      if (!documentDirectory) {
        Alert.alert(t('error'), t('error_downloading_song'));
        return;
      }

      const offlineDir = documentDirectory + 'offline_songs/';
      await ensureDirectoryExists(offlineDir);

      const audioLocalPath = getSafeLocalPath(src, offlineDir);
      await FileSystem.downloadAsync(src, audioLocalPath);

      let imageLocalPath = '';
      if (currentSong?.putanjaSlika) {
        imageLocalPath = getSafeLocalPath(currentSong.putanjaSlika, offlineDir);
        await FileSystem.downloadAsync(currentSong.putanjaSlika, imageLocalPath);
      }

      const offlineSong = {
        id: currentSong?.id,
        naziv: currentSong?.naziv,
        izvođač: currentOwner?.korisnicko_ime || '',
        putanjaAudio: audioLocalPath,
        putanjaSlika: imageLocalPath || '',
      };

      const existing = await AsyncStorage.getItem('offline_pjesme');
      let offlineSongs = [];
      if (existing) {
        offlineSongs = JSON.parse(existing);
      }
      if (!offlineSongs.find((s: any) => s.id === currentSong?.id)) {
        offlineSongs.push(offlineSong);
        await AsyncStorage.setItem('offline_pjesme', JSON.stringify(offlineSongs));
        Alert.alert(t('success'), t('song_downloaded_offline') || 'Song downloaded for offline listening.');
      } else {
        Alert.alert(t('info'), t('song_already_downloaded') || 'Song is already downloaded.');
      }
    } catch (error) {
      console.error('Error downloading song:', error);
      Alert.alert(t('error'), t('error_downloading_song'));
    }
  }, [src, currentSong, currentOwner, t, ensureDirectoryExists, getSafeLocalPath]);

  const handleAddToPlaylist = useCallback(async (playlistaID: number) => {
    if (!pjesma || !korisnik?.id || addToPlaylistMutation.isPending) return;
    
    try {
      await addToPlaylistMutation.mutateAsync({ 
        pjesmaID: pjesma.id, 
        playlistaID 
      });
    } catch (error) {
      console.error('Error adding song to playlist:', error);
    }
  }, [pjesma, korisnik?.id, addToPlaylistMutation]);

  const addToHistoryRef = useRef<{ korisnikID: string; pjesmaID: number } | null>(null);
  
  useEffect(() => {
    if (!pjesma || !korisnik?.id || !src) return;
    
    const currentParams = { korisnikID: korisnik.id, pjesmaID: pjesma.id };
    
    if (!addToHistoryRef.current || 
        addToHistoryRef.current.korisnikID !== currentParams.korisnikID ||
        addToHistoryRef.current.pjesmaID !== currentParams.pjesmaID) {
      
      addToHistoryRef.current = currentParams;
      addToHistoryMutation.mutate(currentParams);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pjesma?.id, korisnik?.id, src]);

  const statistikaRef = useRef<{ korisnikID: string; pjesmaID: number; sent: boolean } | null>(null);
  
  useEffect(() => {
    if (!pjesma || !korisnik?.id || !playing || !src) {
      setStatistikaSent(false);
      if (statistikaRef.current) {
        statistikaRef.current.sent = false;
      }
      return;
    }
    
    if (progress < 30 || statistikaSent) return;

    const currentParams = { korisnikID: korisnik.id, pjesmaID: pjesma.id, sent: true };
    
    if (!statistikaRef.current || 
        statistikaRef.current.korisnikID !== currentParams.korisnikID ||
        statistikaRef.current.pjesmaID !== currentParams.pjesmaID ||
        !statistikaRef.current.sent) {
      
      statistikaRef.current = currentParams;
      statistikaMutation.mutate({ korisnikID: currentParams.korisnikID, pjesmaID: currentParams.pjesmaID });
      setStatistikaSent(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, pjesma?.id, korisnik?.id, statistikaSent, src, playing]);

  useEffect(() => {
    setStatistikaSent(false);
    if (statistikaRef.current) {
      statistikaRef.current.sent = false;
    }
  }, [src]);

  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleOutsidePress = useCallback(() => {
    if (showSpeedModal) {
      setShowSpeedModal(false);
    }
  }, [showSpeedModal]);

  const renderPlaylistItem = useCallback(({ item }: { item: Playlista }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handleAddToPlaylist(item.id)}
    >
      <Text style={styles.playlistItemText}>{item.naziv}</Text>
    </TouchableOpacity>
  ), [handleAddToPlaylist]);

  const speedOptions = useMemo(() => [0.5, 0.75, 1, 1.25, 1.5, 2], []);

  if (pretplataValid === false) {
    if (showNoSubMsg) {
      return (
        <View style={styles.subscriptionContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowNoSubMsg(false)}
          >
            <MaterialIcons name="close" size={24} color="#ffe6ec" />
          </TouchableOpacity>
          <Text style={styles.subscriptionText}>
            {t('subscription_required')}
          </Text>
          <TouchableOpacity
            style={styles.subscriptionButton}
            onPress={() => {}}
          >
            <Text style={styles.subscriptionButtonText}>{t('buy_subscription')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  }

  if (!visible && !minimized) return null;

  if (minimized) {
    return (
      <TouchableOpacity style={styles.miniPlayer} onPress={onExpand}>
        <Image
          source={{ uri: currentSong?.putanjaGif || currentSong?.putanjaSlika || 'https://via.placeholder.com/50' }}
          style={styles.miniPlayerImage}
            cachePolicy="memory-disk"
        />
        <Text style={styles.miniPlayerText} numberOfLines={1}>
          {currentSong?.naziv || t('current_song')}
        </Text>
        <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={24} color="#ffe6ec" />
      </TouchableOpacity>
    );
  }
 
  return (
    <TouchableOpacity 
      style={[styles.audioPlayerBar, { bottom: tabBarHeight + insets.bottom }]} 
      activeOpacity={1} 
      onPress={handleOutsidePress}
    >
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <MaterialIcons name="close" size={20} color="#ffe6ec" />
      </TouchableOpacity>

      <View style={styles.topRow}>
        <Image
          source={{ uri: currentSong?.putanjaGif || currentSong?.putanjaSlika || 'https://via.placeholder.com/150' }}
          style={styles.audioLogo}
        />
        
        <View style={styles.audioMeta}>
          <View style={styles.audioDetails}>
            <Text style={styles.audioArtist} numberOfLines={1}>
              {currentOwner?.korisnicko_ime || t('unknown_user')}
            </Text>
            <Text style={styles.audioTitle} numberOfLines={1}>
              {currentSong?.naziv || t('no_current_song')}
            </Text>
          </View>
          <Text style={styles.audioTime}>
            {formatTime(isSeekingProgress ? seekValue : progress)} / {formatTime(duration)}
          </Text>
          {isLoading && (
            <Text style={styles.loadingText}>
              {t('loading')}{loadingAttempts > 1 ? ` (${loadingAttempts})` : ''}...
            </Text>
          )}
        </View>

        <TouchableOpacity 
          onPress={handleLike}
          disabled={!isLoaded || isLoading || !korisnik?.id || likeMutation.isPending}
          style={styles.likeButton}
        >
          <MaterialIcons 
            name={liked ? 'favorite' : 'favorite-border'} 
            size={20} 
            color={liked ? "#e91e63" : (!isLoaded || isLoading || !korisnik?.id) ? "#666" : "#ffe6ec"} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDownloadCurrentSong}
          disabled={!isLoaded || isLoading}
          style={[styles.likeButton, { left: 180, backgroundColor: '#e754a2' }]}
        >
          <MaterialIcons name="download" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity 
          style={[styles.controlBtn, (!isLoaded || isLoading) && styles.controlBtnDisabled]} 
          onPress={handlePlayPause}
          disabled={!isLoaded || isLoading}
        >
          <MaterialIcons 
            name={playing ? 'pause' : 'play-arrow'} 
            size={20} 
            color={(!isLoaded || isLoading) ? "#666" : "#fff"} 
          />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Slider
            value={isSeekingProgress ? seekValue : progress}
            minimumValue={0}
            maximumValue={duration || 1}
            onSlidingStart={handleProgressSeekStart}
            onValueChange={handleProgressSeekChange}
            onSlidingComplete={handleProgressSeekComplete}
            disabled={!isLoaded || isLoading}
            trackStyle={styles.progressTrack}
            thumbStyle={styles.progressThumb}
            minimumTrackTintColor="#b91d95"
            maximumTrackTintColor="#444"
          />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.leftControls}>
          <TouchableOpacity 
            onPress={handleMuteToggle}
            disabled={!isLoaded || isLoading}
            style={styles.controlIcon}
          >
            <MaterialIcons 
              name={muted ? 'volume-off' : 'volume-up'} 
              size={20} 
              color={(!isLoaded || isLoading) ? "#666" : "#ffe6ec"} 
            />
          </TouchableOpacity>

          <View style={styles.volumeSliderContainer}>
            <Slider
              value={volume}
              minimumValue={0}
              maximumValue={0.3}
              step={0.01}
              onSlidingStart={handleVolumeSeekStart}
              onValueChange={handleVolumeSeekChange}
              onSlidingComplete={handleVolumeSeekComplete}
              disabled={!isLoaded || isLoading}
              trackStyle={styles.volumeTrack}
              thumbStyle={styles.volumeThumb}
              minimumTrackTintColor="#b91d95"
              maximumTrackTintColor="#444"
            />
          </View>
        </View>

        <View style={styles.rightControls}>
          <TouchableOpacity 
            onPress={handleRepeatToggle}
            style={styles.controlIcon}
          >
            <MaterialIcons 
              name="repeat-one" 
              size={20} 
              color={repeatOne ? "#b91d95" : (!isLoaded || isLoading) ? "#666" : "#ffe6ec"} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleRepeatAllToggle}
            style={styles.controlIcon}
          >
            <MaterialIcons 
              name="repeat" 
              size={20} 
              color={playlistRepeat ? "#b91d95" : (!isLoaded || isLoading) ? "#666" : "#ffe6ec"} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowPlaylistModal(true)}
            disabled={!isLoaded || isLoading}
            style={styles.controlIcon}
          >
            <MaterialIcons 
              name="playlist-add" 
              size={20} 
              color={(!isLoaded || isLoading) ? "#666" : "#ffe6ec"} 
            />
          </TouchableOpacity>

          <View style={styles.speedContainer}>
            <TouchableOpacity 
              onPress={() => setShowSpeedModal(true)}
              disabled={!isLoaded || isLoading}
              style={styles.speedSelector}
            >
              <Text style={[
                styles.speedText,
                (!isLoaded || isLoading) && styles.speedTextDisabled
              ]}>
                {playbackRate}x
              </Text>
              <MaterialIcons 
                name="expand-more" 
                size={16} 
                color={(!isLoaded || isLoading) ? "#666" : "#ffe6ec"} 
              />
            </TouchableOpacity>

            {showSpeedModal && (
              <View style={styles.speedDropdown}>
                {speedOptions.map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={[
                      styles.speedDropdownItem,
                      playbackRate === rate && styles.speedDropdownItemActive
                    ]}
                    onPress={() => {
                      handleRateChange(rate);
                      setShowSpeedModal(false);
                    }}
                  >
                    <Text style={[
                      styles.speedDropdownText,
                      playbackRate === rate && styles.speedDropdownTextActive
                    ]}>
                      {rate}x
                    </Text>
                    {playbackRate === rate && (
                      <MaterialIcons name="check" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      <Modal
        visible={showPlaylistModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('add_to_playlist')}</Text>
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderPlaylistItem}
            />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowPlaylistModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;