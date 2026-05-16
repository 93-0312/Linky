import React, { useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ChatBubble } from "../../components/chat/ChatBubble";
import { NoteCard } from "../../components/chat/NoteCard";
import { AIStructureCard } from "../../components/chat/AIStructureCard";
import { NoteCardSkeleton } from "../../components/chat/NoteCardSkeleton";
import { InputBar } from "../../components/chat/InputBar";
import { IdeaFormSheet, IdeaFormSheetRef, EditingNote } from "../../components/sheet/IdeaFormSheet";
import { useChatStore } from "../../store/useChatStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useDeleteNote } from "../../lib/api/useNotesMutation";
import { useAppTheme } from "../../lib/theme";
import type { InputMode } from "../../components/chat/InputBar";
import type { ChatMessage, Note } from "../../types";

type ListItem =
  | { kind: "message"; data: ChatMessage }
  | { kind: "note"; data: Note }
  | { kind: "pending"; data: Note }
  | { kind: "divider"; label: string; id: string };


function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  if (isSameDay(date, today)) return "오늘";
  if (isSameDay(date, yesterday)) return "어제";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

type SortableItem =
  | { kind: "message"; data: ChatMessage; sortTime: number }
  | { kind: "note"; data: Note; sortTime: number }
  | { kind: "pending"; data: Note; sortTime: number };

function buildItems(messages: ChatMessage[], notes: Note[]): ListItem[] {
  const base: SortableItem[] = [
    ...messages.map((m) => ({
      kind: "message" as const,
      data: m,
      sortTime: m.createdAt.getTime(),
    })),
    ...notes.map((n) => ({
      kind: (n.confirmed === false ? "pending" : "note") as "pending" | "note",
      data: n,
      sortTime: n.createdAt.getTime(),
    })),
  ].sort((a, b) => a.sortTime - b.sortTime);

  const result: ListItem[] = [];
  let lastLabel = "";

  for (const item of base) {
    // Skip date divider for the static WELCOME message
    if (item.kind === "message" && item.data.id === "welcome") {
      result.push(item);
      continue;
    }
    const label = getDateLabel(item.data.createdAt);
    if (label !== lastLabel) {
      result.push({ kind: "divider", label, id: `divider-${label}` });
      lastLabel = label;
    }
    result.push(item);
  }
  return result;
}

function DateDivider({ label }: { label: string }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 12,
        marginHorizontal: 4,
        gap: 10,
      }}
    >
      <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
      <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: "600" }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
    </View>
  );
}

function EmptyStateHint() {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        alignItems: "center",
        paddingHorizontal: 32,
        paddingTop: 32,
        paddingBottom: 16,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 28 }}>💡</Text>
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        첫 아이디어를 입력해볼까요?
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: colors.textTertiary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        아래 입력창에 키워드 하나만 적어도 OK{"\n"}AI가 콘텐츠 아이디어로 정리해줄게요
      </Text>
    </View>
  );
}

export default function NoteScreen() {
  const { colors } = useAppTheme();
  const { messages, notes, isTyping, sendMessage, confirmNote } = useChatStore();
  const { categories } = useCategoryStore();
  const { inputMode, setInputMode } = useSettingsStore();
  const { user } = useAuthStore();
  const deleteNote = useDeleteNote();
  const listRef = useRef<FlatList>(null);
  const sheetRef = useRef<IdeaFormSheetRef>(null);
  const [editingNote, setEditingNote] = useState<EditingNote | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    () => categories.find((c) => c.isDefault)?.id ?? categories[0]?.id ?? null
  );

  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode, user?.id);
  };

  const scrollToBottom = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

  const openSheet = () => {
    setEditingNote(null);
    sheetRef.current?.expand();
  };

  const handleEdit = (note: Note) => {
    setEditingNote({
      id: note.id,
      title: note.title,
      content: note.rawContent,
      tags: note.tags,
      categoryId: note.categoryId,
    });
    sheetRef.current?.expand();
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert("메모 삭제", "정말 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => deleteNote.mutate(noteId),
      },
    ]);
  };

  const hasUserContent =
    notes.length > 0 || messages.some((m) => m.role === "user");

  const items = buildItems(messages, notes);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "divider") return <DateDivider label={item.label} />;
    if (item.kind === "message") return <ChatBubble message={item.data} />;
    if (item.kind === "pending") {
      return (
        <AIStructureCard
          note={item.data}
          onConfirm={() => confirmNote(item.data.id)}
          onEdit={() => handleEdit(item.data)}
        />
      );
    }
    if (item.kind === "note") {
      const folder = categories.find((c) => c.id === item.data.categoryId);
      return (
        <NoteCard
          note={item.data}
          folderName={folder?.name ?? "초안"}
          onPress={() => router.push(`/note/${item.data.id}`)}
          onDelete={() => handleDeleteNote(item.data.id)}
        />
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar style="dark" />

      {/* 헤더 */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 28,
            fontWeight: "700",
            letterSpacing: -0.5,
          }}
        >
          Linky
        </Text>
        <TouchableOpacity
          onPress={openSheet}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="새 노트"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 채팅 피드 + 입력창: iOS는 KAV로 처리, Android는 adjustPan이 시스템 레벨 처리 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        enabled={Platform.OS === "ios"}
      >
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => {
            if (item.kind === "divider") return item.id;
            if (item.kind === "message") return item.data.id;
            return `note-${item.data.id}`;
          }}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={isTyping ? <NoteCardSkeleton /> : null}
          ListHeaderComponent={!hasUserContent ? <EmptyStateHint /> : null}
          showsVerticalScrollIndicator={false}
          testID="chat-list"
        />

        <InputBar
          onOpen={openSheet}
          onSend={(text) => sendMessage(text, selectedCategoryId)}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          inputMode={inputMode}
          onInputModeChange={handleInputModeChange}
        />
      </KeyboardAvoidingView>

      <IdeaFormSheet
        ref={sheetRef}
        onClose={() => setEditingNote(null)}
        onSaved={(noteId) => confirmNote(noteId)}
        editingNote={editingNote}
        defaultCategoryId={selectedCategoryId}
      />
    </SafeAreaView>
  );
}
