import { create } from "zustand";
import { profilesApi } from "../lib/api/profilesApi";

export type WhipLevel = "light" | "normal" | "hard";
export type InputMode = "idea" | "note";

interface SettingsState {
  userName: string;
  platforms: string[];
  notificationEnabled: boolean;
  notificationTime: string;
  whipLevel: WhipLevel;
  inputMode: InputMode;
  initialized: boolean;
  initializeFromDB: (userId: string, fallbackName?: string) => Promise<void>;
  setUserName: (name: string, userId?: string) => void;
  setPlatforms: (platforms: string[], userId?: string) => void;
  setNotificationEnabled: (enabled: boolean, userId?: string) => void;
  setNotificationTime: (time: string, userId?: string) => void;
  setWhipLevel: (level: WhipLevel, userId?: string) => void;
  setInputMode: (mode: InputMode, userId?: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  userName: "크리에이터",
  platforms: ["유튜브"],
  notificationEnabled: true,
  notificationTime: "09:00",
  whipLevel: "normal",
  inputMode: "idea",
  initialized: false,

  initializeFromDB: async (userId, fallbackName) => {
    const profile = await profilesApi.get(userId);
    if (profile) {
      set({
        userName: profile.user_name,
        platforms: profile.platforms,
        notificationEnabled: profile.notification_enabled,
        notificationTime: profile.notification_time,
        whipLevel: profile.whip_level as WhipLevel,
        inputMode: (profile.input_mode ?? "idea") as InputMode,
        initialized: true,
      });
    } else {
      const userName = fallbackName ?? "크리에이터";
      set({ userName, initialized: true });
      await profilesApi.upsert({
        id: userId,
        user_name: userName,
        platforms: get().platforms,
        whip_level: get().whipLevel,
        notification_enabled: get().notificationEnabled,
        notification_time: get().notificationTime,
        input_mode: get().inputMode,
      });
    }
  },

  setUserName: (userName, userId) => {
    set({ userName });
    if (userId) profilesApi.upsert({ id: userId, user_name: userName });
  },

  setPlatforms: (platforms, userId) => {
    set({ platforms });
    if (userId) profilesApi.upsert({ id: userId, platforms });
  },

  setNotificationEnabled: (notificationEnabled, userId) => {
    set({ notificationEnabled });
    if (userId) profilesApi.upsert({ id: userId, notification_enabled: notificationEnabled });
  },

  setNotificationTime: (notificationTime, userId) => {
    set({ notificationTime });
    if (userId) profilesApi.upsert({ id: userId, notification_time: notificationTime });
  },

  setWhipLevel: (whipLevel, userId) => {
    set({ whipLevel });
    if (userId) profilesApi.upsert({ id: userId, whip_level: whipLevel });
  },

  setInputMode: (inputMode, userId) => {
    set({ inputMode });
    if (userId) profilesApi.upsert({ id: userId, input_mode: inputMode });
  },
}));
