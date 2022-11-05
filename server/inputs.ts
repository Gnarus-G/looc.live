import { z } from "zod";

export const idSchema = z.string().min(1, "An id, for the call, is required");

export const offerSchema = z.object({
  sdp: z.string().min(1),
  type: z.enum(["offer"]),
});
export type SDPOffer = z.infer<typeof offerSchema>;

export const answerSchema = z.object({
  sdp: z.string().min(1),
  type: z.enum(["answer"]),
});
export type SDPAnswer = z.infer<typeof answerSchema>;
