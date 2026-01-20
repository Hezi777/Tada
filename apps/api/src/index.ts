import "dotenv/config";
import express from "express";
import multer from "multer";
import type { HealthResponse } from "@tada/shared";
import { handleUpload } from "./pipeline/upload";
import { handleChat } from "./pipeline/chat";
import { getDatasetRecord } from "./state-store";

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
    const result = await handleUpload(req.file);
    res.json(result.dashboardState);
  } catch (error) {
    res.status(500).json({ error: "upload_failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { datasetId, message, dashboardVersion } = req.body ?? {};
  if (!datasetId || !message || typeof dashboardVersion !== "number") {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const result = await handleChat({ datasetId, message, dashboardVersion });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "chat_failed" });
  }
});

app.get("/api/dashboard", (req, res) => {
  const datasetId = typeof req.query.datasetId === "string" ? req.query.datasetId : null;
  if (!datasetId) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const record = getDatasetRecord(datasetId);
  if (!record) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(record.dashboardState);
});

app.get("/api/debug/profile", (req, res) => {
  const datasetId = typeof req.query.datasetId === "string" ? req.query.datasetId : null;
  if (!datasetId) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const record = getDatasetRecord(datasetId);
  if (!record) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({
    detectedColumnTypes: record.debug.detectedColumnTypes,
    dateParseSuccess: record.debug.dateParseSuccess,
    durationUnitCounts: record.debug.durationUnitCounts,
    chartSpecs: record.dashboardState.charts.map((chart) => chart.spec),
    warnings: record.debug.warnings,
  });
});

app.listen(port, () => {
  console.log(`[api] listening on ${port}`);
});
