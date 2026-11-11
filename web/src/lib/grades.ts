export const GRADES = [10, 11, 12] as const;
export type Grade = (typeof GRADES)[number];

export const isGrade = (value: unknown): value is Grade => GRADES.includes(value as Grade);
