import React, { useState, useCallback, useMemo } from 'react';
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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Korisnik, Playlista, Pjesma, KorisnikPretplata } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './AudioPlayer.styles';
import { useAudio } from '@/context/AudioContext';

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
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.3);
  const [muted, setMuted] = useState(false);
  const [korisnik, setKorisnik] = useState<Korisnik | null>(null);
  const [repeatOne, setRepeatOne] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [liked, setLiked] = useState(false);
  const [pjesma, setPjesma] = useState<Pjesma | null>(null);
  const [currentOwner, setCurrentOwner] = useState<Korisnik | null>(null);
  const [pretplataValid] = useState<boolean>(true);
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

  const audioCtx = useAudio();

  useMemo(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('korisnik');
      if (userData) {
        const user = JSON.parse(userData);
        setKorisnik(user);
        
        // Load playlists for user
        if (user.id) {
          try {
            const res = await axios.get(`${API_BASE}/playliste/`);
            setPlaylists(res.data || []);
          } catch {
            setPlaylists([]);
          }
        }
        
        return user;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return null;
  }, []);

  // Load song data from API
  const loadSongData = useCallback(async (audioSrc: string) => {
    if (!audioSrc) {
      setPjesma(null);
      setLiked(false);
      return null;
    }

    try {
      const res = await axios.get(`${API_BASE}/pjesme/`);
      const song = (res.data as Pjesma[]).find((p) => p.putanjaAudio === audioSrc);
      setPjesma(song || null);
      
      // Load owner info if song exists
      if (song?.korisnikID) {
        try {
          const ownerRes = await axios.get(`${API_BASE}/korisnici/${song.korisnikID}`);
          setCurrentOwner(ownerRes.data);
        } catch {
          setCurrentOwner(null);
        }
      }
      
      return song;
    } catch {
      setPjesma(null);
      setLiked(false);
      return null;
    }
  }, []);

  // Check if song is liked
  const checkLikeStatus = useCallback(async (song: Pjesma, user: Korisnik) => {
    if (!song?.id || !user?.id) {
      setLiked(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const likedSongs = response.data || [];
      const isLiked = likedSongs.some((item: any) => 
        item.korisnikID === user.id && item.pjesmaID === song.id
      );
      setLiked(isLiked);
    } catch {
      setLiked(false);
    }
  }, []);

  // Add to history
  const addToHistorija = useCallback(async (song: Pjesma, user: Korisnik) => {
    if (!song || !user?.id) return;
    
    try {
      await axios.delete(`${API_BASE}/historija/obrisi/${user.id}/${song.id}`).catch(() => {});
      await axios.post(`${API_BASE}/historija/`, {
        korisnikID: user.id,
        pjesmaID: song.id,
        playlistaID: null,
        kreiranDatumVrijeme: new Date().toISOString(),
        trajanje: song.trajanjeSekunde || 0,
        kontekstPustanjaURL: null,
        offline: false,
        kontekstPustanja: null,
      });
    } catch {
      // Silent fail
    }
  }, []);

  // Send statistics
  const sendStatistika = useCallback(async (song: Pjesma, user: Korisnik) => {
    if (!song || !user?.id || statistikaSent) return;
    
    try {
      await axios.post(`${API_BASE}/statistika/`, {
        korisnikID: user.id,
        pjesmaID: song.id,
        brojReprodukcija: 1,
        ukupnoTrajanje: song.trajanjeSekunde || 0,
        zadnjePustanje: new Date().toISOString(),
      }).catch(() => {});

      await axios.put(`${API_BASE}/pjesme/${song.id}`, {
        ...song,
        brojReprodukcija: (song.brojReprodukcija || 0) + 1,
      }).catch(() => {});
      
      setStatistikaSent(true);
    } catch (error) {
      console.error('Failed to send statistics:', error);
    }
  }, [statistikaSent]);

  // Memoize playlist data
  const playlistIdx = useMemo(() => audioCtx.audioState.playlistIdx ?? -1, [audioCtx.audioState.playlistIdx]);
  const globalPlaylist = useMemo(() => audioCtx.audioState.globalPlaylist ?? [], [audioCtx.audioState.globalPlaylist]);

  // Memoize current song
  const currentSong = useMemo(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0 && playlistIdx < globalPlaylist.length) {
      return globalPlaylist[playlistIdx];
    }
    if (src && id) {
      return {
        id,
        naziv: title || 'Unknown Song',
        putanjaAudio: src,
        putanjaGif,
        putanjaSlika,
        korisnikID,
      } as Pjesma;
    }
    return null;
  }, [globalPlaylist, playlistIdx, src, id, title, putanjaGif, putanjaSlika, korisnikID]);

  // Initialize data when component mounts or src changes
  useMemo(() => {
    if (visible && src) {
      loadUserData().then(user => {
        if (user) {
          loadSongData(src).then(song => {
            if (song) {
              checkLikeStatus(song, user);
              addToHistorija(song, user);
            }
          });
        }
      });
      setStatistikaSent(false);
    }
  }, [visible, src, loadUserData, loadSongData, checkLikeStatus, addToHistorija]);

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
      const currentProgress = status.positionMillis / 1000;
      setProgress(currentProgress);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      setPlaying(status.isPlaying);

      if (!isLoaded) {
        setIsLoaded(true);
        console.log('Sound loaded via status update');
      }

      // Send statistics after 30 seconds
      if (currentProgress >= 30 && !statistikaSent && status.isPlaying && pjesma && korisnik) {
        sendStatistika(pjesma, korisnik);
      }

      if ('didJustFinish' in status && status.didJustFinish) {
        console.log('Playback finished');
        handleEnded();
      }
    } else {
      if (isLoaded) {
        console.log('Sound unloaded');
        setIsLoaded(false);
      }
      if ('error' in status && status.error) {
        console.error('Audio playback error:', status.error);
        setIsLoaded(false);
        setPlaying(false);
      }
    }
  }, [handleEnded, isLoaded, statistikaSent, pjesma, korisnik, sendStatistika]);

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
        console.log('Unloading previous sound');
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
        isLooping: repeatOne,
      };

      const { sound: newSound } = await Audio.Sound.createAsync(
        soundConfig,
        initialStatus,
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setLastLoadedSrc(src);
      
      let loadCheckAttempts = 0;
      const maxLoadAttempts = 20;
      
      const checkIfLoaded = async (): Promise<boolean> => {
        try {
          const status = await newSound.getStatusAsync();
          if (status.isLoaded) {
            setIsLoaded(true);
            return true;
          }
          
          loadCheckAttempts++;
          if (loadCheckAttempts < maxLoadAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return checkIfLoaded();
          }
          
          return false;
        } catch (error) {
          console.error('Error checking sound status:', error);
          return false;
        }
      };

      const isReadyToPlay = await checkIfLoaded();
      
      if (isReadyToPlay) {
        try {
          await newSound.playAsync();
          setPlaying(true);
        } catch (playError) {
          console.error('Error starting playback:', playError);
          setPlaying(false);
        }
      } else {
        setIsLoaded(false);
      }
      
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoaded(false);
      setPlaying(false);
      
      if (loadingAttempts < 3) {
        setTimeout(() => {
          setIsLoading(false);
          loadAudio();
        }, 1000);
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, [src, volume, playbackRate, repeatOne, onPlaybackStatusUpdate, sound, isLoading, lastLoadedSrc, isLoaded, loadingAttempts]);

  // Auto-load audio when conditions are met
  useMemo(() => {
    if (src && pretplataValid && visible) {
      if (src !== lastLoadedSrc) {
        setLoadingAttempts(0);
      }
      loadAudio();
    }
  }, [src, pretplataValid, visible, loadAudio, lastLoadedSrc]);

  // Handle playlist changes
  useMemo(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0 && playlistIdx < globalPlaylist.length) {
      const song = globalPlaylist[playlistIdx];
      if (song?.putanjaAudio) {
        setStatistikaSent(false);
        audioCtx.playPlaylist(globalPlaylist, playlistIdx, playlistRepeat);
      }
    }
  }, [playlistIdx, globalPlaylist, playlistRepeat, audioCtx]);

  // Update seek value based on progress
  useMemo(() => {
    if (!isSeekingProgress) {
      setSeekValue(progress);
    }
  }, [progress, isSeekingProgress]);

  // Update sound settings when they change
  useMemo(() => {
    if (sound && isLoaded && !isLoading) {
      sound.setIsLoopingAsync(repeatOne);
    }
  }, [repeatOne, sound, isLoaded, isLoading]);

  const handlePlayPause = useCallback(async () => {
    if (!sound) {
      if (src && pretplataValid && visible) {
        await loadAudio();
      }
      return;
    }

    if (isLoading) return;

    try {
      const status = await sound.getStatusAsync();
      
      if (!status.isLoaded) {
        if (src) {
          await loadAudio();
        }
        return;
      }

      if (playing) {
        await sound.pauseAsync();
        setPlaying(false);
      } else {
        await sound.playAsync();
        setPlaying(true);
      }
    } catch (error) {
      console.error('Error in play/pause:', error);
      if (src) {
        setIsLoaded(false);
        await loadAudio();
      }
    }
  }, [sound, isLoading, playing, src, pretplataValid, visible, loadAudio]);

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

  // Progress bar seeking handlers
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

  // Volume control handlers
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
    if (!pjesma || !korisnik?.id) return;
    
    try {
      if (liked) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnik.id}/${pjesma.id}`);
        setLiked(false);
        Alert.alert(t('success'), t('removed_from_favorites'));
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID: korisnik.id,
          pjesmaID: pjesma.id,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
        setLiked(true);
        Alert.alert(t('success'), t('added_to_favorites'));
      }
    } catch (error) {
      console.error('Error liking/unliking song:', error);
      Alert.alert(t('error'), t('error_favorites'));
    }
  }, [pjesma, korisnik, liked, t]);

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
      // Silent fail
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
    if (!src || !korisnik?.id) return;
    
    try {
      const pjesmaRes = await axios.get(`${API_BASE}/pjesme/`);
      const pjesma = (pjesmaRes.data as Pjesma[]).find((p) => p.putanjaAudio === src);
      if (!pjesma) return;

      await axios.post(`${API_BASE}/pjesna_playlista/dodaj-na-kraj/`, {
        pjesmaID: pjesma.id,
        playlistaID: playlistaID,
      });
      setShowPlaylistModal(false);
      Alert.alert(t('success'), t('song_added_to_playlist'));
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      setShowPlaylistModal(false);
      Alert.alert(t('error'), t('error_adding_to_playlist'));
    }
  }, [src, korisnik, t]);

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

  // Cleanup when component unmounts or src changes
  useMemo(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Subscription check UI - TEMPORARILY DISABLED
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

  // Minimized player
  if (minimized) {
    return (
      <TouchableOpacity style={styles.miniPlayer} onPress={onExpand}>
        <Image
          source={{ uri: currentSong?.putanjaGif || currentSong?.putanjaSlika || 'https://via.placeholder.com/50' }}
          style={styles.miniPlayerImage}
        />
        <Text style={styles.miniPlayerText} numberOfLines={1}>
          {currentSong?.naziv || t('current_song')}
        </Text>
        <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={24} color="#ffe6ec" />
      </TouchableOpacity>
    );
  }

  // Main player - redesigned to match mobile web layout
  return (
    <TouchableOpacity 
      style={styles.audioPlayerBar} 
      activeOpacity={1} 
      onPress={handleOutsidePress}
    >
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <MaterialIcons name="close" size={20} color="#ffe6ec" />
      </TouchableOpacity>

      {/* Top Row - Image, Meta, and Like Button */}
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

        {/* Like Button positioned to the right */}
        <TouchableOpacity 
          onPress={handleLike}
          disabled={!isLoaded || isLoading || !korisnik?.id}
          style={styles.likeButton}
        >
          <MaterialIcons 
            name={liked ? 'favorite' : 'favorite-border'} 
            size={20} 
            color={liked ? "#e91e63" : (!isLoaded || isLoading || !korisnik?.id) ? "#666" : "#ffe6ec"} 
          />
        </TouchableOpacity>
        {/* Download Button */}
        <TouchableOpacity
          onPress={handleDownloadCurrentSong}
          disabled={!isLoaded || isLoading}
          style={[styles.likeButton, { left: 180, backgroundColor: '#e754a2' }]}
        >
          <MaterialIcons name="download" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Controls Row - Play Button and Progress Bar */}
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

      {/* Bottom Row - All Controls */}
      <View style={styles.bottomRow}>
        <View style={styles.leftControls}>
          {/* Volume Controls */}
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

          {/* Add to Playlist */}
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

          {/* Playback Speed Select */}
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

            {/* Speed Dropdown */}
            {showSpeedModal && (
              <View style={styles.speedDropdown}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
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

      {/* Playlist Modal */}
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playlistItem}
                  onPress={() => handleAddToPlaylist(item.id)}
                >
                  <Text style={styles.playlistItemText}>{item.naziv}</Text>
                </TouchableOpacity>
              )}
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

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;            