import {
  AIProcessResult,
  ContentType,
  DerivedIdea,
  DrillDownResult,
  TitleOption,
} from "../types";

// ─── OpenRouter 설정 ──────────────────────────────────────────────────────────
//
// TODO: 오픈라우터 결제 후 .env 파일에 아래 키를 추가하세요:
//   EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
//
// 모델 변경은 MODEL 상수만 바꾸면 됩니다. (https://openrouter.ai/models)
// 추천: "anthropic/claude-sonnet-4-5" / "anthropic/claude-haiku-4-5" (저렴)
//
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? "";
const MODEL = "openai/gpt-5.3-chat";

// ─── 시스템 프롬프트 ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 콘텐츠 크리에이터의 아이디어 1단계 적재를 도와주는 AI 비서입니다.
사용자가 던진 거친 아이디어를 받아서, 나중에 2단계(선별)에서 꺼내 쓸 수 있는 매력적인 아이디어들로 변환해주세요.

다음 JSON만 반환하세요. 다른 텍스트나 마크다운 없이 JSON만 반환하세요:
{
  "suggestedCategoryName": "초안 | 보관함 | 제작중 | 완료 중 가장 적합한 것",
  "contentType": "idea | script | reference | hook 중 하나",
  "summary": "사용자 아이디어 한 줄 요약 (20자 이내)",
  "tags": ["키워드1", "키워드2", "키워드3"],
  "derivedIdeas": [
    {
      "context": "이 아이디어가 통하는 맥락/트렌드 한 줄",
      "target": "정확한 타겟 독자/시청자",
      "expectedTitle": "클릭 유도형 예상 제목"
    }
  ],
  "titleOptions": [
    { "formula": "숫자+행동+결과", "title": "제목 예시" },
    { "formula": "역발상",         "title": "제목 예시" },
    { "formula": "타겟호명",       "title": "제목 예시" }
  ]
}

