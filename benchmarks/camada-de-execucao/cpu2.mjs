// Micro-problema 1, decomposto — lado Node. Mesmas três etapas do cpu2.go,
// mesmo payload, mesma ordem: serialização isolada, criptografia isolada e o
// job completo. Separar importa porque a conclusão muda conforme onde o custo
// esteja: se estiver na criptografia, é OpenSSL nos dois e a linguagem não
// decide nada.
import fs from "node:fs";
import { createHash, createHmac } from "node:crypto";

const envelope = JSON.parse(fs.readFileSync(new URL("./payload.json", import.meta.url), "utf8"));
const SEGREDO = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const corpoFixo = Buffer.from(JSON.stringify(envelope), "utf8");

function medir(nome, n, f) {
  let sumidouro = 0;
  for (let i = 0; i < 20000; i++) sumidouro ^= f(i);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i++) sumidouro ^= f(i);
  const ns = Number(process.hrtime.bigint() - t0);
  return {
    etapa: nome,
    ns_por_job: Math.round(ns / n),
    jobs_por_segundo: Math.round(n / (ns / 1e9)),
    sumidouro
  };
}

function assinar(body, i) {
  const canonica = [
    String(1754835120000 + i),
    "nonce-" + i,
    "POST",
    "/v1/messages/dispatch",
    createHash("sha256").update(body).digest("hex")
  ].join(".");
  return createHmac("sha256", SEGREDO).update(canonica).digest()[0];
}

const N = 200000;
const etapas = [
  medir("serializacao", N, i => {
    envelope.delivery.sequenceNumber = i;
    return Buffer.byteLength(JSON.stringify(envelope), "utf8");
  }),
  medir("criptografia", N, i => assinar(corpoFixo, i)),
  medir("job_completo", N, i => {
    envelope.delivery.sequenceNumber = i;
    return assinar(Buffer.from(JSON.stringify(envelope), "utf8"), i);
  })
];

console.log(JSON.stringify({
  runtime: "node " + process.versions.node,
  bytes_do_corpo: corpoFixo.length,
  jobs: N,
  etapas
}));
