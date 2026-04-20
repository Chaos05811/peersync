import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import { MongoClient } from "mongodb";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distPath = path.join(projectRoot, "dist");
const require = createRequire(import.meta.url);
const Y = require("yjs");
const yWebsocketRoot = path.dirname(require.resolve("y-websocket/package.json"));
const { setupWSConnection, setPersistence } = require(
  path.join(yWebsocketRoot, "bin", "utils.js")
);

const PORT = Number(process.env.PORT || 1234);
const HOST = process.env.HOST || "127.0.0.1";
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/peersync";
const MONGODB_DB = process.env.MONGODB_DB || "peersync";

async function connectCollection() {
  try {
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 1500,
      connectTimeoutMS: 1500
    });
    await client.connect();
    console.log(`MongoDB connected at ${MONGODB_URI}`);
    return client.db(MONGODB_DB).collection("documents");
  } catch (error) {
    console.warn("MongoDB unavailable, running with in-memory rooms only.");
    console.warn(error.message);
    return null;
  }
}

const persistTimers = new Map();

async function persistState(collection, roomId, ydoc) {
  if (!collection) {
    return;
  }

  await collection.updateOne(
    { _id: roomId },
    {
      $set: {
        state: Buffer.from(Y.encodeStateAsUpdate(ydoc)),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
}

function getRoomId(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const lastPart = parts.at(-1);
  if (lastPart && lastPart !== "collaboration") {
    return decodeURIComponent(lastPart);
  }

  return url.searchParams.get("room") || "";
}

const collection = await connectCollection();

if (collection) {
  setPersistence({
    bindState: async (roomId, ydoc) => {
      const record = await collection.findOne({ _id: roomId });
      if (record?.state?.buffer) {
        Y.applyUpdate(ydoc, new Uint8Array(record.state.buffer));
      } else if (record?.state) {
        Y.applyUpdate(ydoc, new Uint8Array(record.state));
      }

      ydoc.on("update", () => {
        if (persistTimers.has(roomId)) {
          clearTimeout(persistTimers.get(roomId));
        }

        persistTimers.set(
          roomId,
          setTimeout(async () => {
            await persistState(collection, roomId, ydoc);
            persistTimers.delete(roomId);
          }, 500)
        );
      });
    },
    writeState: async (roomId, ydoc) => {
      if (persistTimers.has(roomId)) {
        clearTimeout(persistTimers.get(roomId));
        persistTimers.delete(roomId);
      }
      await persistState(collection, roomId, ydoc);
    }
  });
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = http.createServer(app);
const websocketServer = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (!url.pathname.startsWith("/collaboration")) {
    socket.destroy();
    return;
  }

  websocketServer.handleUpgrade(request, socket, head, (ws) => {
    websocketServer.emit("connection", ws, request, url);
  });
});

websocketServer.on("connection", async (ws, request, url) => {
  const roomId = getRoomId(url);

  if (!roomId) {
    ws.close(1008, "Room code is required");
    return;
  }

  try {
    setupWSConnection(ws, request, { docName: roomId });
  } catch (error) {
    console.error(`Failed to connect room ${roomId}`, error);
    ws.close(1011, "Room connection failed");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`PeerSync server running on http://${HOST}:${PORT}`);
});
