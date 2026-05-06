import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { profilesApi } from "./api/profilesApi";

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing === "granted"
    ? { status: existing }
    : await Notifications.requestPermissionsAsync();

  if (status !== "granted") return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await profilesApi.upsert({ id: userId, push_token: token });
  } catch (e) {
    console.warn("[Push] 토큰 등록 실패 (무료 계정 또는 시뮬레이터):", e);
  }
}
