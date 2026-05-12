import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useSettingsStore, WhipLevel } from "../../store/useSettingsStore";
import { useAppTheme } from "../../lib/theme";

const PLATFORM_OPTIONS = ["유튜브", "블로그", "인스타그램", "팟캐스터", "틱톡", "기타"];

const NOTIFICATION_TIMES: { label: string; value: string }[] = [
  { label: "오전 7시", value: "07:00" },
  { label: "오전 8시", value: "08:00" },
  { label: "오전 9시", value: "09:00" },
  { label: "오전 10시", value: "10:00" },
  { label: "오후 7시", value: "19:00" },
  { label: "오후 8시", value: "20:00" },
  { label: "오후 9시", value: "21:00" },
];

function formatNotificationTime(time: string): string {
  const found = NOTIFICATION_TIMES.find((t) => t.value === time);
  return found ? found.label : time;
}

function formatWhipLevel(level: WhipLevel): string {
  if (level === "light") return "가볍게";
  if (level === "hard") return "강하게";
  return "보통";
}

function getWhipMessage(
  weekDone: number,
  weekInProgress: number,
  weekDraft: number,
  weekTotal: number,
  whipLevel: WhipLevel
): string {
  if (weekTotal === 0) {
    if (whipLevel === "light") return "📝 이번 주는 조용하네요.\n아이디어가 생기면 언제든 적어보세요!";
    if (whipLevel === "hard") return "📝 이번 주 0개! 지금 당장\n아이디어 하나 적어보세요!";
    return "📝 이번 주는 조용하네요.\n링키에 아이디어를 적어볼까요?";
  }
  if (weekDone >= 3) {
    if (whipLevel === "light") return `🎉 이번 주 ${weekDone}개 완료!\n훌륭한 한 주였어요!`;
    if (whipLevel === "hard") return `🏆 ${weekDone}개 완료! 이 기세로\n다음 주도 쉬지 말고 달립시다!`;
    return `🎉 이번 주 ${weekDone}개를 완료했어요!\n정말 멋진 한 주예요!`;
  }
  if (weekDone > 0) {
    if (whipLevel === "light") return `✨ ${weekDone}개 완료했어요!\n나머지도 천천히 해봐요!`;
    if (whipLevel === "hard") return `🔥 겨우 ${weekDone}개! 제작중인 ${weekInProgress}개\n반드시 이번 주 안에 끝내세요!`;
    return `✨ ${weekDone}개 완료! 제작중인 ${weekInProgress}개도\n이번 주 안에 끝내봐요!`;
  }
  if (weekInProgress > weekDraft) {
    if (whipLevel === "light") return `💪 ${weekInProgress}개 제작 중이에요!\n할 수 있어요, 파이팅!`;
    if (whipLevel === "hard") return `💪 ${weekInProgress}개 제작중인데 완료 0개!\n오늘 당장 하나는 끝내세요!`;
    return `💪 ${weekInProgress}개가 제작 중이에요!\n끝까지 달려봐요!`;
  }
  if (weekDraft > 0) {
    if (whipLevel === "light") return `📄 초안에 ${weekDraft}개 있어요!\n여유롭게 진행해봐요!`;
    if (whipLevel === "hard") return `🔥 초안에 ${weekDraft}개가 쌓였어요!\n지금 당장 제작중으로 옮기세요!`;
    return `🔥 초안에 ${weekDraft}개가 쌓였어요!\n이번 주 안에 2개만 제작중으로 옮겨볼까요?`;
  }
  if (whipLevel === "light") return `💡 이번 주 ${weekTotal}개 기록! 잘 하고 있어요!`;
  if (whipLevel === "hard") return `💡 ${weekTotal}개 기록했는데 아직 초안!\n지금 바로 진행해요!`;
  return `💡 이번 주 ${weekTotal}개의 아이디어를 기록했어요.\n계속 이어가요!`;
}

function SettingRow({
  label,
  value,
  onPress,
  isLast = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 16,
        }}
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 14, color: colors.textTertiary }}>{value} ›</Text>
      </TouchableOpacity>
      {!isLast && <View style={{ height: 0.5, backgroundColor: colors.border }} />}
    </>
  );
}

