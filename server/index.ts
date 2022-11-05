import cuid from "cuid";
import cors from "cors";
import e, { ErrorRequestHandler, RequestHandler } from "express";
import { CallsManager } from "./manage-calls";
import { ZodError } from "zod";
import { answerSchema, idSchema, offerSchema } from "./inputs";

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

app.use(["/*/:id/*", "/*/:id"], callIdValidationHandler);

app.post("/offer/:id?", (req, res) => {
  const id = req.params.id ?? cuid();
  const offer = offerSchema.parse(req.body);
  console.log("Offer", offer);
  calls.setOffer(id, offer);
  res.json({ id });
});

app.get("/offer/:id", (req, res) => {
  const call = calls.getOffer(req.params.id);
  if (!call) return res.status(400);
  res.json(call);
});

app.post("/answer/:id", (req, res) => {
  const id = req.params.id;
  const answer = answerSchema
    .refine(() => calls.getOffer(id), "No call by that id has been started")
    .parse(req.body);
  console.log("answering call", id, answer);
  res.json({ id });
});

app.post("/offer/:id/candidate", (req, res) => {
  const id = req.params.id;
  calls.setOfferCandidate(id, req.body);
  console.log("setting offer candidate for call", id);
  res.status(204);
});

app.post("/answer/:id/candidate", (req, res) => {
  const id = req.params.id;
  console.log("setting answer candidate for call", id);
  calls.setAnswerCandidate(id, req.body);
  res.status(204);
});

app.get("/events/:id", (req, res) => {
  const callId = req.params.id;

  const unregisterListener = calls.registerEventListener(callId, (e) => {
    res.write(`event: ${e.type}\n`);
    res.write(`data: ${JSON.stringify(e.data)}\n\n`);
  });

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
