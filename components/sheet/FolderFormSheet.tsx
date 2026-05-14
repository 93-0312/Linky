import React, { forwardRef, useCallback, useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useUpdateFolder, useCreateFolder } from "../../lib/api/useFoldersMutation";
import { useAppTheme } from "../../lib/theme";
import type { Category } from "../../types";

const PRESET_EMOJIS = [
  "📁", "🎥", "✍️", "📸", "🎙️", "📚", "💡", "🌟",
  "🔥", "🎯", "💰", "🎨", "🏆", "📱", "🌈", "🚀",
];

const PRESET_COLORS = [
  "#1A6DFF", "#6366F1", "#8B5CF6", "#EC4899",
  "#EF4444", "#F59E0B", "#10B981", "#06B6D4",
];

interface Props {
  onClose?: () => void;
  editingFolder?: Category | null;
}

export type FolderFormSheetRef = BottomSheet;

export const FolderFormSheet = forwardRef<FolderFormSheetRef, Props>(
  ({ onClose, editingFolder }, ref) => {
    const { colors } = useAppTheme();
    const createFolder = useCreateFolder();
    const updateFolder = useUpdateFolder();

    const [name, setName] = useState("");
    const [selectedEmoji, setSelectedEmoji] = useState("📁");
    const [selectedColor, setSelectedColor] = useState("#1A6DFF");

    const isEditing = !!editingFolder;

    useEffect(() => {
      if (editingFolder) {
        setName(editingFolder.name);
        setSelectedEmoji(editingFolder.icon);
        setSelectedColor(editingFolder.color);
      } else {
        setName("");
        setSelectedEmoji("📁");
        setSelectedColor("#1A6DFF");
      }
    }, [editingFolder?.id]);

    const canSave = name.trim().length > 0;

    const reset = () => {
      setName("");
      setSelectedEmoji("📁");
      setSelectedColor("#1A6DFF");
    };

    const handleSave = useCallback(() => {
      if (!canSave) return;

      if (isEditing && editingFolder) {
        updateFolder.mutate({
          id: editingFolder.id,
          patch: { name: name.trim(), icon: selectedEmoji, color: selectedColor },
        });
      } else {
        createFolder.mutate({ name: name.trim(), icon: selectedEmoji, color: selectedColor });
      }

      reset();
      (ref as React.RefObject<BottomSheet>)?.current?.close();
      onClose?.();
    }, [name, selectedEmoji, selectedColor, canSave, isEditing, editingFolder]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["65%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 36, height: 4 }}
        keyboardBehavior={Platform.OS === "ios" ? "extend" : "interactive"}
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onChange={(index) => { if (index === -1) onClose?.(); }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 20,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: "700",
                letterSpacing: -0.4,
              }}
            >
              {isEditing ? "폴더 수정" : "새 폴더"}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              style={{
                backgroundColor: canSave ? colors.primary : colors.surfaceElevated,
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: canSave ? "#FFFFFF" : colors.textTertiary,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {isEditing ? "수정 완료" : "만들기"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 20 }}>
            {/* Preview */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: colors.surfaceElevated,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: selectedColor + "25",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>{selectedEmoji}</Text>
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: name ? colors.text : colors.textTertiary,
                }}
              >
                {name || "폴더 이름"}
              </Text>
            </View>

            {/* Name input */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                폴더 이름
              </Text>
              <BottomSheetTextInput
                value={name}
                onChangeText={setName}
                placeholder="예: 유튜브 브이로그"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                style={{
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: colors.text,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: name ? colors.primary : colors.border,
                }}
              />
            </View>

            {/* Emoji picker */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                아이콘
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {PRESET_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => setSelectedEmoji(emoji)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor:
                        selectedEmoji === emoji ? colors.primarySoft : colors.surfaceElevated,
                      borderWidth: selectedEmoji === emoji ? 1.5 : 0,
                      borderColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color picker */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                색상
              </Text>
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: color,
                      borderWidth: selectedColor === color ? 3 : 2,
                      borderColor: selectedColor === color ? "#FFFFFF" : "transparent",
                      shadowColor: color,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: selectedColor === color ? 0.5 : 0,
                      shadowRadius: 4,
                      elevation: selectedColor === color ? 4 : 0,
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

FolderFormSheet.displayName = "FolderFormSheet";
