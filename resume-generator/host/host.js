#!/usr/bin/env node
// Native messaging host for the Resume Generator extension.
// Protocol: 4-byte little-endian length prefix + UTF-8 JSON payload,
// over stdin (request) and stdout (response).

import fs from "node:fs";
import path from "node:path";
import proc from 'node:child_process'
import * as O from '@openrouter/sdk'
import 'dotenv/config'

const LOG_FILE = path.join(import.meta.dirname, "host.log");
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a =>
    typeof a === "string" ? a : JSON.stringify(a)).join(" ")}\n`;
  fs.appendFileSync(LOG_FILE, line);
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
  log("received", msg);

  if (msg.action == "generate") {
        const outPath = path.join(import.meta.dirname, "last-request.json");
        await fs.promises.writeFile(outPath, JSON.stringify(msg, null, 2));

        try {
            const output = proc.execFileSync(
                'node',
                [
                    process.env.GENERATE_SCRIPT_PATH,
                    JSON.stringify(msg.page),
                ],
                { encoding: 'utf8' },
            );
            log('generate stdout', output);
        } catch (e) {
            log('generate failed', {
                status: e.status,
                stdout: e.stdout?.toString(),
                stderr: e.stderr?.toString(),
                message: e.message,
            });
            throw e;
        }

        return { written: outPath, title: msg.page.title };
    }
    else if(msg.action === 'scrape') {
        const responses = await Promise.all([
            sendDumb(msg.text, `
Below is a job description. Identify the base title of the role.
* Do not include roman numerals, such as "II" in "Software Engineer II".
* Do not include job specifigs, such as "Payments" in "Backend Developer, Payments".
* Do not include seniority levels, such as "Senior" in "Senior Developer".
`),
            sendDumb(msg.text, `
Below is a job description. Is the job located inside the US?
Reply with JSON literals "true" or "false". Nothing else.
`),
            sendDumb(msg.text, `
Below is a job description. Does the job have remote option not restricted to a city/state?
Reply with JSON literals "true" or "false". Nothing else.
`),
            sendDumb(msg.text, `
Below is a job description. Identify the job locations.
Location should be in "City, ST" format, e.g. "Chicago, IL". If the job has multiple locations, separate them by ";", e.g. "Chicago, IL; New York, NY".
`),
        ])

        const title = responses[0]
        const location = (() => {
            if(!isTrue(responses[1])) return 'other'
            if(isTrue(responses[2])) return 'remote'
            if(responses[3].includes(';')) return 'multiple'
            return responses[3]
        })()

        return { title, location }
    }
    else {
        throw new Error(`Unknown action: ${msg.action}`);
    }
}

function isTrue(response) {
    return response.includes('true')
}

async function sendDumb(jobDescription, prompt) {
    const openRouter = new O.OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY
    })

    const response = await openRouter.chat.send({
        chatRequest: {
            //model: 'openai/gpt-5.4-nano',
            model: 'google/gemini-2.5-flash-lite',
            reasoning: {
                effort: 'none',
                //effort: 'medium',
            },
            stream: false,
            messages: [
                {
                    role: 'system',
                    content: prompt.trim() + '\n',
                },
                {
                    role: 'user',
                    content: '```\n' + jobDescription + '```',
                },
            ],
        },
    })
    log('Generated response: ', JSON.stringify(response))
    return '' + response.choices[0].message.content
}

/*
const systemPrompt = `
Below is a job description. Identify the title of the role and job location.

Output is JSON with the following format: {"title":"Some Title","location":"Some Location"}.
Do not respond with anything else, only JSON.


* If the location is not in the US, "location" should be "other".
* Otherwise, if the job is remote or one of the options is remote, "location" should be "remote".
    - Exception: if the job is "remote in City/State", that does not count.
* Otherwise, if the job has multiple locations, "location" should be "multiple".
* Location should be in "City, ST" format, e.g. "Chicago, IL".

Job description:
`.trim()
*/

;(async () => {
  try {
    const msg = await readMessage();
    const result = await process_request(msg);
    sendMessage({ status: "ok", result });
    log("ok", result);
  } catch (e) {
    log("error", e.message);
    try { sendMessage({ status: "error", message: e.message }); } catch {}
    process.exit(1);
  }
})();