export default function MyPage() {
  const { colors } = useAppTheme();
  const { categories } = useCategoryStore();
  const { notes } = useChatStore();
  const { user, signOut, deleteAccount } = useAuthStore();
  const router = useRouter();
  const {
    userName,
    platforms,
    notificationEnabled,
    notificationTime,
    whipLevel,
    setUserName,
    setPlatforms,
    setNotificationEnabled,
    setNotificationTime,
    setWhipLevel,
  } = useSettingsStore();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editPlatforms, setEditPlatforms] = useState<string[]>(platforms);

  const confirmedNotes = notes.filter((n) => n.confirmed !== false);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekNotes = confirmedNotes.filter((n) => n.createdAt >= sevenDaysAgo);

  const countByFolderName = (name: string, source: typeof confirmedNotes) => {
    const cat = categories.find((c) => c.name === name);
    if (!cat) return 0;
    return source.filter((n) => n.categoryId === cat.id).length;
  };

  const draftCount = countByFolderName("초안", confirmedNotes);
  const inProgressCount = countByFolderName("제작중", confirmedNotes);
  const doneCount = countByFolderName("완료", confirmedNotes);

  const weekDraft = countByFolderName("초안", weekNotes);
  const weekInProgress = countByFolderName("제작중", weekNotes);
  const weekDone = countByFolderName("완료", weekNotes);
  const weekTotal = weekNotes.length;

  const draftToInProgress =
    weekDraft + weekInProgress > 0
      ? Math.round((weekInProgress / (weekDraft + weekInProgress)) * 100)
      : 0;
  const inProgressToDone =
    weekInProgress + weekDone > 0
      ? Math.round((weekDone / (weekInProgress + weekDone)) * 100)
      : 0;

  const whipMessage = getWhipMessage(weekDone, weekInProgress, weekDraft, weekTotal, whipLevel);

  const openProfileModal = () => {
    setEditName(userName);
    setEditPlatforms([...platforms]);
    setShowProfileModal(true);
  };

  const handleSaveProfile = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert("이름을 입력해주세요.");
      return;
    }
    setUserName(trimmed, user?.id);
    setPlatforms(editPlatforms.length > 0 ? editPlatforms : ["기타"], user?.id);
    setShowProfileModal(false);
  };

  const togglePlatform = (p: string) => {
    setEditPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleNotificationSetting = () => {
    const timeButtons = NOTIFICATION_TIMES.map((t) => ({
      text: t.label + (notificationTime === t.value && notificationEnabled ? " ✓" : ""),
      onPress: () => {
        setNotificationEnabled(true, user?.id);
        setNotificationTime(t.value, user?.id);
      },
    }));
    Alert.alert(
      "알림 설정",
      "매일 알림을 받을 시간을 선택하세요.",
      [
        ...timeButtons,
        {
          text: notificationEnabled ? "알림 끄기" : "알림 끄는 중...",
          style: "destructive" as const,
          onPress: () => setNotificationEnabled(false, user?.id),
        },
        { text: "취소", style: "cancel" as const },
      ]
    );
  };

  const handleWhipLevel = () => {
    Alert.alert(
      "채찍질 강도",
      "7일 리포트 메시지의 강도를 선택하세요.",
      [
        {
          text: `🌱 가볍게${whipLevel === "light" ? " ✓" : ""}`,
          onPress: () => setWhipLevel("light", user?.id),
        },
        {
          text: `💪 보통${whipLevel === "normal" ? " ✓" : ""}`,
          onPress: () => setWhipLevel("normal", user?.id),
        },
        {
          text: `🔥 강하게${whipLevel === "hard" ? " ✓" : ""}`,
          onPress: () => setWhipLevel("hard", user?.id),
        },
        { text: "취소", style: "cancel" as const },
      ]
    );
  };

  const handleDarkMode = () => {
    Alert.alert(
      "다크모드",
      "현재 라이트 모드로 고정되어 있어요.\n다크모드는 다음 업데이트에서 지원 예정이에요.",
      [{ text: "확인" }]
    );
  };

  const handleExport = async () => {
    if (confirmedNotes.length === 0) {
      Alert.alert("내보내기", "내보낼 노트가 없어요.\n먼저 아이디어를 저장해보세요!");
      return;
    }
    const lines = confirmedNotes.map((n) => {
      const folder = categories.find((c) => c.id === n.categoryId)?.name ?? "미분류";
      const tags = n.tags.length > 0 ? `태그: ${n.tags.join(", ")}` : "";
      const date = n.createdAt.toLocaleDateString("ko-KR");
      return [`## ${n.title}`, `📁 ${folder}  |  ${date}`, tags, "", n.rawContent]
        .filter(Boolean)
        .join("\n");
    });
    const message = `# Linky 노트 내보내기\n총 ${confirmedNotes.length}개\n\n` + lines.join("\n\n---\n\n");
    try {
      await Share.share({ title: "Linky 노트", message });
    } catch {
      // user cancelled
    }
  };

  const handleVersionInfo = () => {
    Alert.alert(
      "버전 정보",
      "Linky v1.0.0\n\nAI 아이디어 인큐베이션 앱\n© 2026 Linky Team",
      [{ text: "확인" }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "회원 탈퇴",
      "탈퇴하면 모든 아이디어와 데이터가 영구 삭제됩니다.\n정말 탈퇴하시겠어요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "마지막 확인",
              "이 작업은 되돌릴 수 없습니다.\n정말 탈퇴하시겠어요?",
              [
                { text: "취소", style: "cancel" },
                {
                  text: "탈퇴",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace("/login" as never);
                    } catch (e) {
                      Alert.alert(
                        "오류",
                        e instanceof Error ? e.message : "탈퇴 처리 중 오류가 발생했습니다."
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    if (Platform.OS === "web") {
      if (!window.confirm("정말 로그아웃 할까요?")) return;
      await signOut();
      router.replace("/login" as never);
    } else {
      Alert.alert("로그아웃", "정말 로그아웃 할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "로그아웃",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/login" as never);
          },
        },
      ]);
    }
  };

  const avatarLetter = userName.charAt(0);
  const platformLabel = platforms.join(" · ");

  const notificationValue = notificationEnabled
    ? formatNotificationTime(notificationTime)
    : "꺼짐";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar style="dark" />

      {/* 프로필 편집 모달 */}
      <Modal visible={showProfileModal} animationType="slide" transparent statusBarTranslucent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 44,
            }}
          >
            {/* 모달 헤더 */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                프로필 편집
              </Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Text style={{ fontSize: 15, color: colors.textTertiary }}>취소</Text>
              </TouchableOpacity>
            </View>

            {/* 이름 입력 */}
            <Text
              style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 8, fontWeight: "600" }}
            >
              이름
            </Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="이름을 입력하세요"
              placeholderTextColor={colors.textTertiary}
              maxLength={20}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: colors.text,
                backgroundColor: colors.surfaceElevated,
                marginBottom: 22,
              }}
            />

            {/* 플랫폼 선택 */}
            <Text
              style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 10, fontWeight: "600" }}
            >
              활동 플랫폼
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {PLATFORM_OPTIONS.map((p) => {
                const active = editPlatforms.includes(p);
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => togglePlatform(p)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primarySoft : colors.surfaceElevated,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: active ? colors.primary : colors.textSecondary,
                        fontWeight: active ? "600" : "400",
                      }}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 저장 버튼 */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Text
            style={{ fontSize: 28, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}
          >
            마이페이지
          </Text>
        </View>

        {/* 프로필 카드 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openProfileModal}
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFFFFF" }}>
                {avatarLetter}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 4 }}
              >
                {userName}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textTertiary }}>{platformLabel}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textTertiary }}>편집 ›</Text>
          </TouchableOpacity>
        </View>

        {/* 전체 통계 3개 */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { label: "초안", count: draftCount },
            { label: "제작중", count: inProgressCount },
            { label: "완료", count: doneCount },
          ].map(({ label, count }) => (
            <View
              key={label}
              style={{
                flex: 1,
                backgroundColor: colors.surfaceElevated,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: colors.primary,
                  marginBottom: 4,
                }}
              >
                {count}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* 7일 진행률 리포트 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <LinearGradient
            colors={["#1A6DFF", "#4A8FFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, padding: 18 }}
          >
            <Text
              style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF", marginBottom: 4 }}
            >
              ⭐ 7일간 진행률 리포트
            </Text>
            <Text
              style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 16 }}
            >
              최근 7일 기준 · {weekTotal}개 기록됨
            </Text>

            {/* 초안 → 제작중 */}
            <View style={{ marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                  초안 → 제작중
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
                  {draftToInProgress}%
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 6,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 3,
                    width: `${draftToInProgress}%`,
                  }}
                />
              </View>
            </View>

            {/* 제작중 → 완료 */}
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                  제작중 → 완료
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
                  {inProgressToDone}%
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 6,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 3,
                    width: `${inProgressToDone}%`,
                  }}
                />
              </View>
            </View>

            <View
              style={{
                height: 0.5,
                backgroundColor: "rgba(255,255,255,0.2)",
                marginBottom: 14,
              }}
            />

            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 20 }}>
              {whipMessage}
            </Text>
          </LinearGradient>
        </View>

        {/* 설정 리스트 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 40 }}>
          <SettingRow
            label="알림 설정"
            value={notificationValue}
            onPress={handleNotificationSetting}
          />
          <SettingRow
            label="채찍질 강도"
            value={formatWhipLevel(whipLevel)}
            onPress={handleWhipLevel}
          />
          <SettingRow
            label="다크모드"
            value="라이트 모드"
            onPress={handleDarkMode}
          />
          <SettingRow
            label="데이터 내보내기"
            value={`${confirmedNotes.length}개`}
            onPress={handleExport}
          />
          <SettingRow
            label="버전 정보"
            value="v1.0.0"
            onPress={handleVersionInfo}
          />
        </View>

        {/* 계정 섹션 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 48 }}>
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: 14,
              paddingHorizontal: 16,
            }}
          >
            <View style={{ paddingVertical: 14 }}>
              <Text style={{ fontSize: 13, color: colors.textTertiary }}>계정</Text>
              <Text style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>
                {user?.email || user?.user_metadata?.full_name || user?.user_metadata?.name || "-"}
              </Text>
            </View>
            <View style={{ height: 0.5, backgroundColor: colors.border }} />
            <TouchableOpacity
              onPress={handleSignOut}
              activeOpacity={0.7}
              style={{ paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 15, color: "#EF4444" }}>로그아웃</Text>
            </TouchableOpacity>
            <View style={{ height: 0.5, backgroundColor: colors.border }} />
            <TouchableOpacity
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              style={{ paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 15, color: colors.textTertiary }}>회원 탈퇴</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
