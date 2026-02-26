export const JOB_TYPES = ["report.generate"] as const;

export type JobType = (typeof JOB_TYPES)[number];

export function isJobType(v: string): v is JobType {
  return (JOB_TYPES as readonly string[]).includes(v);
}
