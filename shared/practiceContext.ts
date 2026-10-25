export const practiceProfileCategories = [
  {
    id: "career",
    label: "Career direction",
    description: "Current focus, target role, work preferences, and location.",
    fields: ["careerField", "targetRole", "careerStatus", "currentJob", "company", "lookingFor", "location"],
  },
  {
    id: "education",
    label: "Education",
    description: "Education level and degree or program.",
    fields: ["education", "degree"],
  },
  {
    id: "skills-experience",
    label: "Skills and experience",
    description: "Skills, relevant experience, and professional summary.",
    fields: ["skills", "experience", "professionalSummary"],
  },
  {
    id: "projects-links",
    label: "Projects and links",
    description: "Reviewed projects plus portfolio and professional links.",
    fields: ["projects", "portfolioUrl", "linkedinUrl"],
  },
  {
    id: "credentials",
    label: "Credentials",
    description: "Certifications, languages, and verified achievements.",
    fields: ["certifications", "languages", "verifiedDetails"],
  },
] as const;

export type PracticeProfileCategoryId = (typeof practiceProfileCategories)[number]["id"];

export const practiceProfileCategoryIds = practiceProfileCategories.map((category) => category.id) as [
  PracticeProfileCategoryId,
  ...PracticeProfileCategoryId[],
];
