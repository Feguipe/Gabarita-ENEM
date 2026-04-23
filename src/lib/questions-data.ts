import type { Question } from "./types";
import realData from "@/data/questions.json";
import { MOCK_QUESTIONS } from "./mock-questions";

const real = realData as Question[];

export const QUESTIONS: Question[] =
  Array.isArray(real) && real.length > 0 ? real : MOCK_QUESTIONS;

export function getAvailableYears(): number[] {
  const set = new Set<number>();
  for (const q of QUESTIONS) set.add(q.ano);
  return [...set].sort((a, b) => b - a);
}
