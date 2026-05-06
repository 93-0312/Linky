/**
 * lib/claude.ts 테스트
 *
 * 전략:
 * - OPENROUTER_API_KEY는 모듈 로드 시점에 process.env에서 읽히므로,
 *   jest.resetModules() + require()로 매 테스트마다 새로 로드한다.
 * - fetch는 global.fetch를 jest.fn()으로 교체해 실제 네트워크를 차단한다.
 */

import type { AIProcessResult, DerivedIdea, DrillDownResult } from "../../types";

// ─── 타입 보조 ────────────────────────────────────────────────────────────────

type ClaudeModule = {
  processIdea: (text: string) => Promise<AIProcessResult>;
  drillDownIdea: (idea: DerivedIdea, rawContent: string) => Promise<DrillDownResult>;
};

// ─── 픽스처 ───────────────────────────────────────────────────────────────────

const VALID_AI_RESULT: AIProcessResult = {
  suggestedCategoryName: "초안",
  contentType: "idea",
  summary: "테스트 아이디어",
  tags: ["테스트", "AI"],
  derivedIdeas: [
    { context: "맥락1", target: "타겟1", expectedTitle: "제목1" },
    { context: "맥락2", target: "타겟2", expectedTitle: "제목2" },
    { context: "맥락3", target: "타겟3", expectedTitle: "제목3" },
  ],
  titleOptions: [
    { formula: "숫자+행동+결과", title: "제목A" },
    { formula: "역발상", title: "제목B" },
    { formula: "타겟호명", title: "제목C" },
  ],
};

const VALID_DRILL_RESULT: DrillDownResult = {
  openingHook: "훅 문장",
  outline: ["1단계", "2단계", "3단계"],
  thumbnailConcept: "썸네일 컨셉",
  cta: "CTA 문구",
};

const MOCK_IDEA: DerivedIdea = {
  context: "테스트 맥락",
  target: "테스트 타겟",
  expectedTitle: "테스트 제목",
};

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

/** 지정한 API 키로 module을 새로 로드한다. 키 생략 시 no-key 상태. */
function loadModule(apiKey?: string): ClaudeModule {
  if (apiKey !== undefined) {
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY = apiKey;
  } else {
    delete process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  }
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("../../lib/claude") as ClaudeModule;
}

function mockFetchOk(body: unknown): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  });
}

function mockFetchError(status: number, text: string): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => text,
  });
}

