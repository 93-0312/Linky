import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useChatStore } from "../../store/useChatStore";
import { useAppTheme } from "../../lib/theme";
import {
  FolderFormSheet,
  FolderFormSheetRef,
} from "../../components/sheet/FolderFormSheet";
import type { Note, Category } from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_WIDTH = Math.min(230, SCREEN_WIDTH * 0.65);
const COLUMN_GAP = 12;
const BOARD_PADDING = 20;

const COLUMN_COLORS: Record<string, string> = {
  초안: "#F4F4F8",
  제작중: "#FFF8F0",
  완료: "#F0FBF4",
};

// ─── Floating card (drag overlay) ────────────────────────────────────────────

interface FloatingCardProps {
  note: Note;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  cardWidth: number;
}

function FloatingCard({ note, dragX, dragY, cardWidth }: FloatingCardProps) {
  const { colors } = useAppTheme();
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: cardWidth,
          zIndex: 9999,
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.primary,
          padding: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          elevation: 12,
        },
        animStyle,
      ]}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: colors.text,
          letterSpacing: -0.2,
          marginBottom: 4,
        }}
        numberOfLines={2}
      >
        {note.title}
      </Text>
      {note.rawContent.trim().length > 0 && (
        <Text
          style={{ fontSize: 12, color: colors.textTertiary, lineHeight: 18 }}
          numberOfLines={2}
        >
          {note.rawContent}
        </Text>
      )}
      {note.tags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {note.tags.slice(0, 2).map((tag) => (
            <View
              key={tag}
              style={{
                backgroundColor: colors.primarySoft,
                borderRadius: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "500" }}>
                #{tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// ─── Kanban card ──────────────────────────────────────────────────────────────

interface KanbanCardProps {
  note: Note;
  isDraggingThis: boolean;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  onDragStart: (note: Note, ox: number, oy: number, w: number, h: number) => void;
  onDrop: (cardX: number, cardY: number) => void;
  onDragCancel: () => void;
}

function KanbanCard({
  note,
  isDraggingThis,
  dragX,
  dragY,
  onDragStart,
  onDrop,
  onDragCancel,
}: KanbanCardProps) {
  const { colors } = useAppTheme();
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const cardW = useSharedValue(COLUMN_WIDTH - 24);
  const cardH = useSharedValue(80);

  const navigate = useCallback(() => {
    router.push(`/note/${note.id}`);
  }, [note.id]);

  const notifyDragStart = useCallback(
    (ox: number, oy: number, w: number, h: number) => {
      onDragStart(note, ox, oy, w, h);
    },
    [note, onDragStart]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(400)
        .onBegin((e) => {
          originX.value = e.absoluteX - e.x;
          originY.value = e.absoluteY - e.y;
        })
        .onStart(() => {
          dragX.value = originX.value;
          dragY.value = originY.value;
          runOnJS(notifyDragStart)(
            originX.value,
            originY.value,
            cardW.value,
            cardH.value
          );
        })
        .onUpdate((e) => {
          dragX.value = originX.value + e.translationX;
          dragY.value = originY.value + e.translationY;
        })
        .onEnd(() => {
          runOnJS(onDrop)(dragX.value, dragY.value);
        })
        .onFinalize(() => {
          runOnJS(onDragCancel)();
        }),
    [notifyDragStart, onDrop, onDragCancel]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(navigate)();
      }),
    [navigate]
  );

  const composed = useMemo(
    () => Gesture.Race(tapGesture, panGesture),
    [tapGesture, panGesture]
  );

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        onLayout={(e) => {
          cardW.value = e.nativeEvent.layout.width;
          cardH.value = e.nativeEvent.layout.height;
        }}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 0.5,
          borderColor: colors.border,
          padding: 12,
          marginBottom: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
          opacity: isDraggingThis ? 0 : 1,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: colors.text,
            letterSpacing: -0.2,
            marginBottom: 4,
          }}
          numberOfLines={2}
        >
          {note.title}
        </Text>

        {note.rawContent.trim().length > 0 && (
          <Text
            style={{
              fontSize: 12,
              color: colors.textTertiary,
              lineHeight: 18,
              marginBottom: 8,
            }}
            numberOfLines={3}
          >
            {note.rawContent}
          </Text>
        )}

        {note.tags.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {note.tags.slice(0, 2).map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: colors.primarySoft,
                  borderRadius: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "500" }}>
                  #{tag}
                </Text>
              </View>
            ))}
            {note.tags.length > 2 && (
              <Text style={{ fontSize: 10, color: colors.textTertiary, alignSelf: "center" }}>
                +{note.tags.length - 2}
              </Text>
            )}
          </View>
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 10, color: colors.textTertiary }}>
            {note.createdAt.toLocaleDateString("ko-KR", {
              month: "numeric",
              day: "numeric",
            })}
          </Text>
          <Ionicons name="reorder-three-outline" size={14} color={colors.textTertiary} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  category: Category;
  notes: Note[];
  draggingNoteId: string | null;
  isDragging: boolean;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  onDragStart: (note: Note, ox: number, oy: number, w: number, h: number) => void;
  onDrop: (cardX: number, cardY: number) => void;
  onDragCancel: () => void;
  boardHeight: number;
}

