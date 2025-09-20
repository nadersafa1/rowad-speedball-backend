import type { Test } from "../db/schema/test";
import { calculateTotalScore } from "../db/schema/results";

// Helper function to format test duration
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

// Helper function to calculate total test time (playing + recovery)
export const calculateTotalTime = (
  test: Pick<Test, "playingTime" | "recoveryTime">
): number => {
  return (test.playingTime + test.recoveryTime) * 4;
};

// Helper function to format total test time
export const formatTotalTime = (
  test: Pick<Test, "playingTime" | "recoveryTime">
): string => {
  const totalMinutes = calculateTotalTime(test);
  return formatDuration(totalMinutes);
};

// Helper function to get test status based on date conducted
export const getTestStatus = (
  dateConducted: string
): "upcoming" | "completed" | "today" => {
  const testDate = new Date(dateConducted);
  const today = new Date();

  // Reset time to compare only dates
  testDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (testDate > today) {
    return "upcoming";
  } else if (testDate < today) {
    return "completed";
  } else {
    return "today";
  }
};

// Helper function to check if test is within date range
export const isTestInDateRange = (
  testDate: string,
  dateFrom?: string,
  dateTo?: string
): boolean => {
  const test = new Date(testDate);

  if (dateFrom) {
    const from = new Date(dateFrom);
    if (test < from) return false;
  }

  if (dateTo) {
    const to = new Date(dateTo);
    if (test > to) return false;
  }

  return true;
};

// Public Interface
export const testsService = {
  formatDuration,
  calculateTotalTime,
  formatTotalTime,
  getTestStatus,
  isTestInDateRange,
  calculateTotalScore,
};
