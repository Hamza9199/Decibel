import { router } from "expo-router";
import { useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BackPressOptions {
  from?: string;
  defaultRoute?: string;
  currentRoute?: string;
}

const NAVIGATION_HISTORY_KEY = 'navigation_history';
const MAX_HISTORY_SIZE = 10;
const INVALID_DYNAMIC_BASE_ROUTES = new Set([
  '/pjesma',
  '/pjesme',
  '/album',
  '/artist',
  '/playlista',
  '/izvodjac',
  '/nova-pretplata',
  '/uredi-pjesmu',
  '/uredi-album',
  '/uredi-playlistu',
  '/omiljeno',
]);

export const ROUTE_MAPPING: { [key: string]: string } = {
  '(tabs)': '(tabs)/home',
  '(tabs)/library': '(tabs)/library',
  '(tabs)/search': '(tabs)/search',
  'pjesma/[pjesmaId]': 'pjesma/[pjesmaId]',
  'album/[albumId]': 'album/[albumId]',
  'playlista/[playlistaId]': 'playlista/[playlistaId]',
  'izvodjac/[izvodjacId]': 'izvodjac/[izvodjacId]',
  'history': 'history',
  'statistika': 'statistika',
  'edit-profile': 'edit-profile',
  'settings': 'settings',
  'pretplata': 'pretplata',
  'admin-panel': 'admin-panel',
  'offline': 'offline',
  'svi-korisnici': 'svi-korisnici',
  'svi-albumi': 'svi-albumi',
  'sve-playliste': 'sve-playliste',
  'nova-pjesma': 'nova-pjesma',
  'novi-album': 'novi-album',
  'nova-playlista': 'nova-playlista',
  'nova-pretplata/[pretplataId]': 'nova-pretplata/[pretplataId]',
  'uredi-pjesmu/[pjesmaId]': 'uredi-pjesmu/[pjesmaId]',
  'uredi-album/[albumId]': 'uredi-album/[albumId]',
  'uredi-playlistu/[playlistaId]': 'uredi-playlistu/[playlistaId]',
  'omiljeno/[tip]': 'omiljeno/[tip]',
  'svepjesme': 'svepjesme',
  'login': 'login',
  'register': 'register',
  'zahtjevi': 'zahtjevi',
  'terms': 'terms',
  'privacypolicy': 'privacypolicy',
};

export const getRoutePathFromSource = (source?: string): string | undefined => {
  if (!source || source === 'undefined') return undefined;

  const cleanSource = source.split(/[?#]/)[0].replace(/^\/+/, '');
  if (!cleanSource || cleanSource === 'undefined') return undefined;
  if (cleanSource === 'home' || cleanSource === '(tabs)/home') return '/(tabs)';
  if (cleanSource === 'library') return '/(tabs)/library';
  if (cleanSource === 'search') return '/(tabs)/search';

  const route = Object.entries(ROUTE_MAPPING).find(([, value]) => value === cleanSource)?.[0];
  return `/${route || cleanSource}`;
};

const isInvalidHistoryRoute = (route?: string): boolean => (
  !route ||
  route === '/undefined' ||
  route.includes('[') ||
  INVALID_DYNAMIC_BASE_ROUTES.has(route)
);

const isConcreteRoute = (route?: string): boolean => {
  if (!route) return false;
  if (route.includes('[') || route.includes(']')) return false;
  if (route.startsWith('//')) return false;
  if (route === '/pjesma' || route === '/album' || route === '/playlista' || route === '/izvodjac' || route === '/pjesme' || route === '/artist') return false;
  if (route === '/(tabs)' || route === '/(tabs)/home' || route === '/(tabs)/library' || route === '/(tabs)/search') return true;
  if (/^\/(pjesma|album|playlista|izvodjac|nova-pretplata|uredi-pjesmu|uredi-album|uredi-playlistu)\/[^/]+$/.test(route)) return true;
  if (/^\/(history|statistika|edit-profile|settings|pretplata|admin-panel|offline|svi-korisnici|svi-albumi|sve-playliste|nova-pjesma|novi-album|nova-playlista|svepjesme|login|register|zahtjevi|terms|privacypolicy)$/.test(route)) return true;
  return false;
};

const normalizeHistoryRoute = (route?: string): string | undefined => {
  const normalizedRoute = getRoutePathFromSource(route);
  return isInvalidHistoryRoute(normalizedRoute) || !isConcreteRoute(normalizedRoute) ? undefined : normalizedRoute;
};

const getNavigationHistory = async (): Promise<string[]> => {
  try {
    const history = await AsyncStorage.getItem(NAVIGATION_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

const saveNavigationHistory = async (history: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(NAVIGATION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save navigation history:', error);
  }
};

export const addToNavigationHistory = async (route: string): Promise<void> => {
  const normalizedRoute = normalizeHistoryRoute(route);
  if (!normalizedRoute) return;

  const history = await getNavigationHistory();
  
  const filteredHistory = history.filter(r => r !== normalizedRoute);
  
  const newHistory = [normalizedRoute, ...filteredHistory].slice(0, MAX_HISTORY_SIZE);
  
  await saveNavigationHistory(newHistory);
};

export const removeFromNavigationHistory = async (route: string): Promise<void> => {
  const normalizedRoute = normalizeHistoryRoute(route);
  const routePath = getRoutePathFromSource(route);

  const history = await getNavigationHistory();
  const filteredHistory = history.filter(r => r !== normalizedRoute && r !== routePath);
  await saveNavigationHistory(filteredHistory);
};

const getPreviousRoute = async (currentRoute?: string): Promise<string | null> => {
  const history = await getNavigationHistory();
  const normalizedCurrentRoute = normalizeHistoryRoute(currentRoute);
  console.log('Navigation history:', history);
  console.log('Current route:', normalizedCurrentRoute);
  
  let availableHistory = history;
  if (normalizedCurrentRoute) {
    availableHistory = history.filter(r => r !== normalizedCurrentRoute);
  }
  
  console.log('Available history after filtering:', availableHistory);
  
  const result = availableHistory.find(route => !isInvalidHistoryRoute(getRoutePathFromSource(route))) || null;
  console.log('Previous route result:', result);
  
  return result;
};

const popInvalidHistoryRoute = async (route?: string): Promise<void> => {
  if (!route) return;
  await removeFromNavigationHistory(route);
};

export const navigateWithHistory = async (newRoute: string, currentRoute?: string) => {
  if (currentRoute) {
    await addToNavigationHistory(currentRoute);
    console.log('Added to history:', currentRoute);
    console.log('Current navigation history:', await getNavigationHistory());
  }
  console.log('Navigating to:', newRoute);
  router.replace(newRoute);
};

export const clearNavigationHistory = async (): Promise<void> => {
  await saveNavigationHistory([]);
};

export const useBackPress = ({ from, defaultRoute = "/", currentRoute }: BackPressOptions = {}) => {
  const handleBackPress = useCallback(async () => {
    if (currentRoute) await removeFromNavigationHistory(currentRoute);

    let previousRoute = await getPreviousRoute(currentRoute);
    while (previousRoute) {
      const safePreviousRoute = normalizeHistoryRoute(previousRoute);
      if (safePreviousRoute) {
        router.replace(safePreviousRoute);
        return;
      }
      await popInvalidHistoryRoute(previousRoute);
      previousRoute = await getPreviousRoute(currentRoute);
    }
    
    const routeFromSource = getRoutePathFromSource(from);
    if (routeFromSource) {
      router.replace(routeFromSource);
      return;
    }

    if (defaultRoute) {
      router.replace(defaultRoute || '/(tabs)');
    } else {
      router.replace('/(tabs)');
    }
  }, [from, defaultRoute, currentRoute]);

  return handleBackPress;
};
