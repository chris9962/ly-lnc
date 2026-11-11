export const GRADES = [10, 11, 12] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_OPTIONS = [{ value: "", label: "Mọi khối" }, ...GRADES.map((grade) => ({ value: String(grade), label: `Khối ${grade}` }))];

export const isGrade =(value: unknown): value is Grade => GRADES.includes(value as Grade);
