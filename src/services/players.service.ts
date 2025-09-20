import { calculateTotalScore } from "../db/schema/results";
import { calculateAge, getAgeGroup } from "../db/schema/players";

// Public Interface
export const playersService = {
  calculateAge,
  getAgeGroup,
  calculateTotalScore,
};
