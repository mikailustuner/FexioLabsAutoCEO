import { z } from "zod";

export const NewProjectRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientInfo: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      requirements: z.string().optional(),
    })
    .optional(),
});

export type NewProjectRequest = z.infer<typeof NewProjectRequestSchema>;

export const DailyStandupRequestSchema = z.object({
  date: z.string().datetime().optional(),
});

export type DailyStandupRequest = z.infer<typeof DailyStandupRequestSchema>;

export const WeeklyReportRequestSchema = z.object({
  weekStart: z.string().datetime().optional(),
  weekEnd: z.string().datetime().optional(),
});

export type WeeklyReportRequest = z.infer<typeof WeeklyReportRequestSchema>;

export const ReleasePrepRequestSchema = z.object({
  projectId: z.string(),
  version: z.string(),
});

export type ReleasePrepRequest = z.infer<typeof ReleasePrepRequestSchema>;

