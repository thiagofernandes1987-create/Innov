// Dispara a atualização do SINAPI contra uma instância do app que **tenha** a
// chave de serviço — hoje, a que o trabalho agendado sobe no próprio runner.
//
// T-37.2. O script não lê planilha nem fala com o banco: quem faz isso é
// `runSinapiAutomaticUpdate`, do lado do servidor, atrás de
// `/api/internal/sinapi-atualizacao`. Aqui só ficam a orquestração por UF e
// regime e o relatório — de propósito, para não existirem duas implementações
// do mesmo importador divergindo em silêncio, que foi o defeito da T-37.7.
//
//   SINAPI_APP_URL=http://127.0.0.1:3000 \
//   CRON_SECRET=... SINAPI_ORGANIZATION_ID=<uuid> \
//   node scripts/importar-sinapi.mjs --uf SP,RJ --regime ambos
//
// Sem `--aplicar` ele confere e não grava.

import fs from "node:fs";

const argumentos = process.argv.slice(2);
const valorDe = nome => {
  const indice = argumentos.indexOf(`--${nome}`);
  return indice >= 0 ? argumentos[indice + 1] : undefined;
};

const base = (process.env.SINAPI_APP_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const segredo = (process.env.CRON_SECRET ?? "").trim();
const organizacao = (process.env.SINAPI_ORGANIZATION_ID ?? "").trim();
const aplicar = argumentos.includes("--aplicar");
const relatorioEm = valorDe("relatorio") ?? "sinapi-importacao.json";

const ufs = (valorDe("uf") ?? "SP")
  .split(",")
  .map(item => item.trim().toUpperCase())
  .filter(Boolean);

// Os dois regimes são o padrão de propósito: importar só um deixa metade do
// catálogo velha, e nada na tela diz qual metade.
const regimeBruto = (valorDe("regime") ?? "ambos").toLowerCase();
const regimes =
  regimeBruto === "ambos"
    ? [false, true]
    : regimeBruto === "desonerado"
      ? [true]
      : regimeBruto === "nao-desonerado"
        ? [false]
        : null;

const faltando = [];
if (!segredo || segredo.length < 32) faltando.push("CRON_SECRET (mínimo 32 caracteres)");
if (aplicar && !/^[0-9a-f-]{36}$/i.test(organizacao)) faltando.push("SINAPI_ORGANIZATION_ID (uuid)");
if (!regimes) faltando.push("--regime válido: ambos, desonerado ou nao-desonerado");
if (ufs.some(uf => !/^[A-Z]{2}$/.test(uf))) faltando.push(`--uf com siglas válidas (recebido: ${ufs.join(",")})`);

if (faltando.length) {
  console.error("Configuração ausente ou inválida:");
  for (const item of faltando) console.error(`  - ${item}`);
  process.exit(1);
}

async function conferir(uf, desonerado) {
  const url = new URL(`${base}/api/internal/sinapi-source-probe-v2`);
  url.searchParams.set("token", "sinapi-source-probe-v2-20260729-f19c8");
  url.searchParams.set("region", uf);
  url.searchParams.set("relief", String(desonerado));
  const resposta = await fetch(url);
  const corpo = await resposta.json();
  if (!resposta.ok || corpo.ok === false) {
    throw new Error(corpo.error ?? `sonda respondeu ${resposta.status}`);
  }
  return {
    dataBase: corpo.result.baseDate,
    insumos: corpo.result.inputs,
    composicoes: corpo.result.compositions
  };
}

async function importar(uf, desonerado) {
  const resposta = await fetch(`${base}/api/internal/sinapi-atualizacao`, {
    method: "POST",
    headers: { authorization: `Bearer ${segredo}`, "content-type": "application/json" },
    body: JSON.stringify({ organizationId: organizacao, region: uf, taxRelief: desonerado })
  });
  const corpo = await resposta.json();
  if (!resposta.ok) throw new Error(corpo.message ?? `a rota respondeu ${resposta.status}`);
  return corpo.resultado;
}

const linhas = [];
for (const uf of ufs) {
  for (const desonerado of regimes) {
    const rotulo = `${uf} ${desonerado ? "com" : "sem"} desoneração`;
    try {
      if (aplicar) {
        const feito = await importar(uf, desonerado);
        linhas.push({ uf, desonerado, situacao: feito.status, ...feito });
        console.log(`${rotulo}: ${feito.status} — ${feito.inputs} insumos, ${feito.compositions} composições`);
      } else {
        const lido = await conferir(uf, desonerado);
        linhas.push({ uf, desonerado, situacao: "conferido", ...lido });
        console.log(`${rotulo}: ${lido.insumos} insumos, ${lido.composicoes} composições, base ${lido.dataBase}`);
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Falha desconhecida.";
      linhas.push({ uf, desonerado, situacao: "falhou", erro: mensagem });
      console.error(`${rotulo}: FALHOU — ${mensagem}`);
    }
  }
}

const falhas = linhas.filter(linha => linha.situacao === "falhou");
const relatorio = {
  aplicado: aplicar,
  executadoEm: new Date().toISOString(),
  combinacoes: linhas.length,
  falhas: falhas.length,
  linhas
};
fs.writeFileSync(relatorioEm, `${JSON.stringify(relatorio, null, 2)}\n`, "utf8");
console.log(`Relatório em ${relatorioEm}: ${linhas.length} combinação(ões), ${falhas.length} falha(s).`);

// Importação parcial que termina em verde é a mesma falha silenciosa da
// T-37.1: a tela mostra preço velho e ninguém é avisado.
if (falhas.length) process.exit(1);
