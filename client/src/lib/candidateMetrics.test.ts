import { describe, it, expect } from "vitest";
import { CandidateMetricsEngine } from "./candidateMetrics";

describe("CandidateMetricsEngine", () => {
  it("initializes with default metrics when camera is not yet connected", () => {
    const engine = new CandidateMetricsEngine();
    const metrics = engine.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.proctoringStatus).toBe("no_face");
    expect(metrics.fillerCount).toBe(0);
    expect(metrics.faceCount).toBe(0);
    expect(metrics.faceTracked).toBe(false);
    expect(metrics.visionReady).toBe(false);
  });

  it("does not mark the camera absent until the first frame has been analyzed", () => {
    const engine = new CandidateMetricsEngine();
    expect(engine.getMetrics().visionReady).toBe(false);

    engine.processFace({ faceLandmarks: [] });

    expect(engine.getMetrics().visionReady).toBe(true);
    expect(engine.getMetrics().faceTracked).toBe(false);
  });

  it("processes mic levels and calculates mouth movement without camera", () => {
    const engine = new CandidateMetricsEngine();
    engine.onMicLevel(0.85);
    const metrics = engine.getMetrics();
    expect(metrics.mouthMovement).toBe(true);

    engine.onMicLevel(0.01);
    const quietMetrics = engine.getMetrics();
    expect(quietMetrics.mouthMovement).toBe(false);
  });

  it("detects filler words and calculates communication metrics during live speech", () => {
    const engine = new CandidateMetricsEngine();
    engine.setRelevanceContext("React frontend architecture", "Senior Frontend Engineer", "5 years experience with React and TypeScript");
    
    // Simulate candidate speaking with some filler words
    const speech = "Um so basically I implemented a custom React hook to optimize state management and uh reduce re-renders";
    engine.onTranscript(speech);

    const metrics = engine.getMetrics();
    expect(metrics.fillerCount).toBeGreaterThan(0);
    expect(metrics.contentRelevance).toBeGreaterThan(0);
  });

  it("detects stutter patterns and consecutive repeated words", () => {
    const engine = new CandidateMetricsEngine();
    const speechWithStutter = "I think think we should consider using WebSockets";
    engine.onTranscript(speechWithStutter);

    const metrics = engine.getMetrics();
    expect(metrics.stutterCount).toBeGreaterThanOrEqual(1);
  });

  it("handles turn reset cleanly without clearing overall aggregates", () => {
    const engine = new CandidateMetricsEngine();
    engine.onTranscript("Um well definitely");
    expect(engine.getMetrics().fillerCount).toBeGreaterThan(0);

    engine.resetTurnTranscript();
    // After reset, turn transcript is reset but engine continues functioning
    engine.onTranscript("Clear concise answer regarding system design");
    const metrics = engine.getMetrics();
    expect(metrics.fillerCount).toBeGreaterThan(0);
  });

  it("allows starting and stopping vision without disrupting audio engine", () => {
    const engine = new CandidateMetricsEngine();
    engine.stopVision();

    // Audio still tracks
    engine.onMicLevel(0.6);
    expect(engine.getMetrics().mouthMovement).toBe(true);

    engine.destroy();
  });
});
