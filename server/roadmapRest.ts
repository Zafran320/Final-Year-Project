import type { Express, Request, Response } from "express";
import { generateRoadmapInputSchema, generateRoadmapMatrix } from "./roadmapService";
import { sdk } from "./_core/sdk";
import { getLatestInterviewSessionByUserId } from "./db";

export function registerRoadmapRestRoutes(app: Express) {
  /**
   * POST /api/generate-roadmap
   * Direct REST endpoint for generating 10-level mock interview progression matrix.
   */
  app.post("/api/generate-roadmap", async (req: Request, res: Response) => {
    try {
      let userId = 1; // Default fallback guest/demo ID
      try {
        const user = await sdk.authenticateRequest(req);
        if (user?.id) userId = user.id;
      } catch {}

      const parsed = generateRoadmapInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request payload",
          details: parsed.error.issues,
        });
      }

      const result = await generateRoadmapMatrix(userId, parsed.data);
      return res.status(200).json(result);
    } catch (err) {
      console.error("[REST API] Error in /api/generate-roadmap:", err);
      return res.status(500).json({
        error: "Failed to generate interview roadmap",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * GET /api/interview-sessions/latest
   * Fetch the active or most recently generated interview session.
   */
  app.get("/api/interview-sessions/latest", async (req: Request, res: Response) => {
    try {
      let userId = 1;
      try {
        const user = await sdk.authenticateRequest(req);
        if (user?.id) userId = user.id;
      } catch {}

      const session = await getLatestInterviewSessionByUserId(userId);
      if (!session) {
        return res.status(404).json({ error: "No interview session found" });
      }

      let levels = [];
      try {
        levels = JSON.parse(session.levels);
      } catch {}

      return res.status(200).json({
        id: session.id,
        companyName: session.companyName,
        targetRole: session.targetRole,
        jobDescription: session.jobDescription,
        currentLevel: session.currentLevel,
        status: session.status,
        levels,
        createdAt: session.createdAt,
      });
    } catch (err) {
      console.error("[REST API] Error in /api/interview-sessions/latest:", err);
      return res.status(500).json({
        error: "Failed to fetch latest interview session",
      });
    }
  });
}
