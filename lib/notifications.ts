import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { profilesApi } from "./api/profilesApi";

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  // Android 8.0+(API 26+)은 알림 채널이 없으면 푸시가 동작하지 않음
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "기본 알림",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1A6DFF",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing === "granted"
    ? { status: existing }
    : await Notifications.requestPermissionsAsync();

  if (status !== "granted") return;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await profilesApi.upsert({ id: userId, push_token: token });
  } catch (e) {
    console.warn("[Push] 토큰 등록 실패 (무료 계정 또는 시뮬레이터):", e);
  }
}
