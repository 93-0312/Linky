import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  // edgeToEdgeEnabled 환경에서 Android 시스템 내비게이션 바 높이를 포함해 탭바 높이 계산
  const tabBarHeight = 54 + insets.bottom;
  const tabBarPaddingBottom = insets.bottom > 0 ? insets.bottom : 12;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          elevation: 0,
          shadowOpacity: 0,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "노트",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? "chatbubble" : "chatbubble-outline") as IoniconName}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: "탐색",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? "folder" : "folder-outline") as IoniconName}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "마이",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? "person" : "person-outline") as IoniconName}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
