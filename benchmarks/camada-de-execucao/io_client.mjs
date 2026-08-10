// Micro-problema 2 — lado Node. Mesmo trabalho do io_client.go: K jobs em voo,
// cada um assinado e enviado ao provedor falso. Node não tem goroutine; a
// concorrência vem do laço de eventos, com um pool de K promessas.
import fs from "node:fs";
import http from "node:http";
import { createHash, createHmac } from "node:crypto";

const total = Number(process.argv[2]);
const concorrencia = Number(process.argv[3]);
const corpo = fs.readFileSync(new URL("./payload.json", import.meta.url));
const SEGREDO = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Equivalente ao http.Transport do Go: reuso de conexão com teto igual.
const agente = new http.Agent({ keepAlive: true, maxSockets: concorrencia, maxFreeSockets: concorrencia });

function rssPicoKB() {
  for (const linha of fs.readFileSync("/proc/self/status", "utf8").split("\n")) {
    if (linha.startsWith("VmHWM:")) return Number(linha.split(/\s+/)[1]);
  }
  return 0;
}

function enviarUm(i) {
  const canonica = [
    String(Date.now()),
    "nonce-" + i,
    "POST",
    "/v1/messages/dispatch",
    createHash("sha256").update(corpo).digest("hex")
  ].join(".");
  const assinatura = createHmac("sha256", SEGREDO).update(canonica).digest("hex");

  return new Promise(resolve => {
    const req = http.request({
      host: "127.0.0.1", port: 8791, path: "/v1/messages/dispatch", method: "POST",
      agent: agente,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": corpo.length,
        "x-innov-signature": assinatura
      }
    }, resp => {
      resp.resume();
      resp.on("end", () => resolve(true));
    });
    req.on("error", () => resolve(false));
    req.end(corpo);
  });
}

let proximo = 0, ok = 0, falhas = 0;
const inicio = process.hrtime.bigint();

await Promise.all(Array.from({ length: concorrencia }, async () => {
  while (proximo < total) {
    const i = proximo++;
    if (await enviarUm(i)) ok++; else falhas++;
  }
}));

const segundos = Number(process.hrtime.bigint() - inicio) / 1e9;
console.log(JSON.stringify({
  runtime: "node " + process.versions.node,
  total, concorrencia,
  segundos: segundos.toFixed(3),
  jobs_por_seg: Math.round(ok / segundos),
  ok, falhas,
  rss_pico_kb: rssPicoKB()
}));