function apiResponse(content: string) {
  return { choices: [{ message: { content } }] };
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe("lib/claude", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // processIdea
  // ══════════════════════════════════════════════════════════════════════════

  describe("processIdea", () => {
    // ── Mock 모드 (API 키 없음) ────────────────────────────────────────────

    describe("API 키 없음 → Mock 모드", () => {
      it("fetch를 호출하지 않는다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("브이로그 아이디어");
        jest.advanceTimersByTime(1500);
        await p;

        expect(global.fetch).not.toHaveBeenCalled();
        jest.useRealTimers();
      });

      it("AIProcessResult 필드를 모두 반환한다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("루틴 영상");
        jest.advanceTimersByTime(1500);
        const result = await p;

        expect(result).toHaveProperty("suggestedCategoryName");
        expect(result).toHaveProperty("contentType");
        expect(result).toHaveProperty("summary");
        expect(result).toHaveProperty("tags");
        expect(result).toHaveProperty("derivedIdeas");
        expect(result).toHaveProperty("titleOptions");
        jest.useRealTimers();
      });

      it("derivedIdeas는 정확히 3개이다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("마케팅 콘텐츠");
        jest.advanceTimersByTime(1500);
        const result = await p;

        expect(result.derivedIdeas).toHaveLength(3);
        jest.useRealTimers();
      });

      it("각 derivedIdea는 context, target, expectedTitle 필드를 가진다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("AI 활용법");
        jest.advanceTimersByTime(1500);
        const result = await p;

        for (const idea of result.derivedIdeas) {
          expect(idea).toHaveProperty("context");
          expect(idea).toHaveProperty("target");
          expect(idea).toHaveProperty("expectedTitle");
        }
        jest.useRealTimers();
      });

      it("titleOptions는 정확히 3개이다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("레시피 영상");
        jest.advanceTimersByTime(1500);
        const result = await p;

        expect(result.titleOptions).toHaveLength(3);
        jest.useRealTimers();
      });

      it("각 titleOption은 formula, title 필드를 가진다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("여행 브이로그");
        jest.advanceTimersByTime(1500);
        const result = await p;

        for (const opt of result.titleOptions) {
          expect(opt).toHaveProperty("formula");
          expect(opt).toHaveProperty("title");
        }
        jest.useRealTimers();
      });

      it("tags는 최대 6개이다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("브이로그 #태그1 #태그2 #태그3 #태그4 #태그5 #태그6 #태그7");
        jest.advanceTimersByTime(1500);
        const result = await p;

        expect(result.tags.length).toBeLessThanOrEqual(6);
        jest.useRealTimers();
      });

      it("contentType은 유효한 값 중 하나이다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("스크립트 작성 아이디어");
        jest.advanceTimersByTime(1500);
        const result = await p;

        expect(["idea", "script", "reference", "hook"]).toContain(result.contentType);
        jest.useRealTimers();
      });

      it("'스크립트' 포함 텍스트는 contentType이 script이다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("스크립트 써줘");
        jest.advanceTimersByTime(1500);
        const result = await p;

        expect(result.contentType).toBe("script");
        jest.useRealTimers();
      });

      it("'레퍼런스' 포함 텍스트는 contentType이 reference이다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("레퍼런스 모음");
        jest.advanceTimersByTime(1500);
        const result = await p;

        expect(result.contentType).toBe("reference");
        jest.useRealTimers();
      });

      it("summary는 20자 이내이다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("이것은 매우 긴 텍스트로 아이디어를 표현한 것입니다 요약이 잘 되어야 합니다");
        jest.advanceTimersByTime(1500);
        const result = await p;

        // summary 자체가 20자 + "…" 처리되어 21자까지 가능
        expect(result.summary.replace("…", "").length).toBeLessThanOrEqual(20);
        jest.useRealTimers();
      });

      it("빈 텍스트 입력 시 summary가 '빈 메모'이다", async () => {
        jest.useFakeTimers();
        const { processIdea } = loadModule();

        const p = processIdea("");
        jest.advanceTimersByTime(1500);
        const result = await p;

        expect(result.summary).toBe("빈 메모");
        jest.useRealTimers();
      });
    });

    // ── OpenRouter 호출 (API 키 있음) ─────────────────────────────────────

    describe("API 키 있음 → OpenRouter 호출", () => {
      it("올바른 URL로 POST 요청을 보낸다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_AI_RESULT)));
        const { processIdea } = loadModule("sk-test-key");

        await processIdea("테스트");

        expect(global.fetch).toHaveBeenCalledWith(
          "https://openrouter.ai/api/v1/chat/completions",
          expect.objectContaining({ method: "POST" }),
        );
      });

      it("Authorization 헤더에 Bearer 토큰을 포함한다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_AI_RESULT)));
        const { processIdea } = loadModule("sk-test-key");

        await processIdea("테스트");

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        expect(init.headers).toMatchObject({
          Authorization: "Bearer sk-test-key",
          "Content-Type": "application/json",
        });
      });

      it("요청 body에 model, max_tokens 800, response_format이 포함된다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_AI_RESULT)));
        const { processIdea } = loadModule("sk-test-key");

        await processIdea("테스트");

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(init.body as string);
        expect(body).toHaveProperty("model");
        expect(body.max_tokens).toBe(800);
        expect(body.response_format).toEqual({ type: "json_object" });
      });

      it("messages 배열이 system + user 순서로 구성된다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_AI_RESULT)));
        const { processIdea } = loadModule("sk-test-key");

        await processIdea("내 아이디어 내용");

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(init.body as string);
        expect(body.messages).toHaveLength(2);
        expect(body.messages[0].role).toBe("system");
        expect(body.messages[1].role).toBe("user");
        expect(body.messages[1].content).toBe("내 아이디어 내용");
      });

      it("정상 응답을 파싱하여 AIProcessResult를 반환한다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_AI_RESULT)));
        const { processIdea } = loadModule("sk-test-key");

        const result = await processIdea("테스트");

        expect(result).toEqual(VALID_AI_RESULT);
      });

      it("```json 코드펜스로 감싼 응답도 정상 파싱한다", async () => {
        const fenced = "```json\n" + JSON.stringify(VALID_AI_RESULT) + "\n```";
        mockFetchOk(apiResponse(fenced));
        const { processIdea } = loadModule("sk-test-key");

        const result = await processIdea("테스트");

        expect(result.suggestedCategoryName).toBe("초안");
        expect(result.derivedIdeas).toHaveLength(3);
      });

      it("``` 코드펜스(언어 없음)로 감싼 응답도 정상 파싱한다", async () => {
        const fenced = "```\n" + JSON.stringify(VALID_AI_RESULT) + "\n```";
        mockFetchOk(apiResponse(fenced));
        const { processIdea } = loadModule("sk-test-key");

        const result = await processIdea("테스트");

        expect(result.contentType).toBe("idea");
      });

      it("HTTP 4xx 오류 시 'OpenRouter {status}' 메시지로 throw한다", async () => {
        mockFetchError(401, "Unauthorized");
        const { processIdea } = loadModule("invalid-key");

        await expect(processIdea("테스트")).rejects.toThrow("OpenRouter 401");
      });

      it("HTTP 5xx 오류 시 에러를 throw한다", async () => {
        mockFetchError(500, "Internal Server Error");
        const { processIdea } = loadModule("sk-test-key");

        await expect(processIdea("테스트")).rejects.toThrow("OpenRouter 500");
      });

      it("content가 빈 문자열이면 '빈 응답' 에러를 throw한다", async () => {
        mockFetchOk(apiResponse(""));
        const { processIdea } = loadModule("sk-test-key");

        await expect(processIdea("테스트")).rejects.toThrow("OpenRouter: 빈 응답");
      });

      it("choices 배열이 비어있으면 '빈 응답' 에러를 throw한다", async () => {
        mockFetchOk({ choices: [] });
        const { processIdea } = loadModule("sk-test-key");

        await expect(processIdea("테스트")).rejects.toThrow("OpenRouter: 빈 응답");
      });

      it("네트워크 오류(fetch reject) 시 에러를 전파한다", async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));
        const { processIdea } = loadModule("sk-test-key");

        await expect(processIdea("테스트")).rejects.toThrow("Network Error");
      });

      it("JSON 파싱 불가 응답이면 SyntaxError를 throw한다", async () => {
        mockFetchOk(apiResponse("not valid json {{"));
        const { processIdea } = loadModule("sk-test-key");

        await expect(processIdea("테스트")).rejects.toThrow(SyntaxError);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // drillDownIdea
  // ══════════════════════════════════════════════════════════════════════════

  describe("drillDownIdea", () => {
    // ── Mock 모드 ──────────────────────────────────────────────────────────

    describe("API 키 없음 → Mock 모드", () => {
      it("fetch를 호출하지 않는다", async () => {
        jest.useFakeTimers();
        const { drillDownIdea } = loadModule();

        const p = drillDownIdea(MOCK_IDEA, "원본 내용");
        jest.advanceTimersByTime(1000);
        await p;

        expect(global.fetch).not.toHaveBeenCalled();
        jest.useRealTimers();
      });

      it("DrillDownResult 필드를 모두 반환한다", async () => {
        jest.useFakeTimers();
        const { drillDownIdea } = loadModule();

        const p = drillDownIdea(MOCK_IDEA, "원본");
        jest.advanceTimersByTime(1000);
        const result = await p;

        expect(result).toHaveProperty("openingHook");
        expect(result).toHaveProperty("outline");
        expect(result).toHaveProperty("thumbnailConcept");
        expect(result).toHaveProperty("cta");
        jest.useRealTimers();
      });

      it("outline은 비어있지 않은 배열이다", async () => {
        jest.useFakeTimers();
        const { drillDownIdea } = loadModule();

        const p = drillDownIdea(MOCK_IDEA, "원본");
        jest.advanceTimersByTime(1000);
        const result = await p;

        expect(Array.isArray(result.outline)).toBe(true);
        expect(result.outline.length).toBeGreaterThan(0);
        jest.useRealTimers();
      });

      it("mock openingHook은 idea.expectedTitle을 포함한다", async () => {
        jest.useFakeTimers();
        const { drillDownIdea } = loadModule();

        const p = drillDownIdea(MOCK_IDEA, "원본");
        jest.advanceTimersByTime(1000);
        const result = await p;

        expect(result.openingHook).toContain(MOCK_IDEA.expectedTitle);
        jest.useRealTimers();
      });
    });

    // ── OpenRouter 호출 ────────────────────────────────────────────────────

    describe("API 키 있음 → OpenRouter 호출", () => {
      it("올바른 URL로 POST 요청을 보낸다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_DRILL_RESULT)));
        const { drillDownIdea } = loadModule("sk-test-key");

        await drillDownIdea(MOCK_IDEA, "원본");

        expect(global.fetch).toHaveBeenCalledWith(
          "https://openrouter.ai/api/v1/chat/completions",
          expect.objectContaining({ method: "POST" }),
        );
      });

      it("요청 body에 max_tokens 500이 포함된다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_DRILL_RESULT)));
        const { drillDownIdea } = loadModule("sk-test-key");

        await drillDownIdea(MOCK_IDEA, "원본");

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(init.body as string);
        expect(body.max_tokens).toBe(500);
      });

      it("user 메시지에 원본 메모 내용이 포함된다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_DRILL_RESULT)));
        const { drillDownIdea } = loadModule("sk-test-key");

        await drillDownIdea(MOCK_IDEA, "원본 텍스트 내용");

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(init.body as string);
        const userMsg: string = body.messages[1].content;
        expect(userMsg).toContain("원본 텍스트 내용");
      });

      it("user 메시지에 idea의 context, target, expectedTitle이 포함된다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_DRILL_RESULT)));
        const { drillDownIdea } = loadModule("sk-test-key");

        await drillDownIdea(MOCK_IDEA, "원본");

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(init.body as string);
        const userMsg: string = body.messages[1].content;
        expect(userMsg).toContain(MOCK_IDEA.context);
        expect(userMsg).toContain(MOCK_IDEA.target);
        expect(userMsg).toContain(MOCK_IDEA.expectedTitle);
      });

      it("정상 응답을 파싱하여 DrillDownResult를 반환한다", async () => {
        mockFetchOk(apiResponse(JSON.stringify(VALID_DRILL_RESULT)));
        const { drillDownIdea } = loadModule("sk-test-key");

        const result = await drillDownIdea(MOCK_IDEA, "원본");

        expect(result).toEqual(VALID_DRILL_RESULT);
      });

      it("HTTP 오류(429 Rate Limit) 시 'OpenRouter 429' 에러를 throw한다", async () => {
        mockFetchError(429, "Rate Limited");
        const { drillDownIdea } = loadModule("sk-test-key");

        await expect(drillDownIdea(MOCK_IDEA, "원본")).rejects.toThrow("OpenRouter 429");
      });

      it("content가 빈 문자열이면 '빈 응답' 에러를 throw한다", async () => {
        mockFetchOk(apiResponse(""));
        const { drillDownIdea } = loadModule("sk-test-key");

        await expect(drillDownIdea(MOCK_IDEA, "원본")).rejects.toThrow("OpenRouter: 빈 응답");
      });

      it("네트워크 오류 시 에러를 전파한다", async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("fetch failed"));
        const { drillDownIdea } = loadModule("sk-test-key");

        await expect(drillDownIdea(MOCK_IDEA, "원본")).rejects.toThrow("fetch failed");
      });
    });
  });
});
