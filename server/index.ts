import cuid from "cuid";
import cors from "cors";
import e from "express";

const app = e();

type SDPAndCandidates = {
  sdp: string;
  type: string;
  candidates: object[];
};

type RTCData = {
  offer: SDPAndCandidates;
  answer?: SDPAndCandidates;
};

const calls = new Map<string, RTCData>();

const answerSubs = new Map<string, Array<(a: SDPAndCandidates) => void>>();
const iceCandidateSubs = new Map<
  string,
  Array<(a: SDPAndCandidates) => void>
>();

app.use(cors());
app.use(e.json());

app.post("/offer/:id", (req, res) => {
  const id = req.params.id ?? cuid();
  console.log("Offer", req.body);
  calls.set(id, {
    offer: {
      ...req.body,
      candidates: [],
    },
  });

  res.json({
    id,
  });
});

app.get("/offer/:id", (req, res) => {
  const call = calls.get(req.params.id);

  if (!call) return res.status(400);

  res.json({
    sdp: call.offer.sdp,
    type: call.offer.type,
  });
});

app.post("/answer/:id", (req, res) => {
  const id = req.params.id;
  const call = calls.get(id);

  if (!call) return res.status(400).json({});

  const answer = req.body;

  console.log("answering call", id, answer);

  calls.set(id, {
    ...call,
    answer: {
      ...answer,
      candidates: [],
    },
  });

  answerSubs.get(id)?.forEach((s) => s(answer));

  res.json({
    id,
  });
});

app.post("/offer/:id/candidate", (req, res) => {
  const id = req.params.id;
  const call = calls.get(id);
  if (!call) return res.status(400);
  call.offer.candidates.push(req.body);
  console.log("setting offer candidate", call);
  iceCandidateSubs.get(id)?.forEach((s) => s(call.offer));
  res.status(204);
});

app.post("/answer/:id/candidate", (req, res) => {
  const id = req.params.id;
  const call = calls.get(id);
  if (!call) return res.status(400);
  const answer = call.answer;
  console.log("setting answer candidate", call);
  if (answer) {
    answer.candidates.push(req.body);
    iceCandidateSubs.get(id)?.forEach((s) => s(answer));
  }
  res.status(204);
});

app.get("/events/:id", (req, res) => {
  const callId = req.params.id;
  let subs = answerSubs.get(callId);
  if (!subs) {
    subs = [];
    answerSubs.set(callId, subs);
  }

  subs.push((a) => {
    console.log("pushing answer", a);
    /* res.write(`id: ${callId}\n`); */
    res.write("event: answer\n");
    res.write(`data: ${JSON.stringify(a)}\n\n`);
  });

  let iceSubs = iceCandidateSubs.get(callId);
  if (!iceSubs) {
    iceSubs = [];
    iceCandidateSubs.set(callId, iceSubs);
  }

  iceSubs.push((sdpIc) => {
    console.log("pushing ice candidate", sdpIc);
    /* res.write(`id: ${callId}\n`); */
    res.write(`event: ${sdpIc.type}Candidate\n`);
    res.write(`data: ${JSON.stringify(sdpIc.candidates.at(-1))}\n\n`);
  });

  res.contentType("text/event-stream");
  res.set({
    Connection: "Keep-alive",
  });

  res.on("close", () => {
    /* answerSubs.delete(callId); */
    /* iceCandidateSubs.delete(callId); */
    res.end();
  });
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
