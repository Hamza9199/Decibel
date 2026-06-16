import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Alert, ScrollView, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Slider } from '@miblanchard/react-native-slider';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useAudio } from '@/context/AudioContext';
import { Image } from 'expo-image';
import { styles } from './AudioPlayer.styles';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { API_BASE } from '@/config/api';
import { queryClient } from '@/config/queryClient';
import { Korisnik, Playlista, Pjesma } from '@/types';

interface AudioPlayerNewProps {
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
  globalPlaylist?: number[];
  playlistIdx?: number;
  playlistRepeat?: boolean;
}

const RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const MarqueeText = ({ children, style }: { children: React.ReactNode, style?: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    animatedValue.stopAnimation();
    animatedValue.setValue(0);
    if (textWidth > containerWidth && containerWidth > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(animatedValue, {
            toValue: -textWidth,
            duration: (textWidth / 30) * 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: containerWidth,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [textWidth, containerWidth, animatedValue, children]);

  return (
    <View style={{ overflow: 'hidden', width: '100%' }} onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
      <Animated.Text
        numberOfLines={1}
        onLayout={e => setTextWidth(e.nativeEvent.layout.width)}
        style={[style, { transform: [{ translateX: animatedValue }] }]}
      >
        {children}
      </Animated.Text>
    </View>
  );
};

const AudioPlayerNew: React.FC<AudioPlayerNewProps> = ({ id, src: propSrc, title: propTitle, putanjaGif: propGif, putanjaSlika: propSlika, korisnikID: propKorisnikID, visible, minimized, onClose, onExpand }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 65;
  const audioCtx = useAudio();
  const contextState = audioCtx.audioState;
  const playlistIdx = contextState.playlistIdx ?? -1;
  const globalPlaylist = React.useMemo(() => contextState.globalPlaylist ?? [], [contextState.globalPlaylist]);
  const playlistRepeat = contextState.playlistRepeat ?? false;
  const effectiveSrc = propSrc ?? contextState.src;
  const effectiveTitle = propTitle ?? contextState.title;
  const effectiveSlika = propSlika ?? contextState.putanjaSlika;
  const effectiveGif = propGif ?? contextState.putanjaGif; // reserved
  const effectiveKorisnikID = propKorisnikID ?? contextState.korisnikID;

  const { data: korisnik } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const data = await AsyncStorage.getItem('korisnik'); return data ? JSON.parse(data) : null; },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  }) as { data: Korisnik | null };

  const { data: allSongs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => { const r = await axios.get(`${API_BASE}/pjesme/`); return r.data as Pjesma[]; },
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const currentSong: Pjesma | null = useMemo(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0 && playlistIdx < globalPlaylist.length) return globalPlaylist[playlistIdx];
    if (effectiveSrc) {
      if (id) {
        return {
          id,
          naziv: effectiveTitle || 'Unknown Song',
          putanjaAudio: effectiveSrc,
          putanjaGif: effectiveGif,
          putanjaSlika: effectiveSlika,
          korisnikID: effectiveKorisnikID,
        } as Pjesma;
      }
      return allSongs.find((p: Pjesma) => p.putanjaAudio === effectiveSrc) || null;
    }
    return null;
  }, [globalPlaylist, playlistIdx, allSongs, effectiveSrc, id, effectiveTitle, effectiveGif, effectiveSlika, effectiveKorisnikID]);



  const { data: playlists = [] } = useQuery({
    queryKey: ['playlists', korisnik?.id],
    queryFn: async () => { if (!korisnik?.id) return []; const r = await axios.get(`${API_BASE}/playliste/`); return r.data || []; },
    enabled: !!korisnik?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: currentOwner } = useQuery({
    queryKey: ['user', currentSong?.korisnikID],
    queryFn: async () => { if (!currentSong?.korisnikID) return null; const r = await axios.get(`${API_BASE}/korisnici/${currentSong.korisnikID}`); return r.data as Korisnik; },
    enabled: !!currentSong?.korisnikID,
    staleTime: 5 * 60 * 1000,
  });

  const { data: izvodjaci = [] } = useQuery({
    queryKey: ['izvodjaci', currentSong?.id],
    queryFn: async () => {
      if (!currentSong?.id) return [];
      const res = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
      const veze = res.data.filter((v: any) => v.pjesmaID === currentSong.id);
      const korisnici = await Promise.all(
        veze.map((v: any) =>
          axios.get(`${API_BASE}/korisnici/${v.izvodjacID}`).then(r => r.data).catch(() => null)
        )
      );
      return korisnici.filter(Boolean) as Korisnik[];
    },
    enabled: !!currentSong?.id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!currentSong || !korisnik?.id) return;
      await axios.post(`${API_BASE}/korisnik_pjesma/`, {
        korisnikID: korisnik.id,
        pjesmaID: currentSong.id,
        kreiranDatumVrijeme: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setLiked(true);
      queryClient.invalidateQueries({
        queryKey: ["korisnik_pjesma_liked", korisnik?.id, currentSong?.id],
      });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      if (!currentSong || !korisnik?.id) return;
      await axios.delete(
        `${API_BASE}/korisnik_pjesma/${korisnik.id}/${currentSong.id}`
      );
    },
    onSuccess: () => {
      setLiked(false);
      queryClient.invalidateQueries({
        queryKey: ["korisnik_pjesma_liked", korisnik?.id, currentSong?.id],
      });
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async (playlistaID: number) => {
      if (!currentSong?.id) throw new Error("No song");
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID: currentSong.id,
        playlistaID,
      });
    },
    onSuccess: () => {
      setShowPlaylistModal(false);
      Alert.alert(t('success'), t('song_added_to_playlist') || 'Pjesma dodana u playlistu!');
    },
    onError: (error: unknown) => {
      const detail =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      Alert.alert(t('error'), detail || t('error_adding_to_playlist') || 'Greška pri dodavanju pjesme u playlistu.');
      setShowPlaylistModal(false);
    },
  });

  const addToHistoryMutation = useMutation({
    mutationFn: async ({ korisnikID, pjesmaID }: { korisnikID: string; pjesmaID: number }) => { await axios.delete(`${API_BASE}/historija/obrisi/${korisnikID}/${pjesmaID}`).catch(() => { }); return axios.post(`${API_BASE}/historija/`, { korisnikID, pjesmaID, playlistaID: null, kreiranDatumVrijeme: new Date().toISOString(), trajanje: currentSong?.trajanjeSekunde || 0, kontekstPustanjaURL: null, offline: false, kontekstPustanja: null }); }
  });

  const statistikaMutation = useMutation({
    mutationFn: async ({ korisnikID, pjesmaID }: { korisnikID: string; pjesmaID: number }) => { await axios.post(`${API_BASE}/statistika/`, { korisnikID, pjesmaID, brojReprodukcija: 1, ukupnoTrajanje: currentSong?.trajanjeSekunde || 0, zadnjePustanje: new Date().toISOString() }).catch(() => { }); if (currentSong) await axios.put(`${API_BASE}/pjesme/${pjesmaID}`, { ...currentSong, brojReprodukcija: (currentSong.brojReprodukcija || 0) + 1 }).catch(() => { }); }
  });

  const player = useAudioPlayer(undefined);
  const status = useAudioPlayerStatus(player);

  const [repeatOne, setRepeatOne] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [pretplataValid, setPretplataValid] = useState<boolean | null>(null);
  const [showNoSubMsg, setShowNoSubMsg] = useState(true);
  const [statistikaSent, setStatistikaSent] = useState(false);

  const duration = status?.duration ?? 0;
  const progress = status?.currentTime ?? 0;
  const isLoaded = !!status?.isLoaded;
  const isBuffering = !!status?.isBuffering || (!status?.isLoaded && !!effectiveSrc);
  const playing = !!status?.playing;

  useEffect(() => { setPretplataValid(true); }, []);

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => { }); }, []);

  const lastLoadedSrcRef = useRef<string | null>(null);
  useEffect(() => {
    if (!effectiveSrc) return;
    if (lastLoadedSrcRef.current === effectiveSrc) return;
    lastLoadedSrcRef.current = effectiveSrc;
    try { player.replace({ uri: effectiveSrc }); player.play(); } catch { }
  }, [effectiveSrc, player]);

  const volumeRef = useRef(volume);
  useEffect(() => { if (!isLoaded) return; if (muted) { player.volume = 0; } else if (volumeRef.current !== volume) { volumeRef.current = volume; player.volume = volume; } }, [volume, muted, isLoaded, player]);

  useEffect(() => { if (!isLoaded) return; player.muted = muted; if (!muted) player.volume = volume; }, [muted, isLoaded, volume, player]);

  useEffect(() => { player.loop = repeatOne; }, [repeatOne, player]);

  const rateRef = useRef(playbackRate);
  useEffect(() => { if (!isLoaded) return; if (rateRef.current !== playbackRate) { rateRef.current = playbackRate; try { player.setPlaybackRate(playbackRate); } catch { } } }, [playbackRate, isLoaded, player]);

  useEffect(() => { if (!isSeeking) setSeekValue(progress); }, [progress, isSeeking]);

  useEffect(() => { 
    if (status?.didJustFinish) { 
      if (repeatOne) { 
        player.seekTo(0).then(() => player.play()); 
      } else if (globalPlaylist.length > 0 && playlistIdx >= 0) { 
        const nextIdx = playlistIdx + 1; 
        if (nextIdx < globalPlaylist.length) {
          audioCtx.setPlaylistIdx(nextIdx); 
        } else if (playlistRepeat) {
          audioCtx.setPlaylistIdx(0); 
        } else {
          audioCtx.setGlobalPlaylist([]);
          audioCtx.setPlaylistIdx(-1);
        }
      } 
    } 
  }, [status?.didJustFinish, repeatOne, playlistIdx, globalPlaylist.length, playlistRepeat, audioCtx, player]);

  useEffect(() => {
    if (korisnik?.id && currentSong?.id) {
      axios
        .get(`${API_BASE}/korisnik_pjesma/${korisnik.id}/${currentSong.id}`)
        .then((res) => {
          setLiked(res.data.liked);
        })
        .catch(() => {
          setLiked(false);
        });
    } else {
      setLiked(false);
    }
  }, [currentSong?.id, currentSong?.korisnikID, korisnik?.id]);

  const historyRef = useRef<{ korisnikID: string; pjesmaID: number } | null>(null);
  useEffect(() => { if (!currentSong?.id || !korisnik?.id) return; const params = { korisnikID: korisnik.id, pjesmaID: currentSong.id }; if (!historyRef.current || historyRef.current.pjesmaID !== params.pjesmaID) { historyRef.current = params; addToHistoryMutation.mutate(params); setStatistikaSent(false); } }, [currentSong?.id, korisnik?.id, addToHistoryMutation]);

  const statistikaRef = useRef<{ pjesmaID: number; korisnikID: string; sent: boolean } | null>(null);
  useEffect(() => { if (!currentSong?.id || !korisnik?.id || !playing) return; if (progress < 30 || statistikaSent) return; const params = { korisnikID: korisnik.id, pjesmaID: currentSong.id, sent: true }; if (!statistikaRef.current || statistikaRef.current.pjesmaID !== params.pjesmaID || !statistikaRef.current.sent) { statistikaRef.current = params; statistikaMutation.mutate({ korisnikID: params.korisnikID, pjesmaID: params.pjesmaID }); setStatistikaSent(true); } }, [progress, statistikaSent, playing, currentSong?.id, korisnik?.id, statistikaMutation]);
  useEffect(() => { setStatistikaSent(false); if (statistikaRef.current) statistikaRef.current.sent = false; }, [effectiveSrc]);





  const handlePlayPause = useCallback(() => {
    if (!isLoaded || isBuffering) return;
    if (playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [playing, isLoaded, isBuffering, player]);

  const handleSeekStart = useCallback(() => setIsSeeking(true), []);
  const handleSeekChange = useCallback((v: number | number[]) => setSeekValue(Array.isArray(v) ? v[0] : v), []);
  const handleSeekComplete = useCallback((v: number | number[]) => { const val = Array.isArray(v) ? v[0] : v; player.seekTo(val).finally(() => setIsSeeking(false)); }, [player]);

  const handleVolumeSeekStart = useCallback(() => { }, []);
  const handleVolumeSeekChange = useCallback((v: number | number[]) => {
    const val = Array.isArray(v) ? v[0] : v;
    setVolume(val);
  }, []);
  const handleVolumeSeekComplete = useCallback((v: number | number[]) => {
    const val = Array.isArray(v) ? v[0] : v;
    setVolume(val);
    if (isLoaded) {
      player.volume = val;
      if (muted && val > 0) {
        setMuted(false);
        player.muted = false;
      }
    }
  }, [isLoaded, muted, player]);

  const handleRateChange = useCallback((r: number) => { setPlaybackRate(r); try { player.setPlaybackRate(r); } catch { } }, [player]);
  const handleMuteToggle = useCallback(() => { setMuted(m => { player.muted = !m; if (!m) player.volume = 0; else player.volume = volume; return !m; }); }, [player, volume]);
  const handleRepeatToggle = useCallback(() => { setRepeatOne(r => { const n = !r; player.loop = n; if (n) audioCtx.setPlaylistRepeat(false); return n; }); }, [player, audioCtx]);
  const handleRepeatAllToggle = useCallback(() => { audioCtx.setPlaylistRepeat(!playlistRepeat); if (repeatOne) { setRepeatOne(false); player.loop = false; } }, [audioCtx, playlistRepeat, repeatOne, player]);

  const goPrev = useCallback(() => { if (progress > 5) { player.seekTo(0); return; } if (globalPlaylist.length > 0 && playlistIdx >= 0) { const prevIdx = playlistIdx - 1; if (prevIdx >= 0) audioCtx.setPlaylistIdx(prevIdx); else if (playlistRepeat) audioCtx.setPlaylistIdx(globalPlaylist.length - 1); } }, [progress, globalPlaylist, playlistIdx, playlistRepeat, audioCtx, player]);
  const goNext = useCallback(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0) {
      const nextIdx = playlistIdx + 1;
      if (nextIdx < globalPlaylist.length) audioCtx.setPlaylistIdx(nextIdx); else if (playlistRepeat) audioCtx.setPlaylistIdx(0);
    }
  }, [globalPlaylist, playlistIdx, playlistRepeat, audioCtx]);

  useEffect(() => {
    if (currentSong && isLoaded) {
      const artistNames = currentOwner?.korisnicko_ime || t('unknown_user');
      const songTitle = currentSong.naziv || effectiveTitle || t('no_current_song');
      const artwork = currentSong.putanjaSlika || effectiveSlika || '';

      try {
        // @ts-ignore: updateLockScreenMetadata added per request
        if (typeof (player as any).updateLockScreenMetadata === 'function') {
          (player as any).updateLockScreenMetadata({
            title: songTitle,
            artist: artistNames,
            artworkUrl: artwork,
          });
        } else if (typeof (player as any).setActiveForLockScreen === 'function') {
          // @ts-ignore
          (player as any).setActiveForLockScreen(true, {
            title: songTitle,
            artist: artistNames,
            artworkUrl: artwork,
          });
        }
      } catch (e) {
        console.warn('Lock screen error', e);
      }

      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: songTitle,
          artist: artistNames,
          artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/jpeg' }] : []
        });
        navigator.mediaSession.setActionHandler('play', () => { player.play(); });
        navigator.mediaSession.setActionHandler('pause', () => { player.pause(); });
        navigator.mediaSession.setActionHandler('previoustrack', () => { goPrev(); });
        navigator.mediaSession.setActionHandler('nexttrack', () => { goNext(); });
      }
    }
  }, [currentSong, currentOwner, effectiveTitle, effectiveSlika, isLoaded, player, t, goPrev, goNext]);

  const handleLike = useCallback(async () => {
    if (!currentSong?.id || !korisnik?.id) return;
    if (liked) {
      setLiked(false);
      unlikeMutation.mutate();
    } else {
      setLiked(true);
      likeMutation.mutate();
    }
  }, [currentSong?.id, korisnik?.id, liked, unlikeMutation, likeMutation]);

  const handleAddToPlaylist = useCallback((playlistaID: number) => {
    if (!effectiveSrc || !currentSong?.id) return;
    addToPlaylistMutation.mutate(playlistaID);
  }, [effectiveSrc, currentSong?.id, addToPlaylistMutation]);

  const handleClosePress = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const ensureDir = useCallback(async (p: string) => { const i = p.lastIndexOf('/'); if (i === -1) return; const dir = p.slice(0, i + 1); const info = await FileSystem.getInfoAsync(dir); if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); }, []);
  const safeFileName = useCallback((r: string) => r.split('/').pop()?.replace(/[^a-zA-Z0-9_.-]/g, '_') || `f_${Date.now()}`, []);
  const handleDownload = useCallback(async () => { if (!currentSong?.putanjaAudio) return; try { const base = FileSystem.documentDirectory; if (!base) return; const dir = base + 'offline_songs/'; await ensureDir(dir + 'x'); const audioLocal = dir + safeFileName(currentSong.putanjaAudio); await FileSystem.downloadAsync(currentSong.putanjaAudio, audioLocal); let imageLocal = ''; if (currentSong.putanjaSlika) { imageLocal = dir + safeFileName(currentSong.putanjaSlika); await FileSystem.downloadAsync(currentSong.putanjaSlika, imageLocal); } const offlineSong = { id: currentSong.id, naziv: currentSong.naziv, izvođač: currentOwner?.korisnicko_ime || '', putanjaAudio: audioLocal, putanjaSlika: imageLocal }; const existing = await AsyncStorage.getItem('offline_pjesme'); const list = existing ? JSON.parse(existing) : []; if (!list.find((s: any) => s.id === currentSong.id)) { list.push(offlineSong); await AsyncStorage.setItem('offline_pjesme', JSON.stringify(list)); Alert.alert(t('success'), t('song_downloaded_offline') || 'Downloaded'); } else { Alert.alert(t('info'), t('song_already_downloaded') || 'Already downloaded'); } } catch { Alert.alert(t('error'), t('error_downloading_song') || 'Error'); } }, [currentSong, currentOwner?.korisnicko_ime, ensureDir, safeFileName, t]);

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

  const speedOptions = useMemo(() => RATE_OPTIONS, []);

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
            onPress={() => { }}
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
      <TouchableOpacity style={[styles.miniPlayer, { bottom: tabBarHeight + insets.bottom }]} onPress={onExpand}>
        <Image
          source={{ uri: currentSong?.putanjaSlika || '../../assets/images/icon.png' }}
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
      <TouchableOpacity style={styles.closeBtn} onPress={handleClosePress}>
        <MaterialIcons name="close" size={20} color="#ffe6ec" />
      </TouchableOpacity>

      <View style={styles.topRow}>
        <Image
          source={{ uri: currentSong?.putanjaSlika || '../../assets/images/icon.png' }}
          style={styles.audioLogo}
        />

        <View style={styles.audioMeta}>
          <View style={styles.audioDetails}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {izvodjaci.length > 0 ? (
                  izvodjaci.map((izv: Korisnik, idx: number) => (
                    <TouchableOpacity key={izv.id} onPress={() => { handleClosePress(); router.push(`/izvodjac/${izv.id}?from=player`); }} activeOpacity={0.7}>
                      <Text style={styles.audioArtist}>
                        {izv.korisnicko_ime}{idx < izvodjaci.length - 1 ? ' & ' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity onPress={() => { if (currentOwner?.id) { handleClosePress(); router.push(`/izvodjac/${currentOwner.id}?from=player`); } }} activeOpacity={0.7}>
                    <Text style={styles.audioArtist}>
                      {currentOwner?.korisnicko_ime || t('unknown_user')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            <TouchableOpacity onPress={() => { if (currentSong?.id) { handleClosePress(); router.push(`/pjesma/${currentSong.id}?from=player`); } }} activeOpacity={0.7} style={{ width: '100%', flex: 1, paddingRight: 10 }}>
              <MarqueeText style={styles.audioTitle}>
                {currentSong?.naziv || t('no_current_song')}
              </MarqueeText>
            </TouchableOpacity>
          </View>
          <Text style={styles.audioTime}>
            {formatTime(isSeeking ? seekValue : progress)} / {formatTime(duration)}
          </Text>
          {isBuffering && (
            <Text style={styles.loadingText}>
              {t('loading')}...
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleLike}
          disabled={!isLoaded || isBuffering || !korisnik?.id || likeMutation.isPending}
          style={styles.likeButton}
        >
          <MaterialIcons
            name={liked ? 'favorite' : 'favorite-border'}
            size={20}
            color={liked ? "#e91e63" : (!isLoaded || isBuffering || !korisnik?.id) ? "#666" : "#ffe6ec"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDownload}
          disabled={!isLoaded || isBuffering}
          style={[styles.likeButton, { left: 180, backgroundColor: '#e754a2' }]}
        >
          <MaterialIcons name="download" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlBtn, (!isLoaded || isBuffering) && styles.controlBtnDisabled]}
          onPress={handlePlayPause}
          disabled={!isLoaded || isBuffering}
        >
          <MaterialIcons
            name={playing ? 'pause' : 'play-arrow'}
            size={20}
            color={(!isLoaded || isBuffering) ? "#666" : "#fff"}
          />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Slider
            value={isSeeking ? seekValue : progress}
            minimumValue={0}
            maximumValue={duration || 1}
            onSlidingStart={handleSeekStart}
            onValueChange={handleSeekChange}
            onSlidingComplete={handleSeekComplete}
            disabled={!isLoaded || isBuffering}
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
            disabled={!isLoaded || isBuffering}
            style={styles.controlIcon}
          >
            <MaterialIcons
              name={muted ? 'volume-off' : 'volume-up'}
              size={20}
              color={(!isLoaded || isBuffering) ? "#666" : "#ffe6ec"}
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
              disabled={!isLoaded || isBuffering}
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
              color={repeatOne ? "#b91d95" : (!isLoaded || isBuffering) ? "#666" : "#ffe6ec"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRepeatAllToggle}
            style={styles.controlIcon}
          >
            <MaterialIcons
              name="repeat"
              size={20}
              color={playlistRepeat ? "#b91d95" : (!isLoaded || isBuffering) ? "#666" : "#ffe6ec"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowPlaylistModal(true)}
            disabled={!isLoaded || isBuffering}
            style={styles.controlIcon}
          >
            <MaterialIcons
              name="playlist-add"
              size={20}
              color={(!isLoaded || isBuffering) ? "#666" : "#ffe6ec"}
            />
          </TouchableOpacity>

          <View style={styles.speedContainer}>
            <TouchableOpacity
              onPress={() => setShowSpeedModal(prev => !prev)}
              disabled={!isLoaded || isBuffering}
              style={styles.speedSelector}
            >
              <Text style={[
                styles.speedText,
                (!isLoaded || isBuffering) && styles.speedTextDisabled
              ]}>
                {playbackRate}x
              </Text>
              <MaterialIcons
                name="expand-more"
                size={16}
                color={(!isLoaded || isBuffering) ? "#666" : "#ffe6ec"}
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
};

AudioPlayerNew.displayName = 'AudioPlayerNew';

export default React.memo(AudioPlayerNew);
