import React, { forwardRef, useCallback, useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useSaveNote, useUpdateNote } from "../../lib/api/useNotesMutation";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useAppTheme } from "../../lib/theme";

export interface EditingNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  categoryId?: string | null;
}

interface Props {
  onClose?: () => void;
  onSaved?: (noteId: string) => void;
  editingNote?: EditingNote | null;
  defaultCategoryId?: string | null;
}

export type IdeaFormSheetRef = BottomSheet;

export const IdeaFormSheet = forwardRef<IdeaFormSheetRef, Props>(
  ({ onClose, onSaved, editingNote, defaultCategoryId }, ref) => {
    const { colors } = useAppTheme();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const saveNote = useSaveNote();
    const updateNote = useUpdateNote();
    const { categories } = useCategoryStore();

    const isEditing = !!editingNote;

    useEffect(() => {
      if (editingNote) {
        setTitle(editingNote.title);
        setContent(editingNote.content);
        setTags(editingNote.tags);
        setTagInput("");
        setSelectedCategoryId(editingNote.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? null);
      } else {
        setTitle("");
        setContent("");
        setTags([]);
        setTagInput("");
        setSelectedCategoryId(defaultCategoryId ?? categories[0]?.id ?? null);
      }
    }, [editingNote?.id, defaultCategoryId]);

    const handleTagInputChange = (text: string) => {
      if (text.endsWith(",") || text.endsWith(" ")) {
        const trimmed = text.slice(0, -1).trim();
        if (trimmed && !tags.includes(trimmed)) {
          setTags((prev) => [...prev, trimmed]);
        }
        setTagInput("");
        return;
      }
      setTagInput(text);
    };

    const handleTagInputSubmit = () => {
      const trimmed = tagInput.trim();
      if (trimmed && !tags.includes(trimmed)) {
        setTags((prev) => [...prev, trimmed]);
        setTagInput("");
      }
    };

    const removeTag = (tag: string) =>
      setTags((prev) => prev.filter((t) => t !== tag));

    const handleSave = useCallback(() => {
      if (!title.trim() && !content.trim()) return;
      const finalTags = [...tags];
      if (tagInput.trim()) finalTags.push(tagInput.trim());

      if (isEditing && editingNote) {
        updateNote.mutate({
          noteId: editingNote.id,
          patch: {
            title: title.trim() || content.trim().slice(0, 40),
            content: content.trim(),
            tags: finalTags,
            categoryId: selectedCategoryId,
          },
        });
        onSaved?.(editingNote.id);
      } else {
        saveNote.mutate({
          title: title.trim() || content.trim().slice(0, 40),
          content: content.trim(),
          tags: finalTags,
          categoryId: selectedCategoryId,
        });
      }

      setTitle("");
      setContent("");
      setTagInput("");
      setTags([]);
      Keyboard.dismiss();
      (ref as React.RefObject<BottomSheet>)?.current?.close();
      onClose?.();
    }, [title, content, tags, tagInput, selectedCategoryId, isEditing, editingNote]);

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

    const canSave = title.trim().length > 0 || content.trim().length > 0;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["92%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{
          backgroundColor: colors.border,
          width: 36,
          height: 4,
        }}
        keyboardBehavior={Platform.OS === "ios" ? "extend" : "interactive"}
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onChange={(index) => {
          if (index === -1) {
            onClose?.();
          } else if (index >= 0 && editingNote) {
            // 시트가 열릴 때마다 폼을 editingNote 최신값으로 재동기화
            // (저장 후 close → 재오픈 시 폼이 비어있는 버그 방지)
            setTitle(editingNote.title);
            setContent(editingNote.content);
            setTags(editingNote.tags);
            setTagInput("");
            setSelectedCategoryId(editingNote.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? null);
          }
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
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
              {isEditing ? "📝 노트 수정" : "📝 노트 작성"}
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
                  letterSpacing: -0.2,
                }}
              >
                {isEditing ? "수정 완료" : "저장하기"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 24 }}>
            {/* ── Title ── */}
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
                타이틀
              </Text>
              <BottomSheetTextInput
                value={title}
                onChangeText={setTitle}
                placeholder="아이디어 제목"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
                style={{
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "500",
                  letterSpacing: -0.3,
                  borderWidth: 1,
                  borderColor: title ? colors.primary : colors.border,
                }}
              />
            </View>

            {/* ── Content ── */}
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
                내용
              </Text>
              <BottomSheetTextInput
                value={content}
                onChangeText={setContent}
                placeholder="본문 (맥락을 자유롭게 적어보세요)"
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
                style={{
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: colors.text,
                  fontSize: 15,
                  lineHeight: 24,
                  minHeight: 100,
                  borderWidth: 1,
                  borderColor: content ? colors.primary : colors.border,
                }}
              />
            </View>

            {/* ── Folder ── */}
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
                폴더
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                        borderWidth: isSelected ? 0 : 0.5,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: isSelected ? "#FFFFFF" : colors.textSecondary,
                        }}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Tags ── */}
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
                태그
              </Text>

              {tags.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  {tags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => removeTag(tag)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.primarySoft,
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        gap: 4,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "500" }}>
                        #{tag}
                      </Text>
                      <Ionicons name="close" size={12} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  borderWidth: 1.5,
                  borderColor: tagInput ? colors.primary : colors.border,
                  gap: 8,
                }}
              >
                <BottomSheetTextInput
                  value={tagInput}
                  onChangeText={handleTagInputChange}
                  onSubmitEditing={handleTagInputSubmit}
                  placeholder="태그 입력 후 쉼표 또는 Enter"
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 15,
                    paddingVertical: 12,
                  }}
                />
                <Ionicons name="pricetag-outline" size={16} color={colors.textTertiary} />
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>
                쉼표(,) 또는 Enter로 태그 추가 · 태그 탭하면 삭제
              </Text>
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

IdeaFormSheet.displayName = "IdeaFormSheet";
