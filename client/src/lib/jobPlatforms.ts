import type { JobPlatformSource } from "../../../server/services/careerOpsScraper";

export type { JobPlatformSource };

export const JOB_PLATFORM_LABELS: Record<JobPlatformSource, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  rozee: "Rozee.pk",
  googlejobs: "Google Jobs",
  remotive: "Remotive",
  remoteok: "RemoteOK",
  arbeitnow: "Arbeitnow",
  jobicy: "Jobicy",
  themuse: "The Muse",
  weworkremotely: "We Work Remotely",
};
