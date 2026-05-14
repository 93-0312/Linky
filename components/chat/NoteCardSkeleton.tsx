import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { useAppTheme } from "../../lib/theme";

export const NoteCardSkeleton: React.FC = () => {
  const { colors } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const bar = colors.border;

  return (
    <Animated.View style={{ opacity, marginBottom: 16, marginLeft: 16, marginRight: 8 }}>
      <View
        style={{
          backgroundColor: colors.noteBg,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: colors.noteBorder,
          padding: 16,
          gap: 10,
        }}
      >
        {/* 제목 */}
        <View style={{ gap: 6 }}>
          <View style={{ height: 16, width: "72%", backgroundColor: bar, borderRadius: 6 }} />
          <View style={{ height: 16, width: "50%", backgroundColor: bar, borderRadius: 6 }} />
        </View>

        {/* 본문 */}
        <View style={{ gap: 5 }}>
          <View style={{ height: 12, width: "100%", backgroundColor: bar, borderRadius: 4 }} />
          <View style={{ height: 12, width: "88%", backgroundColor: bar, borderRadius: 4 }} />
          <View style={{ height: 12, width: "76%", backgroundColor: bar, borderRadius: 4 }} />
        </View>

        {/* 태그 필 */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View style={{ height: 24, width: 64, backgroundColor: colors.primarySoft, borderRadius: 12 }} />
          <View style={{ height: 24, width: 52, backgroundColor: colors.primarySoft, borderRadius: 12 }} />
          <View style={{ height: 24, width: 44, backgroundColor: colors.primarySoft, borderRadius: 12 }} />
        </View>

        {/* 폴더 푸터 */}
        <View style={{ height: 11, width: "55%", backgroundColor: bar, borderRadius: 4 }} />
      </View>

      {/* 타임스탬프 */}
      <View
        style={{
          height: 11,
          width: 38,
          backgroundColor: bar,
          borderRadius: 4,
          alignSelf: "flex-end",
          marginTop: 4,
        }}
      />
    </Animated.View>
  );
};
