import { z } from "zod";

// Query parameters for GET /players
export const playersQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(20, "q must be less than 20 characters")
      .optional(),
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
    preferredHand: z.enum(["left", "right", "both"]).optional(),
    // Pagination parameters
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val >= 1, "Page must be greater than 0"),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine(
        (val) => val >= 1 && val <= 100,
        "Limit must be between 1 and 100"
      ),
  })
  .strict();

// Route parameters for GET /players/:id
export const playersParamsSchema = z.object({
  id: z.uuid("Invalid player ID format"),
});

// Create player schema for POST /players
export const playersCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255, "Name is too long"),
    dateOfBirth: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
      .refine(
        (date) => new Date(date) <= new Date(),
        "Date of birth cannot be in the future"
      ),
    gender: z.enum(["male", "female"], {
      message: "Gender must be male or female",
    }),
    preferredHand: z.enum(["left", "right", "both"], {
      message: "Preferred hand must be left, right, or both",
    }),
  })
  .strict();

// Update player schema for PATCH /players/:id
export const playersUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(255, "Name is too long")
      .optional(),
    dateOfBirth: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
      .refine(
        (date) => new Date(date) <= new Date(),
        "Date of birth cannot be in the future"
      )
      .optional(),
    gender: z
      .enum(["male", "female"], { message: "Gender must be male or female" })
      .optional(),
    preferredHand: z
      .enum(["left", "right", "both"], {
        message: "Preferred hand must be left, right, or both",
      })
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update"
  )
  .strict();

// Inferred TypeScript types
export type PlayersQuery = z.infer<typeof playersQuerySchema>;
export type PlayersParams = z.infer<typeof playersParamsSchema>;
export type PlayersCreate = z.infer<typeof playersCreateSchema>;
export type PlayersUpdate = z.infer<typeof playersUpdateSchema>;
