import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const MODEL = "anthropic/claude-haiku-4-5";

Deno.serve(async () => {
  const currentHourKST = ((new Date().getUTCHours() + 9) % 24)
    .toString()
    .padStart(2, "0");

  // 현재 시간(KST)에 알림 설정된 유저만 조회
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, user_name, push_token, whip_level")
    .eq("notification_enabled", true)
    .like("notification_time", `${currentHourKST}:%`)
    .not("push_token", "is", null);

  if (error || !profiles?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const messages: object[] = [];

  for (const profile of profiles) {
    const { data: recentNotes } = await supabase
      .from("notes")
      .select("title, created_at, updated_at")
      .eq("user_id", profile.id)
      .gte("created_at", sevenDaysAgo);

    const { data: staleNotes } = await supabase
      .from("notes")
      .select("title, created_at, updated_at")
      .eq("user_id", profile.id)
      .lt("updated_at", sevenDaysAgo);

    const body = await generateMessage(
      profile.user_name,
      profile.whip_level,
      recentNotes ?? [],
      staleNotes ?? []
    );

    if (body) {
      messages.push({ to: profile.push_token, title: "링키 💡", body });
    }
  }

  if (messages.length > 0) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  }

  return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
});

async function generateMessage(
  userName: string,
  whipLevel: string,
  recentNotes: { title: string }[],
  staleNotes: { title: string }[]
): Promise<string | null> {
  const whipStyle = {
    light: "따뜻하고 부드럽게. 응원하는 말투.",
    normal: "적당히 자극적으로. 동기부여 말투.",
    hard: "강하고 직설적으로. 자극적인 말투.",
  };

  const recentCount = recentNotes.length;
  const staleCount = staleNotes.length;
  const recentTitles = recentNotes.slice(0, 3).map((n) => n.title).join(", ");

  const systemPrompt = `당신은 크리에이터에게 짧은 푸시 알림 메시지를 보내는 AI입니다.
규칙:
1. 최근 7일 새 아이디어가 3개 이상이면 반드시 "SKIP" 한 단어만 출력.
2. 채찍질이 필요한 경우, 한국어 메시지 한 줄만 출력. 절대 설명·분석·줄바꿈 없이.
3. 메시지는 이모지 1개 포함, 공백 포함 30자 이내.
4. "SKIP" 또는 메시지 외에 다른 텍스트는 절대 출력 금지.

예시 출력 형식:
🔥 아이디어 3개가 기다리고 있어요!
💡 오늘 아이디어 하나만 적어볼까요?
📌 방치된 아이디어, 오늘 하나 꺼내봐요`;

  const userPrompt = `크리에이터: ${userName}
최근 7일 새 아이디어: ${recentCount}개${recentCount > 0 ? ` (${recentTitles})` : ""}
방치된 오래된 아이디어: ${staleCount}개
채찍질 강도: ${whipStyle[whipLevel as keyof typeof whipStyle] ?? whipStyle.normal}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://linky.app",
      "X-Title": "Linky",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 60,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content?.trim() ?? "";

  if (!text || text === "SKIP") return null;
  // 혹시 모델이 지시를 어기고 여러 줄 출력한 경우 첫 줄만 사용
  return text.split("\n")[0].trim() || null;
}
