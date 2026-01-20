import "dotenv/config";
import express from "express";
import multer from "multer";
import type { HealthResponse } from "@tada/shared";
import { handleChat } from "./core/chat";
import { handleUpload } from "./core/upload";
import { getDatasetState } from "./core/state";

const app = express();
const port = Number(process.env.PORT) || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  const payload: HealthResponse = { ok: true };
  res.json(payload);
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "file_missing" });
    return;
  }
  try {
    const state = await handleUpload(req.file);
    res.json(state);
  } catch (error) {
    res.status(400).json({ error: "upload_failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { datasetId, message } = req.body ?? {};
  if (!datasetId || !message) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const response = await handleChat({ datasetId, message });
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: "chat_failed" });
  }
});

app.get("/api/dashboard", (req, res) => {
  const datasetId = typeof req.query.datasetId === "string" ? req.query.datasetId : null;
  if (!datasetId) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const state = getDatasetState(datasetId);
  if (!state) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(state);
});

app.listen(port, () => {
  console.log(`[api] listening on ${port}`);
});
