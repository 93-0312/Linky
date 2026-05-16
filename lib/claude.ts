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

// 플랫폼별 도달률 최적화 가이드
const PLATFORM_GUIDES: Record<string, string> = {
  유튜브: `[유튜브 최적화]
- 제목: 40-60자, 검색 키워드를 앞에 배치, 숫자/비교/질문형 우선
- 타겟: 검색 의도 기반으로 구체적으로 (예: "독립 1년차 직장인")
- 공식 우선순위: "숫자+행동+결과" > "이유형" > "비교형"
- 썸네일 텍스트 고려: 3-5단어로 임팩트 있게`,

  인스타그램: `[인스타그램 최적화]
- 제목/훅: 1-2줄, 감성적·공감형, 릴스 첫 1초에 끌리는 문구
- 타겟: 감성 소비자, 비주얼 중심 (예: "20대 감성 추구 여성")
- 공식 우선순위: "공감형 한 줄" > "챌린지형" > "감성 서사형"
- 해시태그 연계 키워드를 tags에 반드시 포함`,

  블로그: `[블로그 최적화]
- 제목: 검색 의도 직접 반영, 롱테일 키워드 포함, 50자 내외
- 타겟: 정보 검색·문제 해결 의도 (예: "처음 재테크 시작하는 30대")
- 공식 우선순위: "방법/팁형" > "완전가이드형" > "질문+답변형"
- tags에 검색에 쓰일 SEO 키워드 포함`,

  팟캐스터: `[팟캐스트 최적화]
- 제목: 에피소드 주제 명확, 게스트/화제 인물 언급 시 효과적
- 타겟: 심층 정보 추구, 이동 중 청취자 (예: "커리어 고민 중인 직장인")
- 공식 우선순위: "에피소드 주제형" > "인터뷰형" > "토픽 논쟁형"
- 청각 콘텐츠이므로 시각 요소 제거, 스토리/대화형 구성 유도`,

  틱톡: `[틱톡 최적화]
- 제목/훅: 첫 3초 집중, 짧고 자극적, 반전·충격·챌린지형
- 타겟: Z세대·MZ세대 트렌드 소비자 (예: "트렌드에 민감한 10-20대")
- 공식 우선순위: "챌린지형" > "반전/충격형" > "비교형"
- 트렌드 사운드·밈 연계 가능성을 context에 언급`,

  기타: `[범용 최적화]
- 다양한 플랫폼에 범용적으로 활용 가능한 형식
- 타겟: 핵심 관심사 중심으로 구체화
- 공식: 숫자형/공감형/정보형 균형 있게`,
};

