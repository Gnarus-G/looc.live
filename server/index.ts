import cors from "cors";
import e, { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { PeerId, ClientRequest } from "./schema";
import Peers, { Peer } from "./peers";
import ws from "ws";
import cuid from "cuid";
import { Politeness } from "./Politeness";

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

const politeness = new Politeness();

wsServer.on("connection", (socket) => {
  let localSendingPeer: Peer;
  let removePeer: VoidFunction;

  socket.on("message", (message) => {
    const m = ClientRequest.parse(JSON.parse(message.toString()));
    switch (m.type) {
      case "introduction": {
        const peer = {
          id: cuid(),
          userName: m.userName,
        };

        localSendingPeer = {
          ...peer,
          notify(notification) {
            socket.send(JSON.stringify(notification));
          },
        };

        peers.notifyAll({
          type: "peer-connected",
          fromPeer: localSendingPeer,
          data: null,
        });

        removePeer = peers.add(localSendingPeer);

        socket.send(
          JSON.stringify({
            type: "introduction",
            ...peer,
          })
        );

        break;
      }

      case "description": {
        const toPeer = peers.get(m.sendTo);
        if (!toPeer) {
          throw new Error("No such peer by id");
        }

        console.log(
          "received description for",
          toPeer,
          "from",
          localSendingPeer
        );

        let localSenderIsPolite = false;
        // setting the offerer or first sender as the polite one.
        if (m.data.type === "offer") {
          localSenderIsPolite = politeness.get(localSendingPeer.id, toPeer.id);
          console.log("localSendingPeer is polite", localSenderIsPolite);
        }

        toPeer.notify({
          type: "description",
          fromPeer: localSendingPeer,
          data: m.data,
          polite: !localSenderIsPolite,
        });
        break;
      }

      case "candidate": {
        const toPeer = peers.get(m.sendTo);
        if (!toPeer) {
          throw new Error("No such peer by id");
        }
        toPeer.notify({
          type: m.type,
          fromPeer: localSendingPeer,
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
      data: null,
    });

    console.info("ws closed", {
      code,
      reason: reason.toString(),
    });
  });
});
