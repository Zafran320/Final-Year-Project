import { analyzeCompanyPreparation, companyPreparationInput } from "../server/companyPreparation.ts";

const input = companyPreparationInput.parse({
  companyName: "Example Company",
  companyWebsite: "https://example.com",
  targetRole: "Frontend Engineer",
  jobDescription: "Build accessible, reliable web interfaces with a product team.",
  profileCategoryIds: [],
  links: [],
  files: [],
});

try {
  const result = await analyzeCompanyPreparation(input, null);
  console.log(JSON.stringify({
    ok: true,
    sourceStatuses: result.sources.map(({ label, kind, status }) => ({ label, kind, status })),
    includedAccountCategories: result.accountContext.includedCategoryIds,
    includedAccountFieldCount: result.accountContext.includedFieldCount,
    connectorContextIncluded: result.accountContext.connectorContextIncluded,
    resultCounts: {
      responsibilities: result.brief.responsibilities.length,
      requiredSkills: result.brief.requiredSkills.length,
      interviewThemes: result.brief.interviewThemes.length,
      uncertaintyNotes: result.brief.uncertaintyNotes.length,
    },
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
}
