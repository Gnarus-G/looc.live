import cuid from "cuid";
import cors from "cors";
import e, { ErrorRequestHandler, RequestHandler } from "express";
import { CallEventListener, CallsManager } from "./manage-calls";
import { ZodError } from "zod";
import { answerSchema, peerIdSchema, idSchema, offerSchema } from "./inputs";

const PEER_ID_HEADER = "X-Peer-ID";

const app = e();
const calls = new CallsManager();

app.use(cors());
app.use(e.json());

const callIdValidationHandler: RequestHandler = (req, _, next) => {
  idSchema.parse(req.params.id);
  return next();
};

const errorHandler: ErrorRequestHandler = (error, _, res, next) => {
  if (error instanceof ZodError) {
    return res.status(400).json(error.flatten());
  }
  return next(error);
};

const noCallFoundMessage = (id: string) =>
  `No call by the id "${id}" has been started`;

app.use(["/*/:id/*", "/*/:id"], callIdValidationHandler);

app.post("/offer/:id?", (req, res) => {
  const id = req.params.id ?? cuid();
  const offer = offerSchema.parse(req.body);

  const peerId = peerIdSchema.parse(req.get(PEER_ID_HEADER));

  console.log("offering call", { id, offer, peerId });

  calls.setOffer(id, offer, peerId);

  res.json({ id });
});

app.get("/offer/:id", (req, res) => {
  const id = req.params.id;
  const call = calls.getOffer(id);
  if (!call) return res.status(404).send(noCallFoundMessage(id));
  res.json(call);
});

app.post("/answer/:id", (req, res) => {
  const id = req.params.id;
  const answer = answerSchema
    .refine(() => calls.getOffer(id), noCallFoundMessage(id))
    .parse(req.body);

  const peerId = peerIdSchema.parse(req.get(PEER_ID_HEADER));

  console.log("answering call", { id, answer, peerId });

  calls.setAnswer(id, answer, peerId);
  res.json({ id });
});

app.post("/offer/:id/candidate", (req, res) => {
  const id = req.params.id;
  console.log("setting offer candidate for call", id);
  const peerId = peerIdSchema.parse(req.get(PEER_ID_HEADER));
  calls.setOfferCandidate(id, req.body, peerId);
  res.status(204);
});

app.post("/answer/:id/candidate", (req, res) => {
  const id = req.params.id;
  console.log("setting answer candidate for call", id);
  const peerId = peerIdSchema.parse(req.get(PEER_ID_HEADER));
  calls.setAnswerCandidate(id, req.body, peerId);
  res.status(204);
});

app.get("/events/:id/:peerId", (req, res) => {
  const callId = req.params.id;

  const listener: CallEventListener = (e) => {
    res.write(`event: ${e.type}\n`);
    res.write(`data: ${JSON.stringify(e.data)}\n\n`);
  };

  listener.id = req.params.peerId;

  const unregisterListener = calls.registerEventListener(callId, listener);

  res.contentType("text/event-stream");
  res.set({
    Connection: "Keep-alive",
  });

  res.on("close", () => {
    unregisterListener();
    res.end();
  });
});

app.use(errorHandler);

const PORT = process.env.PORT ?? 8080;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
