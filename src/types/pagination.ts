import { z } from "zod";

// Pagination query parameters
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val >= 1, "Page must be greater than 0"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val >= 1 && val <= 100, "Limit must be between 1 and 100"),
});

// Pagination parameters interface
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

// Paginated response interface
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// Helper function to calculate pagination parameters
export const calculatePagination = (
  page: number,
  limit: number
): PaginationParams => {
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// Helper function to create paginated response
export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data,
    page,
    limit,
    totalItems,
    totalPages,
  };
};

// Inferred TypeScript types
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
