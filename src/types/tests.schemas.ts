import { z } from "zod";

// Query parameters for GET /tests
export const testsQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(50, "q must be less than 50 characters")
      .optional(),
    playingTime: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine(
        (val) => val === undefined || val > 0,
        "Playing time must be positive"
      ),
    recoveryTime: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine(
        (val) => val === undefined || val > 0,
        "Recovery time must be positive"
      ),
    dateFrom: z
      .string()
      .optional()
      .refine(
        (date) => !date || !isNaN(Date.parse(date)),
        "Invalid date format for dateFrom"
      ),
    dateTo: z
      .string()
      .optional()
      .refine(
        (date) => !date || !isNaN(Date.parse(date)),
        "Invalid date format for dateTo"
      ),
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

// Route parameters for GET /tests/:id
export const testsParamsSchema = z.object({
  id: z.uuid("Invalid test ID format"),
});

// Create test schema for POST /tests
export const testsCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255, "Name is too long"),
    playingTime: z
      .number()
      .int("Playing time must be an integer")
      .min(1, "Playing time must be at least 1 minute")
      .max(300, "Playing time cannot exceed 300 minutes"),
    recoveryTime: z
      .number()
      .int("Recovery time must be an integer")
      .min(0, "Recovery time cannot be negative")
      .max(300, "Recovery time cannot exceed 300 minutes"),
    dateConducted: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
    description: z
      .string()
      .max(1000, "Description cannot exceed 1000 characters")
      .optional(),
  })
  .strict();

// Update test schema for PATCH /tests/:id
export const testsUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(255, "Name is too long")
      .optional(),
    playingTime: z
      .number()
      .int("Playing time must be an integer")
      .min(1, "Playing time must be at least 1 minute")
      .max(300, "Playing time cannot exceed 300 minutes")
      .optional(),
    recoveryTime: z
      .number()
      .int("Recovery time must be an integer")
      .min(0, "Recovery time cannot be negative")
      .max(300, "Recovery time cannot exceed 300 minutes")
      .optional(),
    dateConducted: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
      .optional(),
    description: z
      .string()
      .max(1000, "Description cannot exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update"
  )
  .strict();

// Inferred TypeScript types
export type TestsQuery = z.infer<typeof testsQuerySchema>;
export type TestsParams = z.infer<typeof testsParamsSchema>;
export type TestsCreate = z.infer<typeof testsCreateSchema>;
export type TestsUpdate = z.infer<typeof testsUpdateSchema>;
