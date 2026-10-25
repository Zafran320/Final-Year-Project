import { describe, it, expect } from "vitest";
import {
  STAGE_CURRICULUM_DETAILS,
  generateModelAnswerAndBreakdown,
} from "./practicePreparation";

describe("PracticePreparation Diagnostic & Model Answers Engine", () => {
  it("defines comprehensive 10-stage curriculum with goals and evaluated objectives", () => {
    expect(Object.keys(STAGE_CURRICULUM_DETAILS).length).toBe(10);

    for (let i = 1; i <= 10; i++) {
      const stage = STAGE_CURRICULUM_DETAILS[i];
      expect(stage).toBeDefined();
      expect(stage.title).toBeTruthy();
      expect(stage.focus).toBeTruthy();
      expect(stage.purpose).toBeTruthy();
      expect(stage.objectives.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("generates structured STAR model answer for behavioral questions", () => {
    const question = "Tell me about a time you faced a difficult conflict in your team.";
    const answer = "We had an argument about architecture and then we resolved it by talking.";
    const result = generateModelAnswerAndBreakdown(
      question,
      answer,
      "Conflict Resolution",
      "Senior Software Engineer",
      0,
      { eyeContact: 85, confidence: 80, communicationClarity: 82, fillerCount: 1, wpm: 130 }
    );

    expect(result.grade).toBeDefined();
    expect(result.idealModelAnswer).toContain("STAR Model Answer");
    expect(result.idealModelAnswer).toContain("Situation:");
    expect(result.idealModelAnswer).toContain("Task:");
    expect(result.idealModelAnswer).toContain("Action:");
    expect(result.idealModelAnswer).toContain("Result:");
    expect(result.whatWasMissing).toBeTruthy();
    expect(result.deliveryFeedback).toMatch(/eye contact/i);
  });

  it("generates technical model answer with architectural trade-offs for technical questions", () => {
    const question = "How do you optimize slow database queries and manage indexing strategies?";
    const answer = "I look at slow queries and add indexes on foreign keys.";
    const result = generateModelAnswerAndBreakdown(
      question,
      answer,
      "Database Scalability",
      "Backend Engineer",
      1,
      { eyeContact: 55, confidence: 70, communicationClarity: 65, fillerCount: 6, wpm: 175 }
    );

    expect(result.idealModelAnswer).toContain("Model Engineering Answer");
    expect(result.idealModelAnswer).toContain("Architectural Trade-offs");
    expect(result.idealModelAnswer).toContain("Production Considerations");
    expect(result.deliveryFeedback).toContain("Eye contact was low");
    expect(result.deliveryFeedback).toContain("filler words");
  });
});
