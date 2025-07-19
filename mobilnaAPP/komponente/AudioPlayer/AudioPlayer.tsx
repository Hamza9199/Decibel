import React, { useEffect, useState, useCallback } from 'react';
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
import { Korisnik, Playlista, Pjesma, KorisnikPretplata } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './AudioPlayer.styles';

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

const AudioPlayer: React.FC<AudioPlayerProps> = ({
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
  const [currentSong, setCurrentSong] = useState<Pjesma | null>(null);
  const [currentOwner, setCurrentOwner] = useState<Korisnik | null>(null);
  const [pretplataValid, setPretplataValid] = useState<boolean | null>(null);
  const [showNoSubMsg, setShowNoSubMsg] = useState(true);
  const [globalPlaylist, setGlobalPlaylist] = useState<Pjesma[]>([]);
  const [playlistIdx, setPlaylistIdx] = useState(-1);
  const [playlistRepeat, setPlaylistRepeat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [lastLoadedSrc, setLastLoadedSrc] = useState<string | null>(null);
  const [seekValue, setSeekValue] = useState(0);
  const [isSeekingProgress, setIsSeekingProgress] = useState(false);
  const [isSeekingVolume, setIsSeekingVolume] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [statistikaSent, setStatistikaSent] = useState(false);

  // Initialize audio
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

  // Check subscription - TEMPORARILY DISABLED
  useEffect(() => {
    setPretplataValid(true); // Temporarily set to true for testing
  }, []);

  const handleEnded = useCallback(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0) {
      if (repeatOne) {
        sound?.replayAsync();
        return;
      }
      const nextIdx = playlistIdx + 1;
      if (nextIdx < globalPlaylist.length) {
        setPlaylistIdx(nextIdx);
      } else if (playlistRepeat) {
        setPlaylistIdx(0);
      } else {
        setPlaying(false);
        setPlaylistIdx(-1);
        setGlobalPlaylist([]);
        setCurrentSong(null);
      }
    } else {
      if (repeatOne) {
        sound?.replayAsync();
        return;
      }
      setPlaying(false);
    }
  }, [globalPlaylist, playlistIdx, repeatOne, sound, playlistRepeat]);

  // Update the onPlaybackStatusUpdate callback
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis / 1000);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      setPlaying(status.isPlaying);
      
      if (!isLoaded) {
        setIsLoaded(true);
        console.log('Sound loaded via status update');
      }

      if (status.didJustFinish) {
        console.log('Playback finished');
        handleEnded();
      }
    } else {
      if (isLoaded) {
        console.log('Sound unloaded');
        setIsLoaded(false);
      }
      
      if (status.error) {
        console.error('Audio playback error:', status.error);
        setIsLoaded(false);
        setPlaying(false);
      }
    }
  }, [handleEnded, isLoaded]);

  // Load audio when src changes
  const loadAudio = useCallback(async () => {
    if (!src || isLoading) return;
    
    // Don't reload if it's the same source and already loaded
    if (src === lastLoadedSrc && isLoaded && sound) {
      console.log('Audio already loaded for this source');
      return;
    }
    
    try {
      setIsLoading(true);
      setIsLoaded(false);
      setLoadingAttempts(prev => prev + 1);
      
      console.log('Loading audio:', src);
      
      // Clean up previous sound
      if (sound) {
        console.log('Unloading previous sound');
        await sound.unloadAsync();
        setSound(null);
      }

      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new sound with proper error handling
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
      
      // Wait for the sound to be fully loaded before attempting to play
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
      
      // Retry logic for network issues
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

  // When globalPlaylist and playlistIdx changes, load the current song
  useEffect(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0 && playlistIdx < globalPlaylist.length) {
      const song = globalPlaylist[playlistIdx];
      setCurrentSong(song);
      if (song?.putanjaAudio) {
        // Reset statistics for new song
        setStatistikaSent(false);
        // Load the new song
        if (src !== song.putanjaAudio) {
          // This will trigger the loadAudio effect
          setLastLoadedSrc(null);
        }
      }
    }
  }, [playlistIdx, globalPlaylist, src]);

  // Set currentSong from props when not in playlist mode
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

  // Load audio when src changes and subscription is valid
  useEffect(() => {
    if (src && pretplataValid && visible) {
      // Reset loading attempts when src changes
      if (src !== lastLoadedSrc) {
        setLoadingAttempts(0);
      }
      loadAudio();
    }
  }, [src, pretplataValid, visible, loadAudio, lastLoadedSrc]);

  // Improved play/pause handler
  const handlePlayPause = async () => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0 && playlistIdx < globalPlaylist.length) {
      // Playlist mode
      setPlaying(prev => !prev);
    } else if (globalPlaylist.length === 0 && src) {
      // Single song mode
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
  };

  // Update seek value when progress changes (only if not actively seeking)
  useEffect(() => {
    if (!isSeekingProgress) {
      setSeekValue(progress);
    }
  }, [progress, isSeekingProgress]);

  // Enhanced handleSeek with proper state management
  const handleSeek = useCallback(async (value: number) => {
    if (!sound || !isLoaded || isLoading) return;

    try {
      await sound.setPositionAsync(value * 1000);
      setProgress(value);
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

  // Playback rate change handler
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

  // Mute toggle handler
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

  const handleRepeatToggle = () => {
    setRepeatOne(prev => {
      if (!prev) setPlaylistRepeat(false);
      return !prev;
    });
  };

  const handleRepeatAllToggle = () => {
    setPlaylistRepeat(prev => {
      if (!prev) setRepeatOne(false);
      return !prev;
    });
  };

  const handleLike = async () => {
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
  };

  const handleAddToPlaylist = async (playlistaID: number) => {
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
  };

  // Load user data and check if song is liked
  useEffect(() => {
    const loadUserAndCheckLike = async () => {
      try {
        const userData = await AsyncStorage.getItem('korisnik');
        if (userData) {
          const user = JSON.parse(userData);
          setKorisnik(user);
          
          // Check if current song is liked
          if (pjesma?.id && user.id) {
            const response = await axios.get(`${API_BASE}/korisnik_pjesma/`);
            const likedSongs = response.data || [];
            const isLiked = likedSongs.some((item: any) => 
              item.korisnikID === user.id && item.pjesmaID === pjesma.id
            );
            setLiked(isLiked);
          }
        }
      } catch (error) {
        console.error('Error loading user data or checking like status:', error);
      }
    };

    loadUserAndCheckLike();
  }, [pjesma?.id]);

  // Load playlists
  useEffect(() => {
    if (korisnik?.id) {
      axios.get(`${API_BASE}/playliste/`)
        .then(res => setPlaylists(res.data || []))
        .catch(() => setPlaylists([]));
    }
  }, [korisnik?.id]);

  // Load song data and check if it's liked
  useEffect(() => {
    if (!src) {
      setPjesma(null);
      setLiked(false);
      return;
    }

    axios.get(`${API_BASE}/pjesme/`)
      .then(res => {
        const p = (res.data as Pjesma[]).find((p) => p.putanjaAudio === src);
        setPjesma(p || null);
        
        // Check if song is liked by current user
        if (p && korisnik?.id) {
          axios.get(`${API_BASE}/korisnik_pjesma/`)
            .then(r => {
              const veze = r.data as { korisnikID: string; pjesmaID: number }[];
              setLiked(!!veze.find(v => v.korisnikID === korisnik.id && v.pjesmaID === p.id));
            })
            .catch(() => setLiked(false));
        } else {
          setLiked(false);
        }
      })
      .catch(() => {
        setPjesma(null);
        setLiked(false);
      });
  }, [src, korisnik?.id]);

  // Add to listening history
  useEffect(() => {
    if (!pjesma || !korisnik?.id || !src) return;
    
    const addToHistorija = async () => {
      try {
        // API će automatski obrisati postojeći zapis i dodati novi
        await axios.post(`${API_BASE}/historija/`, {
          korisnikID: korisnik.id,
          pjesmaID: pjesma.id,
          playlistaID: null,
          kreiranDatumVrijeme: new Date().toISOString(),
          trajanje: pjesma.trajanjeSekunde || 0,
          kontekstPustanjaURL: null,
          offline: false,
          kontekstPustanja: null,
        });
      } catch (error) {
        console.error('Error adding to history:', error);
      }
    };
    
    addToHistorija();
  }, [pjesma, pjesma?.id, korisnik?.id, src]);

  // Add statistics after 30 seconds of listening
  useEffect(() => {
    if (!pjesma || !korisnik?.id || !playing || !src) {
      setStatistikaSent(false);
      return;
    }
    if (progress < 30 || statistikaSent) return;

    const sendStatistika = async () => {
      try {
        // Statistics
        await axios.post(`${API_BASE}/statistika/`, {
          korisnikID: korisnik.id,
          pjesmaID: pjesma.id,
          brojReprodukcija: 1,
          ukupnoTrajanje: pjesma.trajanjeSekunde || 0,
          zadnjePustanje: new Date().toISOString(),
        }).catch(() => {});

        // Increase play count on song
        await axios.put(`${API_BASE}/pjesme/${pjesma.id}`, {
          ...pjesma,
          brojReprodukcija: (pjesma.brojReprodukcija || 0) + 1,
        }).catch(() => {});
      } catch (error) {
        console.error('Failed to send statistics:', error);
      }
      setStatistikaSent(true);
    };

    sendStatistika();
  }, [progress, pjesma, korisnik?.id, statistikaSent, src, playing]);

  // Reset statistics when song changes
  useEffect(() => {
    setStatistikaSent(false);
  }, [src]);

  // Load current owner
  useEffect(() => {
    if (currentSong?.korisnikID) {
      axios.get(`${API_BASE}/korisnici/${currentSong.korisnikID}`)
        .then(res => setCurrentOwner(res.data))
        .catch(() => setCurrentOwner(null));
    }
  }, [currentSong?.korisnikID]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add handler to close dropdown when touching outside
  const handleOutsidePress = () => {
    if (showSpeedModal) {
      setShowSpeedModal(false);
    }
  };

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
          {/* Repeat One */}
          <TouchableOpacity 
            onPress={handleRepeatToggle}
            disabled={!isLoaded || isLoading}
            style={styles.controlIcon}
          >
            <MaterialIcons 
              name="repeat-one" 
              size={20} 
              color={repeatOne ? "#b91d95" : (!isLoaded || isLoading) ? "#666" : "#ffe6ec"} 
            />
          </TouchableOpacity>

          {/* Repeat All */}
          <TouchableOpacity 
            onPress={handleRepeatAllToggle}
            disabled={!isLoaded || isLoading}
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
};

export default AudioPlayer;


