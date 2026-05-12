import { create } from "zustand";
import { Platform } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { useChatStore } from "./useChatStore";
import { useCategoryStore } from "./useCategoryStore";

WebBrowser.maybeCompleteAuthSession();

let isBrowserOpen = false;

async function openAuthBrowser(url: string, redirectUrl: string) {
  if (isBrowserOpen) return null;
  isBrowserOpen = true;
  try {
    return await WebBrowser.openAuthSessionAsync(url, redirectUrl);
  } finally {
    isBrowserOpen = false;
  }
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;

  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, isLoading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signInWithGoogle: async () => {
    if (Platform.OS === "web") {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      return;
    }

    const redirectUrl = Linking.createURL("/");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) return;

    const result = await openAuthBrowser(data.url, redirectUrl);
    if (!result) return;

    if (result.type === "success" && result.url) {
      const fragment = result.url.split("#")[1] ?? "";
      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) console.warn("OAuth session error:", sessionError.message);
      } else {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (sessionError) console.warn("OAuth session error:", sessionError.message);
      }
    }
  },

  signInWithKakao: async () => {
    if (Platform.OS === "web") {
      await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          scopes: "profile_nickname profile_image",
          queryParams: { scope: "openid profile_nickname profile_image", prompt: "login" },
        },
      });
      return;
    }

    const redirectUrl = Linking.createURL("/");
    console.log("[Kakao] redirectUrl:", redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        scopes: "profile_nickname profile_image",
        queryParams: { scope: "openid profile_nickname profile_image", prompt: "login" },
      },
    });

    if (error || !data.url) { console.warn("[Kakao] OAuth error:", error); return; }

    const result = await openAuthBrowser(data.url, redirectUrl);
    if (!result) return;
    console.log("[Kakao] browser result:", result.type, "url" in result ? result.url : "");

    if (result.type === "success" && result.url) {
      const fragment = result.url.split("#")[1] ?? "";
      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) console.warn("[Kakao] session error:", sessionError.message);
      } else {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (sessionError) console.warn("[Kakao] session error:", sessionError.message);
      }
    }
  },

  deleteAccount: async () => {
    const session = await supabase.auth.getSession();
    const jwt = session.data.session?.access_token;
    if (!jwt) throw new Error("로그인 상태가 아닙니다.");

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
    const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "탈퇴 처리 중 오류가 발생했습니다.");
    }

    useChatStore.setState({
      messages: [],
      notes: [],
      initialized: false,
      pendingNoteId: null,
      drillDownResults: {},
      drillingDownKeys: [],
      generatingIds: [],
      isTyping: false,
      isRecording: false,
    });
    useCategoryStore.setState({ categories: [], initialized: false });
    set({ user: null, session: null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    useChatStore.setState({
      messages: [],
      notes: [],
      initialized: false,
      pendingNoteId: null,
      drillDownResults: {},
      drillingDownKeys: [],
      generatingIds: [],
      isTyping: false,
      isRecording: false,
    });
    useCategoryStore.setState({ categories: [], initialized: false });
    set({ user: null, session: null });
  },
}));
