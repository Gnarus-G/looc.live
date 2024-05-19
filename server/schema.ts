import { z } from "zod";

export const PeerId = z.string().cuid();

const sdpSchema = z.object({
  sdp: z.string().min(1),
  type: z.enum(["answer", "offer", "pranswer", "rollback"]),
});

const Peer = z.object({
  id: PeerId,
  userName: z.string().min(1),
  polite: z.boolean().optional(),
});

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

/* type ServerMessageDTO = z.infer<typeof ServerMessage>; */

export const ClientRequest = z.union([
  z.object({
    type: z.literal("introduction"),
    userName: z.string().min(1),
  }),
  z.object({
    type: z.literal("description"),
    sendTo: PeerId,
    data: sdpSchema,
  }),
  z.object({
    type: z.literal("candidate"),
    sendTo: PeerId,
    data: z.unknown(),
  }),
]);
