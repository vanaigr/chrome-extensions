#!/usr/bin/env node
// Native messaging host for the Resume Generator extension.
// Protocol: 4-byte little-endian length prefix + UTF-8 JSON payload,
// over stdin (request) and stdout (response).

const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "host.log");
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a =>
    typeof a === "string" ? a : JSON.stringify(a)).join(" ")}\n`;
  fs.appendFile(LOG_FILE, line, () => {});
}

function readMessage() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let need = null;
    let collected = 0;

    const onData = (chunk) => {
      chunks.push(chunk);
      collected += chunk.length;
      const buf = Buffer.concat(chunks, collected);
      if (need === null && buf.length >= 4) {
        need = buf.readUInt32LE(0);
      }
      if (need !== null && buf.length >= 4 + need) {
        const body = buf.slice(4, 4 + need).toString("utf8");
        process.stdin.removeListener("data", onData);
        process.stdin.removeListener("end", onEnd);
        process.stdin.removeListener("error", onErr);
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      }
    };
    const onEnd = () => reject(new Error("stdin closed before full message"));
    const onErr = (e) => reject(e);

    process.stdin.on("data", onData);
    process.stdin.on("end", onEnd);
    process.stdin.on("error", onErr);
  });
}

function sendMessage(obj) {
  const json = Buffer.from(JSON.stringify(obj), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(Buffer.concat([header, json]));
}

async function process_request(msg) {
  log("received", { action: msg.action, url: msg.page?.url });

  if (msg.action !== "generate") {
    throw new Error(`Unknown action: ${msg.action}`);
  }
  if (!msg.page?.url) {
    throw new Error("Missing page.url");
  }

  // --- async work placeholder ---
  // Replace this with real generation (fetch, file write, spawn, etc.).
  await new Promise(r => setTimeout(r, 500));
  const outPath = path.join(__dirname, "last-request.json");
  await fs.promises.writeFile(outPath, JSON.stringify(msg, null, 2));
  // -----------------------------

  return { written: outPath, title: msg.page.title };
}

(async () => {
  try {
    const msg = await readMessage();
    const result = await process_request(msg);
    sendMessage({ status: "ok", message: `Generated (${result.title})`, result });
    log("ok", result);
  } catch (e) {
    log("error", e.message);
    try { sendMessage({ status: "error", message: e.message }); } catch {}
    process.exit(1);
  }
})();
