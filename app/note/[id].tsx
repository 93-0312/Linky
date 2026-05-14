import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "../../store/useChatStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useAppTheme } from "../../lib/theme";
import { useDeleteNote, useUpdateNoteCategory } from "../../lib/api/useNotesMutation";
import { IdeaFormSheet, IdeaFormSheetRef } from "../../components/sheet/IdeaFormSheet";
import type { TitleOption } from "../../types";

function AISkeleton({ colors }: { colors: ReturnType<typeof import("../../lib/theme").useAppTheme>["colors"] }) {
  return (
    <View style={{ gap: 12, marginBottom: 32 }}>
      {/* 헤더 스켈레톤 */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>
          AI가 분석 중이에요...
        </Text>
      </View>

      {/* 카드 스켈레톤 */}
      <View
        style={{
          backgroundColor: colors.noteBg,
          borderRadius: 16,
          padding: 16,
          gap: 10,
        }}
      >
        {[80, 120, 100].map((w, i) => (
          <View
            key={i}
            style={{
              height: 14,
              width: `${w}%`,
              backgroundColor: colors.border,
              borderRadius: 7,
              opacity: 0.6,
            }}
          />
        ))}
      </View>
      <View
        style={{
          backgroundColor: colors.noteBg,
          borderRadius: 16,
          padding: 16,
          gap: 10,
        }}
      >
        {[90, 110, 95].map((w, i) => (
          <View
            key={i}
            style={{
              height: 14,
              width: `${w}%`,
              backgroundColor: colors.border,
              borderRadius: 7,
              opacity: 0.6,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { notes, updateNoteTitle, generateAISuggestions, generatingIds } = useChatStore();
  const { categories } = useCategoryStore();
  const deleteNote = useDeleteNote();
  const updateCategory = useUpdateNoteCategory();
  const sheetRef = useRef<IdeaFormSheetRef>(null);
  const [selectedTitleIdx, setSelectedTitleIdx] = useState<number | null>(null);

  const note = notes.find((n) => n.id === id);
  const isGenerating = !!id && generatingIds.includes(id);

  // 노트 모드로 저장된 노트(AI 데이터 없음)이면 자동으로 AI 분석 실행
  useEffect(() => {
    if (!note) return;
    if (note.derivedIdeas.length === 0 && note.titleOptions.length === 0) {
      generateAISuggestions(note.id);
    }
  }, [note?.id]);

  if (!note) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textTertiary, fontSize: 15 }}>메모를 찾을 수 없어요</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontSize: 15 }}>← 뒤로</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const folder = categories.find((c) => c.id === note.categoryId);
  const folderName = folder?.name ?? "초안";

  const formattedDate = note.createdAt
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, ".")
    .replace(/\.$/, "");

  const handleStatusChange = () => {
    Alert.alert("폴더 이동", "이동할 폴더를 선택해주세요", [
      ...categories.map((c) => ({
        text: `${c.icon} ${c.name}`,
        onPress: () => updateCategory.mutate({ noteId: note.id, categoryId: c.id }),
      })),
      { text: "취소", style: "cancel" as const },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("메모 삭제", "정말 삭제할까요? 이 작업은 되돌릴 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          // mutate의 onSuccess에서 back() 호출 — mutate와 router.back()을 동시에
          // 실행하면 Android에서 스토어 업데이트 전에 네비게이션이 먼저 일어나
          // 타이밍 문제가 발생함
          deleteNote.mutate(note.id, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  };

  const handleSelectTitle = (option: TitleOption, idx: number) => {
    setSelectedTitleIdx(idx);
    updateNoteTitle(note.id, option.title);
  };

  const hasAIData = note.derivedIdeas.length > 0 || note.titleOptions.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar style="dark" />

      {/* 헤더 */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center" }}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
        >
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "500" }}>노트</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <TouchableOpacity
            onPress={() => sheetRef.current?.expand()}
            accessibilityRole="button"
            accessibilityLabel="편집"
          >
            <Ionicons name="pencil-outline" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="삭제"
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>

          {/* 제목 */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.text,
              letterSpacing: -0.5,
              marginBottom: 12,
              lineHeight: 32,
            }}
          >
            {note.title}
          </Text>

          {/* 상태 배지 + 날짜 + 폴더 이동 */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 }}>
            <View
              style={{
                backgroundColor: colors.surfaceElevated,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600" }}>
                {folderName}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>{formattedDate}</Text>
            <TouchableOpacity onPress={handleStatusChange}>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
                폴더 이동
              </Text>
            </TouchableOpacity>
          </View>

          {/* 태그 */}
          {note.tags.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {note.tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    backgroundColor: colors.primarySoft,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "500" }}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 본문 */}
          {note.rawContent.trim().length > 0 && (
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                lineHeight: 24,
                marginBottom: 24,
              }}
            >
              {note.rawContent}
            </Text>
          )}

          {/* AI 섹션: 로딩 중 */}
          {isGenerating && !hasAIData && <AISkeleton colors={colors} />}

          {/* AI 예상 타겟 */}
          {note.derivedIdeas.length > 0 && (
            <View
              style={{
                backgroundColor: colors.noteBg,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.primary,
                  marginBottom: 12,
                }}
              >
                ⭐ AI 예상 타겟
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {note.derivedIdeas.map((idea, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      {idea.target}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* AI 추천 제목 */}
          {note.titleOptions.length > 0 && (
            <View
              style={{
                backgroundColor: colors.noteBg,
                borderRadius: 16,
                padding: 16,
                marginBottom: 32,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.primary,
                  marginBottom: 12,
                }}
              >
                ⭐ AI 추천 제목
              </Text>
              <View style={{ gap: 8 }}>
                {note.titleOptions.map((option, idx) => {
                  const isSelected =
                    selectedTitleIdx === idx ||
                    (selectedTitleIdx === null && note.title === option.title);
                  return (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        borderWidth: isSelected ? 1 : 0.5,
                        borderColor: isSelected ? colors.primary : colors.border,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: colors.text,
                          lineHeight: 20,
                          marginRight: 12,
                        }}
                      >
                        {option.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleSelectTitle(option, idx)}
                        accessibilityRole="button"
                        accessibilityLabel={`"${option.title}" 선택`}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: isSelected ? colors.textTertiary : colors.primary,
                          }}
                        >
                          {isSelected ? "선택됨" : "선택"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* AI 데이터 없고 로딩도 아닌 경우 (AI 실패 후 재시도) */}
          {!hasAIData && !isGenerating && (
            <TouchableOpacity
              onPress={() => generateAISuggestions(note.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 32,
              }}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: "600" }}>
                AI 추천 다시 분석하기
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <IdeaFormSheet
        ref={sheetRef}
        editingNote={{
          id: note.id,
          title: note.title,
          content: note.rawContent,
          tags: note.tags,
          categoryId: note.categoryId,
        }}
      />
    </SafeAreaView>
  );
}
