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
  const history = await getNavigationHistory();
  
  const filteredHistory = history.filter(r => r !== route);
  
  const newHistory = [route, ...filteredHistory].slice(0, MAX_HISTORY_SIZE);
  
  await saveNavigationHistory(newHistory);
};

export const removeFromNavigationHistory = async (route: string): Promise<void> => {
  const history = await getNavigationHistory();
  const filteredHistory = history.filter(r => r !== route);
  await saveNavigationHistory(filteredHistory);
};

const getPreviousRoute = async (currentRoute?: string): Promise<string | null> => {
  const history = await getNavigationHistory();
  console.log('Navigation history:', history);
  console.log('Current route:', currentRoute);
  
  let availableHistory = history;
  if (currentRoute) {
    availableHistory = history.filter(r => r !== currentRoute);
  }
  
  console.log('Available history after filtering:', availableHistory);
  
  const result = availableHistory.length > 0 ? availableHistory[0] : null;
  console.log('Previous route result:', result);
  
  return result;
};

export const navigateWithHistory = async (newRoute: string, currentRoute?: string) => {
  if (currentRoute) {
    await addToNavigationHistory(currentRoute);
    console.log('Added to history:', currentRoute);
  }
  console.log('Navigating to:', newRoute);
  router.replace(newRoute);
};

export const clearNavigationHistory = async (): Promise<void> => {
  await saveNavigationHistory([]);
};

export const useBackPress = ({ from, defaultRoute = "/", currentRoute }: BackPressOptions = {}) => {
  const handleBackPress = useCallback(async () => {
    const previousRoute = await getPreviousRoute(currentRoute);
    
    console.log('Back press - Current route:', currentRoute, 'Previous route:', previousRoute, 'From:', from);
    
    if (previousRoute) {
      if (currentRoute) {
        await removeFromNavigationHistory(currentRoute);
      }
      
      if (previousRoute === 'undefined' || !previousRoute) {
        router.replace('/(tabs)');
      } else {
        router.replace(previousRoute);
      }
      return;
    }
    
    switch (from) {
      case 'home':
        router.replace('/(tabs)');
        break;
      case 'library':
        router.replace('/(tabs)/library');
        break;
      case 'search':
        router.replace('/(tabs)/search');
        break;
      case 'profile':
        router.replace('/edit-profile');
        break;
      case 'playlista':
        router.replace('/playlista');
        break;
      case 'album':
        router.replace('/album');
        break;
      case 'izvodjac':
        router.replace('/izvodjac');
        break;
      case 'settings':
        router.replace('/settings');
        break;
      case 'admin-panel':
        router.replace('/admin-panel');
        break;
      case 'edit-profile':
        router.replace('/edit-profile');
        break;
      case 'history':
        router.replace('/history');
        break;
      case 'offline':
        router.replace('/offline');
        break;
      case 'pretplata':
        router.replace('/pretplata');
        break;
      case 'statistika':
        router.replace('/statistika');
        break;
      case 'svi-korisnici':
        router.replace('/svi-korisnici');
        break;
      case 'svi-albumi':
        router.replace('/svi-albumi');
        break;
      case 'sve-playliste':
        router.replace('/sve-playliste');
        break;
      case 'nova-pjesma':
      case 'add-song':
        router.replace('/nova-pjesma');
        break;
      case 'novi-album':
        router.replace('/novi-album');
        break;
      case 'nova-playlista':
        router.replace('/nova-playlista');
        break;
      case 'nova-pretplata':
        router.replace('/nova-pretplata');
        break;
      case 'uredi-pjesmu':
        router.replace('/uredi-pjesmu');
        break;
      case 'uredi-album':
        router.replace('/uredi-album');
        break;
      case 'uredi-playlistu':
        router.replace('/uredi-playlistu');
        break;
      case 'omiljeno':
        router.replace('/omiljeno');
        break;
      case 'login':
        router.replace('/login');
        break;
      case 'register':
        router.replace('/register');
        break;
      case 'svepjesme':
      case 'pjesme':
        router.replace('/(tabs)');
        break;
      default:
        if (defaultRoute) {
          router.replace(defaultRoute);
        } else {
          router.back();
        }
        break;
    }
  }, [from, defaultRoute, currentRoute]);

  return handleBackPress;
};