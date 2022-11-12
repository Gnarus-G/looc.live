import { z } from "zod";
import Peers from "./peers";

export const peerIdSchema = z.string().cuid();

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

export function createPeerIDToPeerTransformer(peers: Peers) {
  return function (
    peerId: string,
    ctx: z.RefinementCtx,
    message?: (peerId: string) => string
  ) {
    const peer = peers.get(peerId);
    if (!peer) {
      ctx.addIssue({
        code: "custom",
        message:
          message?.(peerId) ?? `No peer by the id '${peerId}' is connected`,
      });

      return z.NEVER;
    }
    return peer;
  };
}
