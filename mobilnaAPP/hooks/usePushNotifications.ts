import { useState, useEffect, useRef, useCallback } from "react";

import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import type * as ExpoNotificationsTypes from "expo-notifications";

export interface PushNotificationState {
  notification?: ExpoNotificationsTypes.Notification | null;
  expoPushToken?: ExpoNotificationsTypes.ExpoPushToken | null;
  presentNowPlayingNotification: (info: NowPlayingInfo) => Promise<string | undefined>;
  updateNowPlayingNotification: (info: NowPlayingInfo) => Promise<void>;
  dismissNowPlayingNotification: () => Promise<void>;
}

export type NowPlayingInfo = {
  id?: number | string;
  title: string;
  artist?: string;
  artworkUrl?: string;
  isPlaying?: boolean;
};

export type UsePushNotificationsOptions = {
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onLike?: () => void;
};

export const usePushNotifications = (
  opts?: UsePushNotificationsOptions
): PushNotificationState => {
  const [notification, setNotification] = useState<ExpoNotificationsTypes.Notification | null>(null);
  const expoPushToken = null;

  const notificationListener = useRef<ExpoNotificationsTypes.Subscription | null>(null);
  const responseListener = useRef<ExpoNotificationsTypes.Subscription | null>(null);
  const nowPlayingNotificationIdRef = useRef<string | null>(null);

  const disabled = Constants.appOwnership === 'expo';
  const notificationsModuleRef = useRef<null | typeof import('expo-notifications')>(null);

  const getNotificationsModule = useCallback(async () => {
    if (disabled) return null;
    if (!notificationsModuleRef.current) {
      notificationsModuleRef.current = await import('expo-notifications');
    }
    return notificationsModuleRef.current;
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    (async () => {
      const N = await getNotificationsModule();
      if (!N) return;
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    })();
  }, [disabled, getNotificationsModule]);

  const ensurePermissionsAsync = useCallback(async () => {
    try {
      if (disabled) return true;
      if (!Device.isDevice) return true;
      const N = await getNotificationsModule();
      if (!N) return false;
      const { status: existingStatus } = await N.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await N.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === "granted";
    } catch {
      return false;
    }
  }, [disabled, getNotificationsModule]);

  const setupAndroidChannelAsync = useCallback(async () => {
    if (disabled) return;
    if (Platform.OS === "android") {
      const N = await getNotificationsModule();
      if (!N) return;
      await N.setNotificationChannelAsync("now-playing", {
        name: "Now Playing",
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#80137e7c",
        sound: undefined,
        showBadge: false,
        lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
      });
    }
  }, [disabled, getNotificationsModule]);

  const setupCategoriesAsync = useCallback(async () => {
    if (disabled) return;
    try {
      const N = await getNotificationsModule();
      if (!N) return;
      await N.setNotificationCategoryAsync("now-playing", [
        { identifier: "PREV", buttonTitle: "◄◄", options: { opensAppToForeground: false } },
        { identifier: "PLAY_PAUSE", buttonTitle: "Play/Pause", options: { opensAppToForeground: false } },
        { identifier: "NEXT", buttonTitle: "►►", options: { opensAppToForeground: false } },
        { identifier: "LIKE", buttonTitle: "❤", options: { opensAppToForeground: false } },
      ]);
    } catch {
      // ignore on unsupported environments
    }
  }, [disabled, getNotificationsModule]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (disabled) return;
      const granted = await ensurePermissionsAsync();
      if (!granted) return;
      await setupAndroidChannelAsync();
      await setupCategoriesAsync();

      const N = await getNotificationsModule();
      if (!N) return;

      notificationListener.current = N.addNotificationReceivedListener((n) => {
        if (!mounted) return;
        setNotification(n);
      });

      responseListener.current = N.addNotificationResponseReceivedListener((response) => {
        const actionId = response.actionIdentifier;
        if (!actionId) return;

        switch (actionId) {
          case "PLAY_PAUSE":
            opts?.onPlayPause?.();
            break;
          case "NEXT":
            opts?.onNext?.();
            break;
          case "PREV":
            opts?.onPrev?.();
            break;
          case "LIKE":
            opts?.onLike?.();
            break;
          default:
            break;
        }
      });
    })();

    return () => {
      mounted = false;
      (async () => {
        const N = await getNotificationsModule();
        if (!N) return;
        if (notificationListener.current) {
          N.removeNotificationSubscription(notificationListener.current);
          notificationListener.current = null;
        }
        if (responseListener.current) {
          N.removeNotificationSubscription(responseListener.current);
          responseListener.current = null;
        }
      })();
    };
  }, [opts, disabled, ensurePermissionsAsync, setupAndroidChannelAsync, setupCategoriesAsync, getNotificationsModule]);

  const presentNowPlayingNotification = async (info: NowPlayingInfo) => {
    if (disabled) return undefined;
    const granted = await ensurePermissionsAsync();
    if (!granted) return undefined;

    const N = await getNotificationsModule();
    if (!N) return undefined;

    if (nowPlayingNotificationIdRef.current) {
      try { await N.dismissNotificationAsync(nowPlayingNotificationIdRef.current); } catch {}
      nowPlayingNotificationIdRef.current = null;
    }

    try {
      const identifier = await N.scheduleNotificationAsync({
        content: {
          title: info.title,
          subtitle: info.artist || undefined,
          body: info.isPlaying ? "Playing" : "Paused",
          data: { songId: info.id ?? null, isPlaying: !!info.isPlaying },
          categoryIdentifier: "now-playing",
          sound: undefined,
        },
        trigger: null,
      });

      nowPlayingNotificationIdRef.current = identifier;
      return identifier;
    } catch {
      return undefined;
    }
  };

  const updateNowPlayingNotification = async (info: NowPlayingInfo) => {
    if (disabled) return;
    await presentNowPlayingNotification(info);
  };

  const dismissNowPlayingNotification = async () => {
    if (disabled) return;
    const N = await getNotificationsModule();
    if (!N) return;
    if (nowPlayingNotificationIdRef.current) {
      try { await N.dismissNotificationAsync(nowPlayingNotificationIdRef.current); } catch {}
      nowPlayingNotificationIdRef.current = null;
    }
  };

  return { notification, expoPushToken, presentNowPlayingNotification, updateNowPlayingNotification, dismissNowPlayingNotification };
};
