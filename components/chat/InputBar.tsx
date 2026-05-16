import React, { FC, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useAppTheme } from "../../lib/theme";

export type InputMode = "idea" | "note";

interface Props {
  onOpen: () => void;
  onSend?: (text: string) => void;
  selectedCategoryId?: string | null;
  onCategoryChange?: (categoryId: string) => void;
  inputMode?: InputMode;
  onInputModeChange?: (mode: InputMode) => void;
}

export const InputBar: FC<Props> = ({
  onOpen,
  onSend,
  selectedCategoryId,
  onCategoryChange,
  inputMode = "idea",
  onInputModeChange,
}) => {
  const { colors } = useAppTheme();
  const { categories } = useCategoryStore();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [modePickerVisible, setModePickerVisible] = useState(false);

  const selectedFolder = categories.find((c) => c.id === selectedCategoryId);
  const folderName = selectedFolder?.name ?? "초안";
  const folderColor = selectedFolder?.color ?? colors.primary;

  const handleSend = () => {
    if (!text.trim()) return;
    onSend?.(text.trim());
    setText("");
  };

  const isNoteMode = inputMode === "note";

  return (
    <>
      <View
        style={{
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom, 12) : 12,
          paddingHorizontal: 16,
          gap: 8,
        }}
      >
        {/* 폴더 선택 + 입력 모드 버튼 */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            accessibilityRole="button"
            accessibilityLabel="폴더 변경"
          >
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>📁 폴더:</Text>
            <View
              style={{
                backgroundColor: folderColor + "18",
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 0.5,
                borderColor: folderColor + "50",
              }}
            >
              <Text style={{ fontSize: 12, color: folderColor, fontWeight: "600" }}>
                {folderName}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>변경</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setModePickerVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="입력 모드 변경"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: colors.surfaceElevated,
              borderRadius: 10,
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12 }}>{isNoteMode ? "📝" : "💬"}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>
              {isNoteMode ? "노트 모드" : "아이디어 모드"}
            </Text>
            <Ionicons name="chevron-down" size={11} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* 아이디어 모드: 텍스트 입력창 + 전송 */}
        {!isNoteMode && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surfaceElevated,
                borderRadius: 20,
                borderWidth: 0.5,
                borderColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: Platform.OS === "ios" ? 10 : 8,
              }}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="아이디어를 적어보세요..."
                placeholderTextColor={colors.textTertiary}
                style={{
                  color: colors.text,
                  fontSize: 14,
                  ...Platform.select({ ios: { padding: 0 } }),
                }}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                accessibilityLabel="아이디어 입력"
                testID="quick-input"
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              accessibilityRole="button"
              accessibilityLabel="전송"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 노트 모드: 탭하면 시트 오픈 */}
        {isNoteMode && (
          <TouchableOpacity
            onPress={onOpen}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="노트 작성하기"
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surfaceElevated,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.primary + "40",
              paddingHorizontal: 16,
              paddingVertical: Platform.OS === "ios" ? 11 : 9,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.textTertiary, flex: 1 }}>
              노트를 작성해보세요...
            </Text>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>+</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 폴더 선택 바텀시트 */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          {/* 백드롭 */}
          <Pressable
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
            onPress={() => setPickerVisible(false)}
          />

          {/* 시트 */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            {/* 핸들 */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            {/* 헤더 */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 16,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{ fontSize: 17, fontWeight: "700", color: colors.text, letterSpacing: -0.4 }}
              >
                폴더 선택
              </Text>
              <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>
                메모를 저장할 폴더를 선택해주세요
              </Text>
            </View>

            {/* 폴더 목록 */}
            <ScrollView
              style={{ marginHorizontal: 16, maxHeight: 380 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
            >
              {categories.map((c) => {
                const isSelected = c.id === selectedCategoryId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      onCategoryChange?.(c.id);
                      setPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: isSelected ? c.color + "15" : colors.surfaceElevated,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: isSelected ? 1 : 0.5,
                      borderColor: isSelected ? c.color : colors.border,
                    }}
                  >
                    {/* 아이콘 */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: c.color + "25",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{c.icon}</Text>
                    </View>

                    {/* 이름 */}
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: isSelected ? "700" : "500",
                        color: isSelected ? c.color : colors.text,
                        letterSpacing: -0.3,
                      }}
                    >
                      {c.name}
                    </Text>

                    {/* 선택 체크 */}
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={c.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 입력 모드 선택 팝업 */}
      <Modal
        visible={modePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModePickerVisible(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
            onPress={() => setModePickerVisible(false)}
          />
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 20,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, letterSpacing: -0.4 }}>
                입력 모드
              </Text>
              <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>
                기본 입력 방식을 선택해주세요
              </Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              {([
                { value: "idea" as InputMode, emoji: "💬", label: "아이디어 모드", desc: "한 줄 입력 → AI가 아이디어를 정리해줘요" },
                { value: "note" as InputMode, emoji: "📝", label: "노트 모드",     desc: "제목·내용·태그를 직접 작성해요" },
              ]).map((item) => {
                const isSelected = inputMode === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => {
                      onInputModeChange?.(item.value);
                      if (item.value === "note") onOpen();
                      setModePickerVisible(false);
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      backgroundColor: isSelected ? colors.primarySoft : colors.surfaceElevated,
                      borderRadius: 14,
                      padding: 16,
                      borderWidth: isSelected ? 1 : 0.5,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: isSelected ? "700" : "500", color: isSelected ? colors.primary : colors.text, letterSpacing: -0.3 }}>
                        {item.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
