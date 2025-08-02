import { router } from "expo-router";
import { useCallback } from "react";

interface BackPressOptions {
  from?: string;
  defaultRoute?: string;
}

export const useBackPress = ({ from, defaultRoute = "/" }: BackPressOptions = {}) => {
  const handleBackPress = useCallback(() => {
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
      // Dodaj za sve ostale stranice koje treba da idu nazad na home ili library
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
  }, [from, defaultRoute]);

  return handleBackPress;
};