function KanbanColumn({
  category,
  notes,
  draggingNoteId,
  isDragging,
  dragX,
  dragY,
  onDragStart,
  onDrop,
  onDragCancel,
  boardHeight,
}: KanbanColumnProps) {
  const { colors } = useAppTheme();
  const colBg = COLUMN_COLORS[category.name] ?? colors.surfaceElevated;

  return (
    <View
      style={{
        width: COLUMN_WIDTH,
        height: boardHeight,
        backgroundColor: colBg,
        borderRadius: 18,
        padding: 12,
        borderWidth: 0.5,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          paddingBottom: 10,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 18 }}>{category.icon}</Text>
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "700",
            color: colors.text,
            letterSpacing: -0.3,
          }}
        >
          {category.name}
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "600" }}>
            {notes.length}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEnabled={!isDragging}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {notes.length === 0 ? (
          <View
            style={{
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 28,
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 20 }}>✦</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>비어있어요</Text>
          </View>
        ) : (
          notes.map((note) => (
            <KanbanCard
              key={note.id}
              note={note}
              isDraggingThis={draggingNoteId === note.id}
              dragX={dragX}
              dragY={dragY}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onDragCancel={onDragCancel}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Board screen ─────────────────────────────────────────────────────────────

export default function BoardScreen() {
  const { colors } = useAppTheme();
  const { categories } = useCategoryStore();
  const { notes, updateNoteCategory } = useChatStore();
  const folderSheetRef = useRef<FolderFormSheetRef>(null);
  const [query, setQuery] = useState("");
  const [boardHeight, setBoardHeight] = useState(Math.round(SCREEN_WIDTH * 1.2));

  // Drag state
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [draggingNote, setDraggingNote] = useState<Note | null>(null);
  const [dragCardWidth, setDragCardWidth] = useState(COLUMN_WIDTH - 24);
  const draggingNoteRef = useRef<Note | null>(null);
  const dragCardWidthRef = useRef(COLUMN_WIDTH - 24);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  // Horizontal scroll tracking for drop detection
  const hScrollRef = useRef<ScrollView>(null);
  const scrollViewScreenX = useRef(0);
  const scrollOffset = useRef(0);

  // Web: 마우스 드래그로 가로 스크롤
  const isDraggingScroll = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = (hScrollRef.current as unknown as { _nativeTag?: HTMLElement } | null)
      ?._nativeTag ?? (hScrollRef.current as unknown as HTMLElement | null);
    if (!el) return;

    const getScrollEl = (): HTMLElement | null => {
      if (el instanceof HTMLElement) return el;
      return null;
    };

    const scrollEl = getScrollEl();
    if (!scrollEl) return;

    const onMouseDown = (e: MouseEvent) => {
      isDraggingScroll.current = true;
      dragStartX.current = e.pageX;
      dragStartScrollLeft.current = scrollEl.scrollLeft;
      scrollEl.style.cursor = "grabbing";
      scrollEl.style.userSelect = "none";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingScroll.current) return;
      const dx = e.pageX - dragStartX.current;
      scrollEl.scrollLeft = dragStartScrollLeft.current - dx;
    };
    const onMouseUp = () => {
      isDraggingScroll.current = false;
      scrollEl.style.cursor = "grab";
      scrollEl.style.userSelect = "";
    };

    scrollEl.style.cursor = "grab";
    scrollEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      scrollEl.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  const confirmedNotes = notes.filter((n) => n.confirmed !== false);

  const filteredNotes = query.trim()
    ? confirmedNotes.filter((n) => {
        const q = query.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.rawContent.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
    : confirmedNotes;

  const notesFor = (categoryId: string) =>
    filteredNotes
      .filter((n) => n.categoryId === categoryId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const handleDragStart = useCallback(
    (note: Note, _ox: number, _oy: number, w: number, _h: number) => {
      // 드래그 직전에 ScrollView 화면 좌표 갱신 (edge-to-edge 환경 대응)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (hScrollRef.current as any)?.measureInWindow((x: number) => {
        scrollViewScreenX.current = x;
      });
      draggingNoteRef.current = note;
      dragCardWidthRef.current = w;
      setDraggingNote(note);
      setDraggingNoteId(note.id);
      setDragCardWidth(w);
    },
    []
  );

  const cleanupDrag = useCallback(() => {
    if (draggingNoteRef.current === null) return;
    draggingNoteRef.current = null;
    setDraggingNote(null);
    setDraggingNoteId(null);
  }, []);

  const handleDrop = useCallback(
    (cardX: number, _cardY: number) => {
      const note = draggingNoteRef.current;
      if (note) {
        const centerX = cardX + dragCardWidthRef.current / 2;
        const contentX = centerX - scrollViewScreenX.current + scrollOffset.current;
        const colIdx = Math.floor(
          (contentX - BOARD_PADDING) / (COLUMN_WIDTH + COLUMN_GAP)
        );
        const cats = categoriesRef.current;
        if (colIdx >= 0 && colIdx < cats.length) {
          const target = cats[colIdx];
          if (target.id !== note.categoryId) {
            updateNoteCategory(note.id, target.id);
          }
        }
      }
      cleanupDrag();
    },
    [updateNoteCategory, cleanupDrag]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
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
            fontSize: 28,
            fontWeight: "700",
            color: colors.text,
            letterSpacing: -0.5,
          }}
        >
          탐색
        </Text>
        <TouchableOpacity
          onPress={() => folderSheetRef.current?.expand()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 20,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "600" }}>
            폴더 추가
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surfaceElevated,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            gap: 8,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="메모 검색..."
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, color: colors.text, fontSize: 14, padding: 0 }}
            testID="search-input"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Hint */}
      {!query.trim() && confirmedNotes.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          <Text style={{ fontSize: 11, color: colors.textTertiary }}>
            ✦ 카드를 길게 눌러 다른 칸으로 드래그하세요
          </Text>
        </View>
      )}

      {/* Board */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setBoardHeight(e.nativeEvent.layout.height - 16)}
      >
        <ScrollView
          ref={hScrollRef}
          horizontal
          showsHorizontalScrollIndicator={Platform.OS === "web"}
          scrollEnabled={!draggingNoteId}
          scrollEventThrottle={16}
          onLayout={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (hScrollRef.current as any)?.measureInWindow((x: number) => {
              scrollViewScreenX.current = x;
            });
          }}
          onScroll={(e) => {
            scrollOffset.current = e.nativeEvent.contentOffset.x;
          }}
          contentContainerStyle={{
            paddingHorizontal: BOARD_PADDING,
            paddingBottom: 16,
            gap: COLUMN_GAP,
            alignItems: "flex-start",
          }}
          style={{ flex: 1 }}
        >
          {categories.map((category) => (
            <KanbanColumn
              key={category.id}
              category={category}
              notes={notesFor(category.id)}
              draggingNoteId={draggingNoteId}
              isDragging={!!draggingNoteId}
              dragX={dragX}
              dragY={dragY}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragCancel={cleanupDrag}
              boardHeight={boardHeight}
            />
          ))}
        </ScrollView>

        {/* Floating drag card */}
        {draggingNote && (
          <FloatingCard
            note={draggingNote}
            dragX={dragX}
            dragY={dragY}
            cardWidth={dragCardWidth}
          />
        )}
      </View>

      <FolderFormSheet ref={folderSheetRef} />
    </SafeAreaView>
  );
}
