import cors from "cors";
import e, { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { PeerId, ClientRequest } from "./schema";
import Peers, { Peer } from "./peers";
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
  let localPeer: Peer;
  let removePeer: VoidFunction;

  socket.on("message", (message) => {
    const m = ClientRequest.parse(JSON.parse(message.toString()));
    switch (m.type) {
      case "introduction": {
        const peer = {
          id: cuid(),
          userName: m.userName,
        };

        localPeer = {
          ...peer,
          notify(notification) {
            socket.send(
              JSON.stringify({
                ...notification,
                toPeer: peer.id,
              })
            );
          },
        };

        peers.notifyAll({
          type: "peer-connected",
          fromPeer: localPeer,
          data: null,
        });

        removePeer = peers.add(localPeer);

        socket.send(
          JSON.stringify({
            type: "introduction",
            ...peer,
          })
        );

        break;
      }

      case "description":
      case "candidate": {
        const toPeer = peers.get(m.sendTo);
        if (!toPeer) {
          throw new Error("No such peer by id");
        }
        toPeer.notify({
          type: m.type,
          fromPeer: localPeer,
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
      fromPeer: localPeer,
      data: null,
    });

    console.info("ws closed", {
      code,
      reason: reason.toString(),
    });
  });
});
