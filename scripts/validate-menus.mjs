import fs from "node:fs";

// Todo destino de menu da barra superior tem página no repositório.
//
// A lista de menus é escrita à mão — é a única forma de dizer que "Leads" vem
// antes de "Oportunidades", que nenhuma convenção de pasta expressa. O preço de
// escrever à mão é errar o caminho, e um menu que abre 404 é pior que a barra
// vazia: quem clica conclui que o sistema está quebrado, não que o menu está.
//
// Aqui a lista é confrontada com o roteador real do Next: cada `href` precisa
// ter `page.tsx` na pasta correspondente, ou casar com um segmento dinâmico.

const fonte = fs.readFileSync("lib/casca/menus.ts", "utf8");
const destinos = [...fonte.matchAll(/href:\s*"([^"]+)"/g)].map(m => m[1]);

if (destinos.length === 0) {
  console.error("Nenhum destino de menu encontrado em lib/casca/menus.ts.");
  process.exit(1);
}

/** `/app/pipeline/cliente` casa com `app/app/pipeline/[trilha]/page.tsx`. */
function existePagina(href) {
  const partes = href.replace(/^\//, "").split("/").filter(Boolean);
  let atual = "app";
  for (const parte of partes) {
    const direto = `${atual}/${parte}`;
    if (fs.existsSync(direto) && fs.statSync(direto).isDirectory()) {
      atual = direto;
      continue;
    }
    const dinamico = fs
      .readdirSync(atual, { withFileTypes: true })
      .filter(item => item.isDirectory() && /^\[.+\]$/.test(item.name))
      .map(item => item.name)[0];
    if (!dinamico) return false;
    atual = `${atual}/${dinamico}`;
  }
  return fs.existsSync(`${atual}/page.tsx`);
}

const quebrados = destinos.filter(href => !existePagina(href));

if (quebrados.length > 0) {
  console.error(`Menus com destino inexistente (${quebrados.length}):`);
  for (const href of quebrados) console.error(`- ${href}`);
  process.exit(1);
}

const unicos = new Set(destinos);
console.log(`Menus validados: ${destinos.length} destinos (${unicos.size} distintos), todos com página no roteador.`);
