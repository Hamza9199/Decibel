import React, { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { CartesianChart, Bar } from 'victory-native';
import Tabs from '@/komponente/Tabs/Tabs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Statistika, Pjesma, Album, Playlista, Korisnik } from '@/types';
import { API_BASE } from '@/config/api';
import { styles as darkStyles } from './Statistika.styles';
import { styles as lightStyles } from './StatistikaWhite.styles';
import { queryClient } from '@/config/queryClient';
import { useScreenCleanup } from '@/hooks/useScreenCleanup';
import { navigateWithHistory, useBackPress } from '@/hooks/handleBackPress';
import { router, useLocalSearchParams } from 'expo-router';
import Back from '@/komponente/Back/Back';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 70;

const StatistikaScreen: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const styles = theme === 'light' ? lightStyles : darkStyles;

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('decibel_tema');
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTheme(); }, [loadTheme]);
  useEffect(() => {
    const interval = setInterval(loadTheme, 3000);
    return () => clearInterval(interval);
  }, [loadTheme]);


  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBackPress = useBackPress({ from, defaultRoute: '/statistika', currentRoute: '/statistika' });


  const statisticsQuery = useQuery({
    queryKey: ['statistics'],
    queryFn: async () => {
      const [pjesmeData, albumiData, playlisteData, korisniciData, statistikaData] = await Promise.all([
        axios.get(`${API_BASE}/pjesme/`).then((res) => res.data).catch(() => []),
        axios.get(`${API_BASE}/albumi/`).then((res) => res.data).catch(() => []),
        axios.get(`${API_BASE}/playliste/`).then((res) => res.data).catch(() => []),
        axios.get(`${API_BASE}/korisnici/`).then((res) => res.data).catch(() => []),
        axios.get(`${API_BASE}/statistika/`).then((res) => res.data).catch(() => []),
      ]);

      return {
        pjesme: pjesmeData,
        albumi: albumiData,
        playliste: playlisteData,
        korisnici: korisniciData,
        statistika: statistikaData,
      };
    },
    staleTime: 10 * 60 * 1000, 
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['statistics'] }).finally(() => {
      setRefreshing(false);
    });
  }, []);

  const pjesme = useMemo(() => statisticsQuery.data?.pjesme || [], [statisticsQuery.data?.pjesme]);
  const albumi = useMemo(() => statisticsQuery.data?.albumi || [], [statisticsQuery.data?.albumi]);
  const playliste = useMemo(() => statisticsQuery.data?.playliste || [], [statisticsQuery.data?.playliste]);
  const korisnici = useMemo(() => statisticsQuery.data?.korisnici || [], [statisticsQuery.data?.korisnici]);
  const statistika = useMemo(() => statisticsQuery.data?.statistika || [], [statisticsQuery.data?.statistika]);

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
      .filter((k: Korisnik) => k.rola === 'izvodac' || k.rola === 'admin')
      .sort((a, b) => (b.brojPratilaca || 0) - (a.brojPratilaca || 0))
      .slice(0, 10);
  }, [korisnici]);

  const najpoznatijiIzvodjac = useMemo(() => {
    return korisnici
      .filter((k: Korisnik) => k.rola === 'izvodac' || k.rola === 'admin')
      .reduce((max: Korisnik | undefined, k: Korisnik) => 
        (k.brojPratilaca || 0) > (max?.brojPratilaca || 0) ? k : max, 
        korisnici.find((k: Korisnik) => k.rola === 'izvodac' || k.rola === 'admin')
      );
  }, [korisnici]);

  const songsbyGenre = useMemo(() => {
    const zanrovi = ['pop', 'rock', 'hip_hop', 'jazz', 'electronic', 'klasicna', 'metal', 'alternativni', 'rap'];
    const maxCount = Math.max(...zanrovi.map(z => 
      pjesme.filter((p: Pjesma) => (p.zanr || '').toLowerCase() === z).length
    ));
    
    return zanrovi.map(zanr => {
      const count = pjesme.filter((p: Pjesma) => (p.zanr || '').toLowerCase() === zanr).length;
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
          pjesma: s.pjesma || pjesme.find((p: Pjesma) => p.id === s.pjesmaID),
          brojReprodukcija: s.brojReprodukcija || 0,
        }))
        .filter((s: { pjesma: Pjesma | undefined; brojReprodukcija: number }) : s is { pjesma: Pjesma; brojReprodukcija: number } => !!s.pjesma)
        .sort((a: { pjesma: Pjesma; brojReprodukcija: number }, b: { pjesma: Pjesma; brojReprodukcija: number }) => (b.brojReprodukcija || 0) - (a.brojReprodukcija || 0))
        .slice(0, 10);
    } else {
      return [...pjesme]
        .filter((p) => typeof p.brojReprodukcija === 'number')
        .sort((a, b) => (b.brojReprodukcija ?? 0) - (a.brojReprodukcija ?? 0))
        .slice(0, 10)
        .map((p) => ({ pjesma: p, brojReprodukcija: p.brojReprodukcija || 0 }));
    }
  }, [pjesme, statistika]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#b91d95"
    />
  ), [refreshing, onRefresh]);

  const loading = statisticsQuery.isLoading;

   useScreenCleanup();

  type ChartData = { x: string; y: number; index: number };

  

  const topSongsChartData: ChartData[] = useMemo(() => {
    return topPjesme.slice(0, 10).map((pjesma, index) => ({
      x: pjesma.naziv.length > 10 ? `${pjesma.naziv.substring(0, 10)}...` : pjesma.naziv,
      y: pjesma.brojLajkova || 0,
      index,
    }));
  }, [topPjesme]);

  const topAlbumsChartData: ChartData[] = useMemo(() => {
    return topAlbumi.slice(0, 10).map((album, index) => ({
      x: album.naziv.length > 10 ? `${album.naziv.substring(0, 10)}...` : album.naziv,
      y: album.brojLajkova || 0,
      index,
    }));
  }, [topAlbumi]);

  const topPlaylistsChartData: ChartData[] = useMemo(() => {
    return topPlayliste.slice(0, 10).map((playlista, index) => ({
      x: playlista.naziv.length > 10 ? `${playlista.naziv.substring(0, 10)}...` : playlista.naziv,
      y: playlista.brojLajkova || 0,
      index,
    }));
  }, [topPlayliste]);

  const topArtistsChartData: ChartData[] = useMemo(() => {
    return topIzvodjaci.slice(0, 10).map((artist, index) => ({
      x: artist.korisnicko_ime.length > 10 ? `${artist.korisnicko_ime.substring(0, 10)}...` : artist.korisnicko_ime,
      y: artist.brojPratilaca || 0,
      index,
    }));
  }, [topIzvodjaci]);

  const topPlayedChartData: ChartData[] = useMemo(() => {
    return topSlusane.slice(0, 10).map(
      (item: { pjesma: Pjesma; brojReprodukcija: number }, index: number) => ({
        x: item.pjesma.naziv.length > 10 ? `${item.pjesma.naziv.substring(0, 10)}...` : item.pjesma.naziv,
        y: item.brojReprodukcija,
        index,
      })
    );
  }, [topSlusane]);

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
      <Back
        title={t('platform_statistics') || 'Platform Statistics'}
        onBackPress={handleBackPress}
        onProfilePress={() =>   navigateWithHistory('/profile?from=statistika', '/statistika')}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('platform_statistics') || 'Platform Statistics'}</Text>

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

          <Text style={styles.sectionTitle}>{t('top_10_songs_likes') || 'Top 10 Songs (Likes)'}</Text>
          <View style={styles.chartCard}>
            {topSongsChartData.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              <>
                <View style={{ height: 350, width: chartWidth }}>
                  <CartesianChart
                    data={topSongsChartData}
                    xKey="x"
                    yKeys={["y"]}
                    domainPadding={{ left: 30, right: 30, top: 30, bottom: 60 }}
                  >
                    {({ points, chartBounds }) => (
                      <Bar
                        points={points["y"]}
                        chartBounds={chartBounds}
                        color="#b91d95"
                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                      />
                    )}
                  </CartesianChart>
                </View>
                <View style={styles.chartLabelContainer}>
                  <View style={styles.chartLabelRow}>
                    {topPjesme.slice(0, 10).map((pjesma, index) => (
                      <View key={pjesma.id} style={styles.chartLabelItem}>
                        <Text style={styles.chartLabelText} numberOfLines={2}>
                          {index + 1}. {pjesma.naziv}
                        </Text>
                        <Text style={styles.chartLabelValue}>{pjesma.brojLajkova || 0} likes</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>{t('top_10_albums_likes') || 'Top 10 Albums (Likes)'}</Text>
          <View style={styles.chartCard}>
            {topAlbumsChartData.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              <>
                <View style={{ height: 350, width: chartWidth }}>
                  <CartesianChart
                    data={topAlbumsChartData}
                    xKey="x"
                    yKeys={["y"]}
                    domainPadding={{ left: 30, right: 60, top: 30, bottom: 60 }}
                  >
                    {({ points, chartBounds }) => (
                      <Bar
                        points={points.y}
                        chartBounds={chartBounds}
                        color="#e91e63"
                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                      />
                    )}
                  </CartesianChart>
                </View>
                <View style={styles.chartLabelContainer}>
                  <View style={styles.chartLabelRow}>
                    {topAlbumi.slice(0, 10).map((album, index) => (
                      <View key={album.id} style={styles.chartLabelItem}>
                        <Text style={styles.chartLabelText} numberOfLines={2}>
                          {index + 1}. {album.naziv}
                        </Text>
                        <Text style={styles.chartLabelValue}>{album.brojLajkova || 0} likes</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>{t('top_10_playlists_likes') || 'Top 10 Playlists (Likes)'}</Text>
          <View style={styles.chartCard}>
            {topPlaylistsChartData.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              <>
                <View style={{ height: 350, width: chartWidth }}>
                  <CartesianChart
                    data={topPlaylistsChartData}
                    xKey="x"
                    yKeys={["y"]}
                    domainPadding={{ left: 30, right: 60, top: 30, bottom: 60 }}
                  >
                    {({ points, chartBounds }) => (
                      <Bar
                        points={points.y}
                        chartBounds={chartBounds}
                        color="#ff5722"
                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                      />
                    )}
                  </CartesianChart>
                </View>
                <View style={styles.chartLabelContainer}>
                  <View style={styles.chartLabelRow}>
                    {topPlayliste.slice(0, 10).map((playlista, index) => (
                      <View key={playlista.id} style={styles.chartLabelItem}>
                        <Text style={styles.chartLabelText} numberOfLines={2}>
                          {index + 1}. {playlista.naziv}
                        </Text>
                        <Text style={styles.chartLabelValue}>{playlista.brojLajkova || 0} likes</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>{t('top_10_artists_followers') || 'Top 10 Artists (Followers)'}</Text>
          <View style={styles.chartCard}>
            {topArtistsChartData.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              <>
                <View style={{ height: 350, width: chartWidth }}>
                  <CartesianChart
                    data={topArtistsChartData}
                    xKey="x"
                    yKeys={["y"]}
                    domainPadding={{ left: 30, right: 30, top: 30, bottom: 60 }}
                  >
                    {({ points, chartBounds }) => (
                      <Bar
                        points={points.y}
                        chartBounds={chartBounds}
                        color="#4caf50"
                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                      />
                    )}
                  </CartesianChart>
                </View>
                <View style={styles.chartLabelContainer}>
                  <View style={styles.chartLabelRow}>
                    {topIzvodjaci.slice(0, 10).map((artist, index) => (
                      <View key={artist.id} style={styles.chartLabelItem}>
                        <Text style={styles.chartLabelText} numberOfLines={2}>
                          {index + 1}. {artist.korisnicko_ime}
                        </Text>
                        <Text style={styles.chartLabelValue}>{artist.brojPratilaca || 0} followers</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>{t('songs_by_genre') || 'Songs by Genre'}</Text>
          <View style={styles.chartCard}>
            {songsbyGenre.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              <>
                <View style={styles.genreVisualContainer}>
                  {songsbyGenre.map((item, index) => {
                    const colors = ['#9c27b0', '#e91e63', '#ff5722', '#4caf50', '#2196f3', '#ff9800', '#795548', '#607d8b', '#f44336'];
                    const totalSongs = songsbyGenre.reduce((sum, genre) => sum + genre.count, 0);
                    const percentage = (item.count / totalSongs) * 100;
                    
                    return (
                      <View key={index} style={styles.genreBarContainer}>
                        <View style={styles.genreBarInfo}>
                          <Text style={styles.genreBarLabel}>
                            {item.genre.replace('_', ' ').toUpperCase()}
                          </Text>
                          <Text style={styles.genreBarValue}>
                            {item.count} ({percentage.toFixed(1)}%)
                          </Text>
                        </View>
                        <View style={styles.genreBarBackground}>
                          <View 
                            style={[
                              styles.genreBarFill,
                              { 
                                width: `${percentage}%`,
                                backgroundColor: colors[index % colors.length]
                              }
                            ]} 
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>{t('top_10_most_played_songs') || 'Top 10 Most Played Songs'}</Text>
          <View style={styles.chartCard}>
            {topPlayedChartData.length === 0 ? (
              <Text style={styles.noDataText}>{t('no_data') || 'No data available'}</Text>
            ) : (
              <>
                <View style={{ height: 350, width: chartWidth }}>
                  <CartesianChart
                    data={topPlayedChartData}
                    xKey="x"
                    yKeys={["y"]}
                    domainPadding={{ left: 10, right: 80, top: 30, bottom: 60 }}
                  >
                    {({ points, chartBounds }) => (
                      <Bar
                        points={points.y}
                        chartBounds={chartBounds}
                        color="#ff9800"
                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                      />
                    )}
                  </CartesianChart>
                </View>
                <View style={styles.chartLabelContainer}>
                  <View style={styles.chartLabelRow}>
                    {topSlusane.slice(0, 10).map((item: { pjesma: Pjesma; brojReprodukcija: number }, index: number) => (
                      <View key={item.pjesma?.id || index} style={styles.chartLabelItem}>
                        <Text style={styles.chartLabelText} numberOfLines={2}>
                          {index + 1}. {item.pjesma?.naziv || 'Unknown'}
                        </Text>
                        <Text style={styles.chartLabelValue}>{item.brojReprodukcija} plays</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
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