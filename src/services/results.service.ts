import type { TestResult } from "../db/schema/results";
import { calculateTotalScore } from "../db/schema/results";

// Helper function to calculate average score
export const calculateAverageScore = (
  result: Pick<
    TestResult,
    "leftHandScore" | "rightHandScore" | "forehandScore" | "backhandScore"
  >
): number => {
  const total = calculateTotalScore(result);
  return Math.round((total / 4) * 100) / 100; // Round to 2 decimal places
};

// Helper function to get the highest score from all categories
export const getHighestScore = (
  result: Pick<
    TestResult,
    "leftHandScore" | "rightHandScore" | "forehandScore" | "backhandScore"
  >
): number => {
  return Math.max(
    result.leftHandScore,
    result.rightHandScore,
    result.forehandScore,
    result.backhandScore
  );
};

// Helper function to get the lowest score from all categories
export const getLowestScore = (
  result: Pick<
    TestResult,
    "leftHandScore" | "rightHandScore" | "forehandScore" | "backhandScore"
  >
): number => {
  return Math.min(
    result.leftHandScore,
    result.rightHandScore,
    result.forehandScore,
    result.backhandScore
  );
};

// Helper function to get performance category based on total score
export const getPerformanceCategory = (totalScore: number): string => {
  if (totalScore >= 3600) return "Excellent"; // 90% average
  if (totalScore >= 3200) return "Very Good"; // 80% average
  if (totalScore >= 2800) return "Good"; // 70% average
  if (totalScore >= 2400) return "Average"; // 60% average
  if (totalScore >= 2000) return "Below Average"; // 50% average
  return "Needs Improvement"; // Below 50% average
};

// Helper function to calculate score distribution
export const getScoreDistribution = (
  result: Pick<
    TestResult,
    "leftHandScore" | "rightHandScore" | "forehandScore" | "backhandScore"
  >
) => {
  const total = calculateTotalScore(result);

  return {
    leftHandPercentage: Math.round((result.leftHandScore / total) * 100),
    rightHandPercentage: Math.round((result.rightHandScore / total) * 100),
    forehandPercentage: Math.round((result.forehandScore / total) * 100),
    backhandPercentage: Math.round((result.backhandScore / total) * 100),
  };
};

// Helper function to identify strengths and weaknesses
export const analyzePerformance = (
  result: Pick<
    TestResult,
    "leftHandScore" | "rightHandScore" | "forehandScore" | "backhandScore"
  >
) => {
  const scores = {
    leftHand: result.leftHandScore,
    rightHand: result.rightHandScore,
    forehand: result.forehandScore,
    backhand: result.backhandScore,
  };

  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return {
    strongest: sortedScores[0][0],
    strongestScore: sortedScores[0][1],
    weakest: sortedScores[3][0],
    weakestScore: sortedScores[3][1],
    improvement: sortedScores[0][1] - sortedScores[3][1], // Gap between best and worst
  };
};

// Helper function to check if result is within score range
export const isResultInScoreRange = (
  totalScore: number,
  minScore?: number,
  maxScore?: number
): boolean => {
  if (minScore !== undefined && totalScore < minScore) return false;
  if (maxScore !== undefined && totalScore > maxScore) return false;
  return true;
};

// Helper function to check if result is within date range
export const isResultInDateRange = (
  resultDate: string,
  dateFrom?: string,
  dateTo?: string
): boolean => {
  const result = new Date(resultDate);

  if (dateFrom) {
    const from = new Date(dateFrom);
    if (result < from) return false;
  }

  if (dateTo) {
    const to = new Date(dateTo);
    if (result > to) return false;
  }

  return true;
};

// Public Interface
export const resultsService = {
  calculateTotalScore,
  calculateAverageScore,
  getHighestScore,
  getLowestScore,
  getPerformanceCategory,
  getScoreDistribution,
  analyzePerformance,
  isResultInScoreRange,
  isResultInDateRange,
};
