import cors from "cors";
import e, { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { PeerId, ClientRequest } from "./schema";
import Peers, { WebSocketPeer } from "./peers";
import ws from "ws";
import cuid from "cuid";

const PEER_ID_HEADER = "X-Peer-ID";

const app = e();
const peers = new Peers();

app.use(cors());
app.use(e.json());

/* const peerSchema = z */
/*   .string({ */
/*     required_error: `Must pass the current/conecting peer id through ${PEER_ID_HEADER} header`, */
/*   }) */
/*   .cuid(`${PEER_ID_HEADER} must be a cuid`) */
/*   .transform(createPeerIDToPeerTransformer(peers)); */

/* const transformPeerIdToPeerWithZod = createPeerIDToPeerTransformer(peers); */

app.get("/peers", (req, res) => {
  const peerId = PeerId.parse(req.get(PEER_ID_HEADER));
  const _peers = peers.toArray().filter((p) => p.id !== peerId);

  console.debug("serving %s peers for peerId %s", _peers.length, peerId);

  res.json({
    data: _peers,
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
const server = app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

const wsServer = new ws.Server({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  console.log("request url", request.url);

  if (request.url === "/ws") {
    wsServer.handleUpgrade(request, socket, head, function done(ws) {
      wsServer.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wsServer.on("connection", (socket) => {
  const localSendingPeer = new WebSocketPeer(cuid(), socket);
  const removePeer = peers.add(localSendingPeer);

  localSendingPeer.notify({
    type: "assign-id",
    ...localSendingPeer.toJSON(),
  });

  socket.on("message", (message) => {
    const m = ClientRequest.parse(JSON.parse(message.toString()));
    switch (m.type) {
      case "introduction": {
        localSendingPeer.userName = m.userName;

        localSendingPeer.notify({
          type: "update-self",
          data: localSendingPeer.toJSON(),
        });

        peers.notifyAll({
          type: "peer-connected",
          fromPeer: localSendingPeer,
        });
        break;
      }

      case "call": {
        localSendingPeer.polite = true;

        localSendingPeer.notify({
          type: "update-self",
          data: localSendingPeer.toJSON(),
        });

        const callee = peers.get(m.callee.id);
        callee.polite = false;

        callee.notify({
          type: "call",
          caller: localSendingPeer.toJSON(),
        });

        break;
      }

      case "description": {
        const toPeer = peers.get(m.sendTo);
        console.log(
          "received description for",
          toPeer.toJSON(),
          "from",
          localSendingPeer.toJSON()
        );

        toPeer.notify({
          type: "description",
          fromPeer: localSendingPeer,
          data: m.data,
        });
        break;
      }

      case "candidate": {
        const toPeer = peers.get(m.sendTo);
        toPeer.notify({
          type: m.type,
          data: m.data,
        });
        break;
      }
    }
  });

  socket.on("close", (code, reason) => {
    removePeer();

    peers.notifyAll({
      type: "peer-disconnected",
      fromPeer: localSendingPeer,
    });

    console.info("ws closed", {
      code,
      reason: reason.toString(),
    });
  });
});
