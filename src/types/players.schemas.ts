import { z } from "zod";

// Query parameters for GET /players
export const playersQuerySchema = z.object({
  q: z.string().trim().max(20, "q must be less than 20 characters").optional(),
  gender: z.enum(["male", "female"]).optional(),
  ageGroup: z
    .enum([
      "mini",
      "U-09",
      "U-11",
      "U-13",
      "U-15",
      "U-17",
      "U-19",
      "U-21",
      "Seniors",
    ])
    .optional(),
});

// Route parameters for GET /players/:id
export const playersParamsSchema = z.object({
  id: z.string().uuid("Invalid player ID format"),
});

// Future schemas for CRUD operations
export const playersCreateSchema = z.object({
  name: z.string().min(1).max(100),
  dateOfBirth: z.string().date(),
  gender: z.enum(["male", "female"]),
  // Add other required fields
});

export const playersUpdateSchema = playersCreateSchema.partial();

// Inferred TypeScript types
export type PlayersQuery = z.infer<typeof playersQuerySchema>;
export type PlayersParams = z.infer<typeof playersParamsSchema>;
export type PlayersCreate = z.infer<typeof playersCreateSchema>;
export type PlayersUpdate = z.infer<typeof playersUpdateSchema>;