규칙:
- derivedIdeas는 정확히 3개. 각각 유머형/감성형/공감형/정보형/도전형 중 서로 다른 타입으로 구성
- 메모의 핵심 장면/소재/반전 포인트를 아이디어 안에 반드시 녹일 것
- tags는 최대 6개
- 플랫폼 언급 있으면 해당 플랫폼 포맷 고려, 없으면 범용으로`;

// ─── 공개 API ─────────────────────────────────────────────────────────────────

export async function processIdea(text: string): Promise<AIProcessResult> {
  if (!OPENROUTER_API_KEY) {
    // API 키 미설정 시 mock으로 동작 (개발/테스트용)
    await new Promise((r) => setTimeout(r, 1200));
    return buildMockResult(text);
  }
  return callOpenRouter(text);
}

// ─── OpenRouter 호출 ──────────────────────────────────────────────────────────

async function callOpenRouter(text: string): Promise<AIProcessResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      // TODO: 배포 도메인으로 변경 (오픈라우터 대시보드 통계에 표시됨)
      "HTTP-Referer": "https://linky.app",
      "X-Title": "Linky",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  if (!content) throw new Error("OpenRouter: 빈 응답");

  // 모델에 따라 ```json ... ``` 코드펜스로 감싸서 오는 경우 제거
  const json = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(json) as AIProcessResult;
}

// ─── Mock (API 키 없을 때 폴백) ───────────────────────────────────────────────

function buildMockResult(text: string): AIProcessResult {
  const keywords = extractKeywords(text);
  const details = extractMemoDetails(text);
  const mainKeyword = keywords[0] ?? details.primary ?? "콘텐츠";

  return {
    suggestedCategoryName: "초안",
    contentType: inferContentType(text),
    summary: buildOriginalSummary(text),
    tags: mergeTags(keywords, details.tags),
    derivedIdeas: buildDerivedIdeasFromMemo({ keyword: mainKeyword, details }),
    titleOptions: buildTitleOptionsFromMemo({ keyword: mainKeyword, details }),
  };
}

function inferContentType(text: string): ContentType {
  if (text.includes("스크립트") || text.includes("대본")) return "script";
  if (text.includes("레퍼런스") || text.includes("참고")) return "reference";
  if (text.includes("훅") || text.includes("제목")) return "hook";
  return "idea";
}

function extractKeywords(text: string): string[] {
  const keywordMap: Record<string, string[]> = {
    브이로그: ["브이로그", "일상", "영상"],
    루틴: ["루틴", "자기계발", "습관"],
    AI: ["AI", "인공지능", "기술"],
    마케팅: ["마케팅", "브랜딩", "광고"],
    레시피: ["레시피", "요리", "푸드"],
    여행: ["여행", "여행기", "장소"],
    리뷰: ["리뷰", "후기", "추천"],
  };
  for (const [key, tags] of Object.entries(keywordMap)) {
    if (text.includes(key)) return tags;
  }
  const words = text
    .replace(/[^\w가-힣\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return words.slice(0, 3).length > 0 ? words.slice(0, 3) : ["아이디어"];
}

type IdeaType = "유머형" | "감성형" | "공감형" | "정보형" | "도전형";

function buildOriginalSummary(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "빈 메모";
  const slice = normalized.slice(0, 20);
  return slice + (normalized.length > 20 ? "…" : "");
}

function mergeTags(a: string[], b: string[]): string[] {
  const set = new Set<string>();
  for (const t of a) set.add(t);
  for (const t of b) set.add(t);
  return Array.from(set).slice(0, 6);
}

function extractMemoDetails(text: string): {
  primary: string | null;
  scene: string | null;
  twist: string | null;
  tags: string[];
} {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const hashTags = Array.from(text.matchAll(/#([0-9A-Za-z가-힣_]{1,24})/g))
    .map((m) => m[1])
    .filter(Boolean);

  const titleLine =
    lines
      .find((l) => l.startsWith("제목:"))
      ?.replace(/^제목:\s*/, "")
      .trim() ?? null;
  const memoLine =
    lines
      .find((l) => l.startsWith("메모:"))
      ?.replace(/^메모:\s*/, "")
      .trim() ?? null;

  const primary = titleLine || (memoLine ? memoLine.split(/\s+/)[0] : null);
  const scene = memoLine ? memoLine.slice(0, 48) : (lines[0] ?? null);
  const twist =
    memoLine && memoLine.includes("근데")
      ? memoLine.split("근데").slice(1).join("근데").trim().slice(0, 40)
      : null;

  return {
    primary: primary && primary.length > 0 ? primary : null,
    scene: scene && scene.length > 0 ? scene : null,
    twist: twist && twist.length > 0 ? twist : null,
    tags: hashTags,
  };
}

function pick3DistinctTypes(seedText: string): [IdeaType, IdeaType, IdeaType] {
  const all: IdeaType[] = ["유머형", "감성형", "공감형", "정보형", "도전형"];
  let hash = 0;
  for (let i = 0; i < seedText.length; i++)
    hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
  const start = hash % all.length;
  return [
    all[start],
    all[(start + 2) % all.length],
    all[(start + 4) % all.length],
  ];
}

function buildDerivedIdeasFromMemo({
  keyword,
  details,
}: {
  keyword: string;
  details: ReturnType<typeof extractMemoDetails>;
}): DerivedIdea[] {
  const scene = details.scene ?? `${keyword} 관련 장면`;
  const twist = details.twist ? `반전: ${details.twist}` : null;
  const [t1, t2, t3] = pick3DistinctTypes(`${keyword}|${scene}|${twist ?? ""}`);

  const toIdea = (type: IdeaType): DerivedIdea => {
    switch (type) {
      case "유머형":
        return {
          context: `사소한 ${keyword} 순간을 웃기게 뒤집는 포맷 (${scene})`,
          target: "짧게 웃고 넘길 콘텐츠를 찾는 사람",
          expectedTitle: twist
            ? `${scene}… 근데 ${details.twist}`
            : `${scene}에서 나만 이러는 거야?`,
        };
      case "감성형":
        return {
          context: `한 장면으로 감정을 끌어올리는 내레이션 중심 (${scene})`,
          target: "잔잔한 몰입/공감형 콘텐츠를 좋아하는 사람",
          expectedTitle: `${scene} 그날, 마음이 조용해졌다`,
        };
      case "공감형":
        return {
          context: `다들 겪는 상황을 정확히 찌르는 공감 포인트 (${scene})`,
          target: "일상 공감 밈/릴스를 즐기는 사람",
          expectedTitle: `${keyword} 할 때 꼭 나오는 그 상황`,
        };
      case "정보형":
        return {
          context: `장면 속 문제를 해결하는 정보/팁으로 전환 (${scene})`,
          target: `${keyword}을(를) 더 잘하고 싶은 입문자`,
          expectedTitle: `${keyword} 초보가 ${scene}에서 바로 쓰는 3가지 팁`,
        };
      case "도전형":
        return {
          context: `짧은 기간 미션으로 참여 유도 (${scene})`,
          target: "챌린지/습관 만들기에 관심 있는 사람",
          expectedTitle: `${keyword} 7일 챌린지: ${scene}부터 바꿔보기`,
        };
    }
  };

  return [toIdea(t1), toIdea(t2), toIdea(t3)];
}

function buildTitleOptionsFromMemo({
  keyword,
  details,
}: {
  keyword: string;
  details: ReturnType<typeof extractMemoDetails>;
}): TitleOption[] {
  const scene = details.scene ?? keyword;
  const hook = details.twist ? `근데 ${details.twist}` : "결과가 의외였다";

  return [
    { formula: "숫자+행동+결과", title: `${keyword} 7일 해보고 바뀐 것 3가지` },
    {
      formula: "역발상",
      title: `${scene}에서 ${keyword}를 '반대로' 해봤더니…`,
    },
    { formula: "타겟호명", title: `${keyword} 하다가 ${hook} 경험 있는 사람?` },
  ];
}

// ─── Drill-Down (파생 아이디어 깊게 파고들기) ────────────────────────────────

const DRILL_DOWN_PROMPT = `당신은 콘텐츠 제작 전문 코치입니다.
아래 아이디어를 실제로 제작할 수 있도록 구체적인 제작 가이드를 JSON으로 반환하세요.
다른 텍스트 없이 JSON만 반환하세요:
{
  "openingHook": "첫 3초 안에 시청자/독자를 잡는 훅 문장 (한 줄)",
  "outline": ["1단계 내용", "2단계 내용", "3단계 내용", "4단계 내용"],
  "thumbnailConcept": "썸네일 방향과 텍스트 제안 (한 줄)",
  "cta": "마무리 CTA 제안 (한 줄)"
}
outline은 3~5단계로 구성하세요.`;

export async function drillDownIdea(
  idea: DerivedIdea,
  rawContent: string,
): Promise<DrillDownResult> {
  if (!OPENROUTER_API_KEY) {
    await new Promise((r) => setTimeout(r, 800));
    return {
      openingHook: `"${idea.expectedTitle}" — 이 말 한마디로 시작하세요.`,
      outline: [
        "1단계: 문제 상황 또는 공감 포인트 제시",
        "2단계: 핵심 내용 전달 (3가지 이내)",
        "3단계: 실제 사례나 경험 연결",
        "4단계: 결론 및 시청자 행동 유도",
      ],
      thumbnailConcept: `"${idea.expectedTitle}" + 임팩트 있는 표정 or 장면컷`,
      cta: "댓글로 여러분의 경험도 공유해주세요!",
    };
  }
  return callDrillDownOpenRouter(idea, rawContent);
}

async function callDrillDownOpenRouter(
  idea: DerivedIdea,
  rawContent: string,
): Promise<DrillDownResult> {
  const userMessage = `원본 메모: ${rawContent}\n\n선택한 아이디어:\n- 맥락: ${idea.context}\n- 타겟: ${idea.target}\n- 제목: ${idea.expectedTitle}`;

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
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DRILL_DOWN_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("OpenRouter: 빈 응답");

  const json = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(json) as DrillDownResult;
}
