import cors from "cors";
import e, { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import {
  offerSchema,
  answerSchema,
  peerIdSchema,
  peerQueryParamsSchema,
} from "./inputs";
import Peers from "./peers";

const PEER_ID_HEADER = "X-Peer-ID";

const app = e();
const peers = new Peers();

app.use(cors());
app.use(e.json());

const errorHandler: ErrorRequestHandler = (error, _, res, next) => {
  if (error instanceof ZodError) {
    return res.status(400).json(error.flatten());
  }
  return next(error);
};

const noPeerFoundMessage = (id: string) =>
  `No peer by the id "${id}" is connected`;

app.post("/offer/:peerId", (req, res) => {
  const { peerId } = req.params;
  const offer = offerSchema.parse(req.body);
  const offeringPeerId = peerIdSchema.parse(req.get(PEER_ID_HEADER));

  console.log("offering", { peerId, offer, offeringPeerId });

  const peerOfInterest = peers.get(peerId);

  if (!peerOfInterest) {
    return res.status(404).send(noPeerFoundMessage(peerId));
  }

  peerOfInterest.notify({
    type: "offer",
    data: {
      fromPeerId: offeringPeerId,
      payload: offer,
    },
  });

  res.json({
    peer: peerOfInterest,
  });
});

app.post("/answer/:peerId", (req, res) => {
  const { peerId } = req.params;
  const answer = answerSchema.parse(req.body);
  const answeringPeerId = peerIdSchema.parse(req.get(PEER_ID_HEADER));

  console.log("answering", {
    peerId,
    answer,
    answeringPeerId,
  });

  const peerOfInterest = peers.get(peerId);

  if (!peerOfInterest) {
    return res.status(404).send(noPeerFoundMessage(peerId));
  }

  peerOfInterest.notify({
    type: "answer",
    data: {
      fromPeerId: answeringPeerId,
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

  const peer = peers.get(id);

  if (!peer) return res.status(404).send(noPeerFoundMessage(id));

  peer.notify({
    type: "offerCandidate",
    data: {
      fromPeerId: peerIdSchema.parse(req.get(PEER_ID_HEADER)),
      payload: req.body,
    },
  });

  res.status(204);
});

app.post("/answer/:peerId/candidate", (req, res) => {
  const id = req.params.peerId;

  console.log("sending answer candidate to peer", id);

  const peer = peers.get(id);

  if (!peer) return res.status(404).send(noPeerFoundMessage(id));

  peer.notify({
    type: "answerCandidate",
    data: {
      fromPeerId: peerIdSchema.parse(req.get(PEER_ID_HEADER)),
      payload: req.body,
    },
  });

  res.status(204);
});

app.get("/events/", (req, res) => {
  const peerParams = peerQueryParamsSchema.parse(req.query);

  const clearPeer = peers.add({
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
    clearPeer();
    res.end();
  });
});

app.get("/peers", (_, res) => {
  res.json({
    data: peers.toArray(),
  });
});

app.use(errorHandler);

const PORT = process.env.PORT ?? 8080;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
