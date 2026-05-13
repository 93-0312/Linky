import React, { useRef, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useChatStore } from "../../store/useChatStore";
import { useAppTheme } from "../../lib/theme";
import { useDeleteFolder } from "../../lib/api/useFoldersMutation";
import { IdeaFormSheet, IdeaFormSheetRef } from "../../components/sheet/IdeaFormSheet";
import { FolderFormSheet, FolderFormSheetRef } from "../../components/sheet/FolderFormSheet";
import type { Note } from "../../types";

type FilterType = "all" | "recent" | "tag";

function NoteItem({ note, onPress }: { note: Note; onPress: () => void }) {
  const { colors } = useAppTheme();
  const date = note.createdAt.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
  const hasAI = note.derivedIdeas.length > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.text,
            flex: 1,
            marginRight: 8,
          }}
          numberOfLines={1}
        >
          {note.title}
        </Text>
        {hasAI && (
          <View
            style={{
              backgroundColor: colors.primarySoft,
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "700" }}>AI</Text>
          </View>
        )}
      </View>

      {note.rawContent.trim().length > 0 && (
        <Text
          style={{
            fontSize: 13,
            color: colors.textTertiary,
            lineHeight: 20,
            marginBottom: 8,
          }}
          numberOfLines={2}
        >
          {note.rawContent}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, flex: 1 }}>
          {note.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              style={{
                backgroundColor: colors.primarySoft,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "500" }}>
                #{tag}
              </Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: colors.textTertiary }}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
}

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: "전체", value: "all" },
  { label: "최신순", value: "recent" },
  { label: "태그별", value: "tag" },
];

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { categories } = useCategoryStore();
  const { notes } = useChatStore();
  const deleteFolder = useDeleteFolder();
  const noteSheetRef = useRef<IdeaFormSheetRef>(null);
  const folderSheetRef = useRef<FolderFormSheetRef>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const folder = categories.find((c) => c.id === id);

  if (!folder) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
        edges={["top", "bottom"]}
      >
        <Text style={{ color: colors.textTertiary, fontSize: 15 }}>폴더를 찾을 수 없어요</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontSize: 15 }}>← 뒤로</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const folderNotes = notes.filter(
    (n) => n.categoryId === id && n.confirmed !== false
  );

  const allTags = Array.from(new Set(folderNotes.flatMap((n) => n.tags)));

  let filteredNotes = [...folderNotes].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  if (filter === "tag" && selectedTag) {
    filteredNotes = filteredNotes.filter((n) => n.tags.includes(selectedTag));
  }

  const handleMorePress = () => {
    const isDefault = folder.isDefault;
    Alert.alert(
      folder.name,
      undefined,
      [
        {
          text: "폴더 수정",
          onPress: () => folderSheetRef.current?.expand(),
        },
        ...(isDefault
          ? []
          : [
              {
                text: "폴더 삭제",
                style: "destructive" as const,
                onPress: () => {
                  Alert.alert(
                    "폴더 삭제",
                    `"${folder.name}" 폴더를 삭제할까요?\n폴더 내 메모는 삭제되지 않아요.`,
                    [
                      { text: "취소", style: "cancel" },
                      {
                        text: "삭제",
                        style: "destructive",
                        onPress: () => {
                          deleteFolder.mutate(id);
                          router.back();
                        },
                      },
                    ]
                  );
                },
              },
            ]),
        { text: "취소", style: "cancel" as const },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* Header */}
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
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "500" }}>탐색</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleMorePress}
          accessibilityRole="button"
          accessibilityLabel="더보기"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Folder title */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 30 }}>{folder.icon}</Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: colors.text,
              letterSpacing: -0.5,
            }}
          >
            {folder.name}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4, marginLeft: 2 }}>
          메모 {folderNotes.length}개
        </Text>
      </View>

      {/* Filter chips */}
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => {
                setFilter(opt.value);
                if (opt.value !== "tag") setSelectedTag(null);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor:
                  filter === opt.value ? colors.primary : colors.surfaceElevated,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: filter === opt.value ? "#FFFFFF" : colors.textSecondary,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tag sub-filter */}
        {filter === "tag" && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {allTags.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.textTertiary }}>태그가 없어요</Text>
            ) : (
              allTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor:
                      selectedTag === tag ? colors.primarySoft : colors.surfaceElevated,
                    borderWidth: 0.5,
                    borderColor: selectedTag === tag ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: selectedTag === tag ? colors.primary : colors.textSecondary,
                      fontWeight: "500",
                    }}
                  >
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      {/* Notes list */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <NoteItem
            note={item}
            onPress={() => router.push(`/note/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              아직 메모가 없어요
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textTertiary,
                textAlign: "center",
                lineHeight: 22,
                paddingHorizontal: 32,
              }}
            >
              {filter === "tag" && selectedTag
                ? `#${selectedTag} 태그 메모가 없어요`
                : "아이디어가 기다리고 있어요!\n아래 + 버튼으로 추가해볼까요? 🌱"}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => noteSheetRef.current?.expand()}
        style={{
          position: "absolute",
          bottom: 32,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
        }}
        accessibilityRole="button"
        accessibilityLabel="새 메모 추가"
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <IdeaFormSheet ref={noteSheetRef} defaultCategoryId={id} />
      <FolderFormSheet ref={folderSheetRef} editingFolder={folder} />
    </SafeAreaView>
  );
}
