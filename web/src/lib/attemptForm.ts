import { z } from "zod";
import { MAX_SHORT_ANSWER } from "./paperForm";

export const saveAnswerForm = z.object({
  seq: z.number().int().min(1).max(999),
  value: z.union([z.string().max(MAX_SHORT_ANSWER), z.array(z.string().max(2).nullable()).max(10), z.null()]),
});

export type SaveAnswerInput = z.infer<typeof saveAnswerForm>;
