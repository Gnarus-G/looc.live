import { z } from "zod";

export const PeerId = z.string().cuid();

const sdpSchema = z.object({
  sdp: z.string().min(1),
  type: z.enum(["answer", "offer", "pranswer", "rollback"]),
});

export const Peer = z.object({
  id: PeerId,
  userName: z.string().min(1),
  polite: z.boolean(),
});

export type PeerDTO = z.infer<typeof Peer>;

export const ServerMessage = z.union([
  z.object({
    type: z.literal("assign-id"),
    id: PeerId,
    userName: z.string().min(1),
  }),
  z.object({
    type: z.literal("update-self"),
    data: Peer,
  }),
  z.object({
    type: z.literal("call"),
    caller: Peer,
  }),
  z.object({
    type: z.literal("description"),
    data: sdpSchema,
    fromPeer: Peer,
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
