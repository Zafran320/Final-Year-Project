import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
}));

vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import {
  calculateInterviewAnswerScore,
  evaluateInterviewAnswersWithAI,
} from "./practicePreparation";

const evaluation = {
  technicalAccuracy: 90,
  relevance: 80,
  completeness: 70,
  reasoning: 60,
  communication: 50,
  evidence: "Correctly explained indexing and mentioned query plans.",
  strengths: ["Identified query plans as a diagnostic tool."],
  gaps: ["Did not explain index selectivity."],
  feedback: "The answer is accurate but could better explain index trade-offs.",
  modelAnswer:
    "Inspect the query plan, then add indexes based on query patterns and selectivity.",
};

describe("AI live-interview answer evaluation", () => {
  beforeEach(() => {
    mocks.invokeLLM.mockReset();
  });

  it("calculates the weighted answer score from AI-evaluated dimensions", () => {
    expect(calculateInterviewAnswerScore(evaluation)).toBe(76);
  });

  it("sends each question with its candidate answer and returns validated AI feedback", async () => {
    const result = {
      evaluations: [evaluation, evaluation],
      strengths: ["Used query plans to investigate the issue."],
      improvements: ["Explain how index selectivity affects write cost."],
      aiAdvice:
        "Use a concrete query-plan example and discuss index trade-offs.",
    };
    mocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(result) } }],
    });

    const output = await evaluateInterviewAnswersWithAI({
      questions: [
        "How would you diagnose a slow database query?",
        "What is a covering index?",
      ],
      answers: [
        "I would inspect the query plan.",
        "Spoke verbally via live microphone",
      ],
      stageTitle: "Database Fundamentals",
      stageFocus: "Query performance",
      objectives: ["Explain indexing trade-offs."],
      targetRole: "Backend Engineer",
    });

    expect(output.evaluations[0]).toEqual(evaluation);
    expect(output.evaluations[1]).toMatchObject({
      technicalAccuracy: 0,
      relevance: 0,
      completeness: 0,
      reasoning: 0,
      communication: 0,
      evidence: "No spoken response was recorded for this question.",
      modelAnswer: evaluation.modelAnswer,
    });
    expect(mocks.invokeLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.8-flash",
        response_format: expect.objectContaining({ type: "json_schema" }),
      })
    );
    const prompt = mocks.invokeLLM.mock.calls[0][0].messages[1]
      .content as string;
    expect(prompt).toContain("How would you diagnose a slow database query?");
    expect(prompt).toContain("I would inspect the query plan.");
    expect(prompt).toContain('"answer":""');
  });

  it("rejects malformed structured evaluations instead of returning a heuristic grade", async () => {
    mocks.invokeLLM.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              evaluations: [],
              strengths: [],
              improvements: [],
              aiAdvice: "No evaluation.",
            }),
          },
        },
      ],
    });

    await expect(
      evaluateInterviewAnswersWithAI({
        questions: ["Explain a database index."],
        answers: ["An index helps find rows."],
        stageTitle: "Database Fundamentals",
        stageFocus: "Indexing",
        objectives: ["Explain indexing."],
        targetRole: "Backend Engineer",
      })
    ).rejects.toThrow("did not grade every interview answer");
  });

  it("propagates provider failures so the route cannot silently fall back to word-count grading", async () => {
    mocks.invokeLLM.mockRejectedValue(new Error("Gemini unavailable"));

    await expect(
      evaluateInterviewAnswersWithAI({
        questions: ["Explain a database index."],
        answers: ["An index helps find rows."],
        stageTitle: "Database Fundamentals",
        stageFocus: "Indexing",
        objectives: ["Explain indexing."],
        targetRole: "Backend Engineer",
      })
    ).rejects.toThrow("Gemini unavailable");
  });
});
