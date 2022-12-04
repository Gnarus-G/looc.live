import cors from "cors";
import e, { ErrorRequestHandler } from "express";
import { z, ZodError } from "zod";
import {
  offerSchema,
  answerSchema,
  peerIdSchema,
  peerQueryParamsSchema,
  createPeerIDToPeerTransformer,
} from "./inputs";
import Peers from "./peers";

const PEER_ID_HEADER = "X-Peer-ID";

const app = e();
const peers = new Peers();

app.use(cors());
app.use(e.json());

export const peerSchema = z
  .string({
    required_error: `Must pass the current/conecting peer id through ${PEER_ID_HEADER} header`,
  })
  .cuid(`${PEER_ID_HEADER} must be a cuid`)
  .transform(createPeerIDToPeerTransformer(peers));

const transformPeerIdToPeerWithZod = createPeerIDToPeerTransformer(peers);

app.post("/offer/:peerId", (req, res) => {
  const { peerId } = req.params;
  const fromPeer = peerSchema.parse(req.get(PEER_ID_HEADER));
  const offer = offerSchema.parse(req.body);

  console.log("offering", { peerId, offer, fromPeer });

  const peerOfInterest = z
    .string()
    .transform(transformPeerIdToPeerWithZod)
    .parse(peerId);

  peerOfInterest.notify({
    type: "offer",
    data: {
      fromPeer,
      payload: offer,
    },
  });

  res.json({
    peer: peerOfInterest,
  });
});

app.post("/answer/:peerId", (req, res) => {
  const { peerId } = req.params;
  const fromPeer = peerSchema.parse(req.get(PEER_ID_HEADER));
  const answer = answerSchema.parse(req.body);

  console.log("answering", { peerId, answer, fromPeer });

  const peerOfInterest = z
    .string()
    .transform(transformPeerIdToPeerWithZod)
    .parse(peerId);

  peerOfInterest.notify({
    type: "answer",
    data: {
      fromPeer,
      payload: answer,
    },
  });

  res.json({
    peer: peerOfInterest,
  });
});

app.post("/offer/:peerId/candidate", (req, res) => {
  const id = req.params.peerId;

  console.log("sending offer candidate to peer", id);

  const peer = z.string().transform(transformPeerIdToPeerWithZod).parse(id);

  peer.notify({
    type: "offerCandidate",
    data: {
      fromPeer: peerIdSchema
        .transform(transformPeerIdToPeerWithZod)
        .parse(req.get(PEER_ID_HEADER)),
      payload: req.body,
    },
  });

  res.status(204);
});

app.post("/answer/:peerId/candidate", (req, res) => {
  const id = req.params.peerId;

  console.log("sending answer candidate to peer", id);

  const peer = z.string().transform(transformPeerIdToPeerWithZod).parse(id);

  peer.notify({
    type: "answerCandidate",
    data: {
      fromPeer: peerIdSchema
        .transform(transformPeerIdToPeerWithZod)
        .parse(req.get(PEER_ID_HEADER)),
      payload: req.body,
    },
  });

  res.status(204);
});

app.get("/events/", (req, res) => {
  const peerParams = peerQueryParamsSchema.parse(req.query);

  console.log("peer connected", peerParams);

  peers.notifyAll({
    type: "peerConnected",
    data: {
      fromPeer: {
        id: peerParams.peerId,
        userName: peerParams.userName,
      },
      payload: null,
    },
  });

  const removePeer = peers.add({
    id: peerParams.peerId,
    userName: peerParams.userName,
    notify: (e) => {
      res.write(`event: ${e.type}\n`);
      res.write(`data: ${JSON.stringify(e.data)}\n\n`);
    },
  });

  res.contentType("text/event-stream");
  res.set({
    Connection: "Keep-alive",
  });

  req.on("close", () => {
    removePeer();

    peers.notifyAll({
      type: "peerDisconnected",
      data: {
        fromPeer: {
          id: peerParams.peerId,
          userName: peerParams.userName,
        },
        payload: null,
      },
    });

    res.end();
  });
});

app.get("/peers", (req, res) => {
  const { peerId } = z
    .object({ peerId: peerIdSchema.optional() })
    .parse(req.query);

  res.json({
    data: peers.toArray().filter((p) => p.id !== peerId),
  });
});

const errorHandler: ErrorRequestHandler = (error, _, res, next) => {
  console.log("caught", error);

  if (error instanceof ZodError) {
    return res.status(400).json({ errors: error.format() });
  }

  return next(error);
};

app.use(errorHandler);

const PORT = process.env.PORT ?? 8080;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