function buildSystemPrompt(platforms: string[]): string {
  const guides = platforms
    .map((p) => PLATFORM_GUIDES[p] ?? PLATFORM_GUIDES["기타"])
    .join("\n\n");

  const platformNames = platforms.join(", ");

  return `당신은 콘텐츠 크리에이터의 아이디어 1단계 적재를 도와주는 AI 비서입니다.
사용자가 던진 거친 아이디어를 받아서, 나중에 2단계(선별)에서 꺼내 쓸 수 있는 매력적인 아이디어들로 변환해주세요.

【활동 플랫폼】: ${platformNames}
아래 플랫폼별 가이드를 반드시 적용하여 각 플랫폼에서 실제 노출과 도달이 극대화되는 제목·타겟·맥락을 생성하세요.

${guides}

다음 JSON만 반환하세요. 다른 텍스트나 마크다운 없이 JSON만 반환하세요:
{
  "suggestedCategoryName": "초안 | 보관함 | 제작중 | 완료 중 가장 적합한 것",
  "contentType": "idea | script | reference | hook 중 하나",
  "summary": "사용자 아이디어 한 줄 요약 (20자 이내)",
  "tags": ["키워드1", "키워드2", "키워드3"],
  "derivedIdeas": [
    {
      "context": "이 아이디어가 통하는 맥락/트렌드 한 줄 (플랫폼 알고리즘 특성 반영)",
      "target": "플랫폼별 정확한 타겟 독자/시청자 (나이·관심사·상황 구체화)",
      "expectedTitle": "해당 플랫폼에서 클릭·노출 극대화 제목"
    }
  ],
  "titleOptions": [
    { "formula": "숫자+행동+결과", "title": "제목 예시" },
    { "formula": "역발상",         "title": "제목 예시" },
    { "formula": "타겟호명",       "title": "제목 예시" }
  ]
}

규칙:
- derivedIdeas는 정확히 3개. 플랫폼이 여러 개면 각 아이디어가 서로 다른 플랫폼 특성을 반영
- 각 derivedIdea는 유머형/감성형/공감형/정보형/도전형 중 서로 다른 타입으로 구성
- 메모의 핵심 장면/소재/반전 포인트를 아이디어 안에 반드시 녹일 것
- tags는 최대 6개, 플랫폼 SEO/해시태그 관점에서 선택
- titleOptions 3개는 위 플랫폼 가이드의 공식 우선순위를 따를 것`;
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

export async function processIdea(
  text: string,
  platforms: string[] = ["기타"],
): Promise<AIProcessResult> {
  if (!OPENROUTER_API_KEY) {
    await new Promise((r) => setTimeout(r, 1200));
    return buildMockResult(text, platforms);
  }
  return callOpenRouter(text, platforms);
}

// ─── OpenRouter 호출 ──────────────────────────────────────────────────────────

async function callOpenRouter(
  text: string,
  platforms: string[],
): Promise<AIProcessResult> {
  const systemPrompt = buildSystemPrompt(platforms);
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
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
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

function buildMockResult(text: string, platforms: string[]): AIProcessResult {
  const keywords = extractKeywords(text);
  const details = extractMemoDetails(text);
  const mainKeyword = keywords[0] ?? details.primary ?? "콘텐츠";
  const primaryPlatform = platforms[0] ?? "기타";

  return {
    suggestedCategoryName: "초안",
    contentType: inferContentType(text),
    summary: buildOriginalSummary(text),
    tags: mergeTags(keywords, details.tags),
    derivedIdeas: buildDerivedIdeasFromMemo({ keyword: mainKeyword, details, platforms }),
    titleOptions: buildTitleOptionsFromMemo({ keyword: mainKeyword, details, platform: primaryPlatform }),
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

// 플랫폼별 타겟/맥락/제목 특성
const PLATFORM_IDEA_TRAITS: Record<
  string,
  { targetSuffix: string; contextPrefix: string; titleStyle: (kw: string, scene: string) => string }
> = {
  유튜브: {
    targetSuffix: " (유튜브 검색 사용자)",
    contextPrefix: "유튜브 검색 알고리즘에 최적화된 ",
    titleStyle: (kw, scene) => `${kw} 완벽 정리 | ${scene} 핵심만 3분 요약`,
  },
  인스타그램: {
    targetSuffix: " (인스타·릴스 팔로워)",
    contextPrefix: "릴스 첫 1초 훅으로 바이럴 가능한 ",
    titleStyle: (kw, scene) => `${scene}에서 ${kw}? 이건 꼭 봐야 해✨`,
  },
  블로그: {
    targetSuffix: " (정보 검색 의도)",
    contextPrefix: "SEO 검색 상위노출 가능한 ",
    titleStyle: (kw, scene) => `${kw} 완전 가이드 | ${scene} 방법 총정리`,
  },
  팟캐스터: {
    targetSuffix: " (이동 중 청취자)",
    contextPrefix: "청각 몰입형 스토리로 구성된 ",
    titleStyle: (kw, scene) => `Ep. ${kw}: ${scene}의 진짜 이야기`,
  },
  틱톡: {
    targetSuffix: " (틱톡 Z세대)",
    contextPrefix: "틱톡 트렌드 챌린지로 바이럴 가능한 ",
    titleStyle: (kw, scene) => `${scene}했다가 이렇게 됨 😱 #${kw}챌린지`,
  },
  기타: {
    targetSuffix: "",
    contextPrefix: "",
    titleStyle: (kw, scene) => `${kw} — ${scene}의 모든 것`,
  },
};

function buildDerivedIdeasFromMemo({
  keyword,
  details,
  platforms,
}: {
  keyword: string;
  details: ReturnType<typeof extractMemoDetails>;
  platforms: string[];
}): DerivedIdea[] {
  const scene = details.scene ?? `${keyword} 관련 장면`;
  const twist = details.twist ? `반전: ${details.twist}` : null;
  const [t1, t2, t3] = pick3DistinctTypes(`${keyword}|${scene}|${twist ?? ""}`);

  // 플랫폼 순환 배정: 아이디어 3개에 플랫폼 특성 분배
  const p0 = PLATFORM_IDEA_TRAITS[platforms[0]] ?? PLATFORM_IDEA_TRAITS["기타"];
  const p1 = PLATFORM_IDEA_TRAITS[platforms[1] ?? platforms[0]] ?? p0;
  const p2 = PLATFORM_IDEA_TRAITS[platforms[2] ?? platforms[0]] ?? p0;
  const traits = [p0, p1, p2];

  const toIdea = (type: IdeaType, trait: typeof p0): DerivedIdea => {
    switch (type) {
      case "유머형":
        return {
          context: `${trait.contextPrefix}사소한 ${keyword} 순간을 웃기게 뒤집는 포맷 (${scene})`,
          target: `짧게 웃고 넘길 콘텐츠를 찾는 사람${trait.targetSuffix}`,
          expectedTitle: twist
            ? `${scene}… 근데 ${details.twist}`
            : `${scene}에서 나만 이러는 거야?`,
        };
      case "감성형":
        return {
          context: `${trait.contextPrefix}한 장면으로 감정을 끌어올리는 내레이션 중심 (${scene})`,
          target: `잔잔한 몰입/공감형 콘텐츠를 좋아하는 사람${trait.targetSuffix}`,
          expectedTitle: trait.titleStyle(keyword, scene),
        };
      case "공감형":
        return {
          context: `${trait.contextPrefix}다들 겪는 상황을 정확히 찌르는 공감 포인트 (${scene})`,
          target: `일상 공감 콘텐츠를 즐기는 사람${trait.targetSuffix}`,
          expectedTitle: `${keyword} 할 때 꼭 나오는 그 상황`,
        };
      case "정보형":
        return {
          context: `${trait.contextPrefix}장면 속 문제를 해결하는 정보/팁으로 전환 (${scene})`,
          target: `${keyword}을(를) 더 잘하고 싶은 입문자${trait.targetSuffix}`,
          expectedTitle: `${keyword} 초보가 ${scene}에서 바로 쓰는 3가지 팁`,
        };
      case "도전형":
        return {
          context: `${trait.contextPrefix}짧은 기간 미션으로 참여 유도 (${scene})`,
          target: `챌린지/습관 만들기에 관심 있는 사람${trait.targetSuffix}`,
          expectedTitle: `${keyword} 7일 챌린지: ${scene}부터 바꿔보기`,
        };
    }
  };

  return [toIdea(t1, traits[0]), toIdea(t2, traits[1]), toIdea(t3, traits[2])];
}

const PLATFORM_TITLE_FORMULAS: Record<
  string,
  (kw: string, scene: string, hook: string) => TitleOption[]
> = {
  유튜브: (kw, scene, hook) => [
    { formula: "숫자+행동+결과", title: `${kw} 7일 실험 결과 | 바뀐 것 3가지` },
    { formula: "검색의도형", title: `${kw} 하는 방법 | ${scene} 완전 정복` },
    { formula: "비교형", title: `${kw} 잘하는 사람 vs 못하는 사람 | ${hook}` },
  ],
  인스타그램: (kw, scene, hook) => [
    { formula: "감성 한 줄", title: `${scene}에서 ${kw}를 시작했더니 ✨` },
    { formula: "챌린지형", title: `${kw} 7일 챌린지 도전 🔥 #${kw}챌린지` },
    { formula: "공감형", title: `${kw} 할 때 이런 거 나만 느끼는 거야? 🥹` },
  ],
  블로그: (kw, scene, hook) => [
    { formula: "완전가이드형", title: `${kw} 완벽 정리 | ${scene} A to Z 가이드` },
    { formula: "질문+답변형", title: `${kw}를 시작해야 할까요? ${hook}` },
    { formula: "숫자+팁형", title: `${kw} 초보라면 꼭 알아야 할 7가지` },
  ],
  팟캐스터: (kw, scene, hook) => [
    { formula: "에피소드형", title: `Ep. ${kw}: ${scene}의 솔직한 이야기` },
    { formula: "질문형", title: `우리는 왜 ${kw}를 어렵게 생각할까? | ${hook}` },
    { formula: "인터뷰형", title: `${kw} 전문가에게 직접 물어봤습니다` },
  ],
  틱톡: (kw, scene, hook) => [
    { formula: "반전형", title: `${scene}했다가 이렇게 됨 😱` },
    { formula: "챌린지형", title: `${kw} 챌린지 해봤는데 결과가 ㄷㄷ #${kw}` },
    { formula: "훅형", title: `${kw} 안 하면 손해라고? | ${hook}` },
  ],
  기타: (kw, scene, hook) => [
    { formula: "숫자+행동+결과", title: `${kw} 7일 해보고 바뀐 것 3가지` },
    { formula: "역발상", title: `${scene}에서 ${kw}를 '반대로' 해봤더니…` },
    { formula: "타겟호명", title: `${kw} 하다가 ${hook} 경험 있는 사람?` },
  ],
};

function buildTitleOptionsFromMemo({
  keyword,
  details,
  platform,
}: {
  keyword: string;
  details: ReturnType<typeof extractMemoDetails>;
  platform: string;
}): TitleOption[] {
  const scene = details.scene ?? keyword;
  const hook = details.twist ? `근데 ${details.twist}` : "결과가 의외였다";
  const formulaFn =
    PLATFORM_TITLE_FORMULAS[platform] ?? PLATFORM_TITLE_FORMULAS["기타"];
  return formulaFn(keyword, scene, hook);
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
