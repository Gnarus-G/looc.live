import { z } from "zod";

export const idSchema = z.string().min(1, "An id, for the call, is required");

export const peerIdSchema = z
  .string()
  .min(1, "An id is required to identify the requesting peer")
  .cuid();

export const offerSchema = z.object({
  sdp: z.string().min(1),
  type: z.enum(["offer"]),
});

export const answerSchema = z.object({
  sdp: z.string().min(1),
  type: z.enum(["answer"]),
});

export const peerQueryParamsSchema = z.object({
  peerId: peerIdSchema,
  userName: z.string().min(1),
});
