import { z } from "zod";

export const PeerId = z.string().cuid();

const sdpSchema = z.object({
  sdp: z.string().min(1),
  type: z.enum(["answer", "offer", "pranswer", "rollback"]),
});

export const Peer = z.object({
  id: PeerId,
  userName: z.string().min(1),
  polite: z.boolean().optional(),
});

export type PeerDTO = z.infer<typeof Peer>;

export const ServerMessage = z.union([
  z.object({
    type: z.literal("introduction"),
    id: PeerId,
    userName: z.string().min(1),
  }),
  z.object({
    type: z.literal("description"),
    data: sdpSchema,
    fromPeer: Peer,
    polite: z.boolean(),
  }),
  z.object({
    type: z.literal("candidate"),
    data: z.unknown(),
  }),
  z.object({
    type: z.literal("peer-connected"),
    fromPeer: Peer,
  }),
  z.object({
    type: z.literal("peer-disconnected"),
    fromPeer: Peer,
  }),
]);