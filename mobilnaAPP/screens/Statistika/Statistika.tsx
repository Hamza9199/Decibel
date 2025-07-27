import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Header from '@/komponente/Header/Header';
import Tabs from '@/komponente/Tabs/Tabs';
import { Statistika, Pjesma, Album, Playlista, Korisnik } from '@/types';
import { API_BASE } from '@/config/api';
import { styles } from './Statistika.styles';

const StatistikaScreen: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [korisnici, setKorisnici] = useState<Korisnik[]>([]);
  const [statistika, setStatistika] = useState<Statistika[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [pjesmeData, albumiData, playlisteData, korisniciData, statistikaData] = await Promise.all([
        axios.get(`${API_BASE}/pjesme/`).then((res) => res.data).catch(() => []),
        axios.get(`${API_BASE}/albumi/`).then((res) => res.data).catch(() => []),
        axios.get(`${API_BASE}/playliste/`).then((res) => res.data).catch(() => []),
        axios.get(`${API_BASE}/korisnici/`).then((res) => res.data).catch(() => []),
        axios.get(`${API_BASE}/statistika/`).then((res) => res.data).catch(() => []),
      ]);

      setPjesme(pjesmeData);
      setAlbumi(albumiData);
      setPlayliste(playlisteData);
      setKorisnici(korisniciData);
      setStatistika(statistikaData);
    } catch (error) {
      console.error('Error loading statistics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load data when component mounts
  useMemo(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Memoize calculated data
  const topPjesme = useMemo(() => {
    return [...pjesme]
      .filter(p => typeof p.brojLajkova === 'number')
      .sort((a, b) => (b.brojLajkova ?? 0) - (a.brojLajkova ?? 0))
      .slice(0, 10);
  }, [pjesme]);

  const topAlbumi = useMemo(() => {
    return [...albumi]
      .filter(a => typeof a.brojLajkova === 'number')
      .sort((a, b) => (b.brojLajkova ?? 0) - (a.brojLajkova ?? 0))
      .slice(0, 10);
  }, [albumi]);

  const topPlayliste = useMemo(() => {
    return [...playliste]
      .filter(pl => typeof pl.brojLajkova === 'number')
      .sort((a, b) => (b.brojLajkova ?? 0) - (a.brojLajkova ?? 0))
      .slice(0, 10);
  }, [playliste]);

  const topIzvodjaci = useMemo(() => {
    return [...korisnici]
      .filter(k => k.rola === 'izvodac' || k.rola === 'admin')
      .sort((a, b) => (b.brojPratilaca || 0) - (a.brojPratilaca || 0))
      .slice(0, 10);
  }, [korisnici]);

  const najpoznatijiIzvodjac = useMemo(() => {
    return korisnici
      .filter(k => k.rola === 'izvodac' || k.rola === 'admin')
      .reduce((max, k) => 
        (k.brojPratilaca || 0) > (max?.brojPratilaca || 0) ? k : max, 
        korisnici.find(k => k.rola === 'izvodac' || k.rola === 'admin')
      );
  }, [korisnici]);

  const songsbyGenre = useMemo(() => {
    const zanrovi = ['pop', 'rock', 'hip_hop', 'jazz', 'electronic', 'klasicna', 'metal', 'alternativni', 'rap'];
    const maxCount = Math.max(...zanrovi.map(z => 
      pjesme.filter(p => (p.zanr || '').toLowerCase() === z).length
    ));
    
    return zanrovi.map(zanr => {
      const count = pjesme.filter(p => (p.zanr || '').toLowerCase() === zanr).length;
      return {
        genre: zanr,
        count,
        percentage: maxCount > 0 ? (count / maxCount) * 100 : 0,
      };
    }).filter(item => item.count > 0);
  }, [pjesme]);

  const topSlusane = useMemo(() => {
    if (statistika.length > 0) {
      return statistika
        .map((s: Statistika) => ({
          pjesma: s.pjesma || pjesme.find((p) => p.id === s.pjesmaID),
          brojReprodukcija: s.brojReprodukcija || 0,
        }))
        .filter((s): s is { pjesma: Pjesma; brojReprodukcija: number } => !!s.pjesma)
        .sort((a, b) => (b.brojReprodukcija || 0) - (a.brojReprodukcija || 0))
        .slice(0, 10);
    } else {
      return [...pjesme]
        .filter((p) => typeof p.brojReprodukcija === 'number')
        .sort((a, b) => (b.brojReprodukcija ?? 0) - (a.brojReprodukcija ?? 0))
        .slice(0, 10)
        .map((p) => ({ pjesma: p, brojReprodukcija: p.brojReprodukcija || 0 }));
    }
  }, [pjesme, statistika]);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91d95" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('platform_statistics') || 'Platform Statistics'}</Text>

          {/* Most Popular Artist */}
          {najpoznatijiIzvodjac && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>{t('most_popular_artist') || 'Most Popular Artist'}</Text>
              <View style={styles.artistCard}>
                <Image
                  source={{ 
                    uri: najpoznatijiIzvodjac.putanjaProfilneSlike || 'https://via.placeholder.com/150' 
                  }}
                  style={styles.artistImage}
                  contentFit="cover"
                />
                <View style={styles.artistInfo}>
                  <Text style={styles.artistName}>{najpoznatijiIzvodjac.korisnicko_ime}</Text>
                  <Text style={styles.artistFollowers}>
                    {t('followers') || 'Followers'}: {najpoznatijiIzvodjac.brojPratilaca || 0}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Top Songs by Likes */}
          <Text style={styles.sectionTitle}>{t('top_10_songs_likes') || 'Top 10 Songs (Likes)'}</Text>
          <View style={styles.chartCard}>
            {topPjesme.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              topPjesme.map((pjesma, index) => (
                <View key={pjesma.id} style={styles.listItem}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    {index + 1}. {pjesma.naziv}
                  </Text>
                  <Text style={styles.listItemValue}>{pjesma.brojLajkova || 0}</Text>
                </View>
              ))
            )}
          </View>

          {/* Top Albums by Likes */}
          <Text style={styles.sectionTitle}>{t('top_10_albums_likes') || 'Top 10 Albums (Likes)'}</Text>
          <View style={styles.chartCard}>
            {topAlbumi.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              topAlbumi.map((album, index) => (
                <View key={album.id} style={styles.listItem}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    {index + 1}. {album.naziv}
                  </Text>
                  <Text style={styles.listItemValue}>{album.brojLajkova || 0}</Text>
                </View>
              ))
            )}
          </View>

          {/* Top Playlists by Likes */}
          <Text style={styles.sectionTitle}>{t('top_10_playlists_likes') || 'Top 10 Playlists (Likes)'}</Text>
          <View style={styles.chartCard}>
            {topPlayliste.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              topPlayliste.map((playlist, index) => (
                <View key={playlist.id} style={styles.listItem}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    {index + 1}. {playlist.naziv}
                  </Text>
                  <Text style={styles.listItemValue}>{playlist.brojLajkova || 0}</Text>
                </View>
              ))
            )}
          </View>

          {/* Top Artists by Followers */}
          <Text style={styles.sectionTitle}>{t('top_10_artists_followers') || 'Top 10 Artists (Followers)'}</Text>
          <View style={styles.chartCard}>
            {topIzvodjaci.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              topIzvodjaci.map((artist, index) => (
                <View key={artist.id} style={styles.listItem}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    {index + 1}. {artist.korisnicko_ime}
                  </Text>
                  <Text style={styles.listItemValue}>{artist.brojPratilaca || 0}</Text>
                </View>
              ))
            )}
          </View>

          {/* Songs by Genre */}
          <Text style={styles.sectionTitle}>{t('songs_by_genre') || 'Songs by Genre'}</Text>
          <View style={styles.chartCard}>
            {songsbyGenre.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              songsbyGenre.map((item, index) => (
                <View key={index} style={styles.genreItem}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.genreTitle}>{item.genre.replace('_', ' ')}</Text>
                      <Text style={styles.genreCount}>{item.count}</Text>
                    </View>
                    <View style={styles.genreBar} />
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Top Played Songs */}
          <Text style={styles.sectionTitle}>{t('top_10_most_played_songs') || 'Top 10 Most Played Songs'}</Text>
          <View style={styles.chartCard}>
            {topSlusane.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              topSlusane.map((item, index) => (
                <View key={item.pjesma?.id || index} style={styles.listItem}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    {index + 1}. {item.pjesma?.naziv || 'Unknown'}
                  </Text>
                  <Text style={styles.listItemValue}>{item.brojReprodukcija}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Tabs currentRoute="statistics" />
    </View>
  );
});

StatistikaScreen.displayName = "StatistikaScreen";

export default StatistikaScreen;
