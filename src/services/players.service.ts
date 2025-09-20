import { calculateAge, getAgeGroup, calculateTotalScore } from "../db/schema";

// Public Interface
export const playersService = {
  calculateAge,
  getAgeGroup,
  calculateTotalScore,
};
