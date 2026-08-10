// Prevenção executável da VACINA-052-EMBED-AMBIGUO-DEVOLVE-PGRST201-E-DERRUBA-A-CONSULTA-INTEIRA.md.
//
// Convergência do PR #42 com a `main` reparada: os dois lados corrigiram o mesmo
// defeito de janela — associar o `.select()` de um encadeamento ao `.from()` do
// anterior, inventando um PGRST200. A `main` parava no próximo `.from()`; a
// versão daqui para no fim do statement respeitando literais, que é o corte
// correto, e por isso ela prevalece. O que veio da `main` foi o nome do arquivo
// da vacina, renomeado na auditoria de regressão.
//
// O validador reconstrói o grafo de relacionamentos PostgREST a partir das
// migrations. Desde o hardening multi-tenant do RH, uma migration final remove
// FKs simples quando existe uma FK composta equivalente com organization_id.
// Portanto o grafo estático precisa representar o estado FINAL do schema, e não
// somar relações históricas que já foram removidas em runtime.

import fs from "node:fs";
import path from "node:path";

const raiz=process.cwd();
const MIGRATIONS=path.join(raiz,"supabase","migrations");
const PASTAS=["app","lib","components"];
const RH_DEDUP_MIGRATION=/20260809134500_rh_remove_redundant_single_fks\.sql$/;

function arquivosSql(){
 if(!fs.existsSync(MIGRATIONS))return[];
 return fs.readdirSync(MIGRATIONS).filter(n=>n.endsWith(".sql")).sort().map(nome=>({nome,texto:fs.readFileSync(path.join(MIGRATIONS,nome),"utf8")}));
}

function blocosDeCriacao(sql){
 const blocos=[];const inicio=/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)\s*\(/gi;let m;
 while((m=inicio.exec(sql))){let profundidade=1,i=inicio.lastIndex;while(i<sql.length&&profundidade>0){if(sql[i]==="(")profundidade++;else if(sql[i]===")")profundidade--;i++;}blocos.push({tabela:m[1],corpo:sql.slice(inicio.lastIndex,i-1)});}
 return blocos;
}

function splitTopLevel(texto){
 const partes=[];let inicio=0,profundidade=0,aspas=null;
 for(let i=0;i<texto.length;i++){
  const ch=texto[i];
  if(aspas){if(ch===aspas&&texto[i-1]!=="\\")aspas=null;continue;}
  if(ch==="'"||ch==='"'){aspas=ch;continue;}
  if(ch==="(")profundidade++;else if(ch===")")profundidade--;else if(ch===","&&profundidade===0){partes.push(texto.slice(inicio,i));inicio=i+1;}
 }
 partes.push(texto.slice(inicio));return partes;
}

function cols(raw){return raw.split(",").map(v=>v.trim().replace(/^"|"$/g,"").toLowerCase()).filter(Boolean);}
function defaultFkName(table,column){return `${table}_${column}_fkey`;}
function edge({origem,destino,sourceCols=[],destCols=[],constraint=null,arquivo}){return{origem,destino,sourceCols,destCols,constraint,arquivo};}

function parseCreateEdges(bloco,arquivo){
 const edges=[];
 for(const itemRaw of splitTopLevel(bloco.corpo)){
  const item=itemRaw.trim();if(!item)continue;
  const tableFk=/^(?:constraint\s+([a-z0-9_]+)\s+)?foreign\s+key\s*\(([^)]+)\)\s*references\s+public\.([a-z0-9_]+)\s*\(([^)]+)\)/i.exec(item);
  if(tableFk){edges.push(edge({origem:bloco.tabela,destino:tableFk[3],sourceCols:cols(tableFk[2]),destCols:cols(tableFk[4]),constraint:tableFk[1]??null,arquivo}));continue;}
  const inline=/^"?([a-z0-9_]+)"?\s+[\s\S]*?references\s+public\.([a-z0-9_]+)\s*\(([^)]+)\)/i.exec(item);
  if(inline){edges.push(edge({origem:bloco.tabela,destino:inline[2],sourceCols:[inline[1].toLowerCase()],destCols:cols(inline[3]),constraint:defaultFkName(bloco.tabela,inline[1].toLowerCase()),arquivo}));}
 }
 return edges;
}

function parseAlterEdges(sql,arquivo){
 const edges=[];
 for(const trechoRaw of sql.split(/;/)){
  const trecho=trechoRaw.trim();
  const alter=/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?public\.([a-z0-9_]+)/i.exec(trecho);if(!alter)continue;
  const origem=alter[1];
  const named=/add\s+constraint\s+([a-z0-9_]+)\s+foreign\s+key\s*\(([^)]+)\)\s*references\s+public\.([a-z0-9_]+)\s*\(([^)]+)\)/i.exec(trecho);
  if(named){edges.push(edge({origem,destino:named[3],sourceCols:cols(named[2]),destCols:cols(named[4]),constraint:named[1],arquivo}));continue;}
  const addColumn=/add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?"?([a-z0-9_]+)"?\s+[\s\S]*?references\s+public\.([a-z0-9_]+)\s*\(([^)]+)\)/i.exec(trecho);
  if(addColumn){edges.push(edge({origem,destino:addColumn[2],sourceCols:[addColumn[1].toLowerCase()],destCols:cols(addColumn[3]),constraint:defaultFkName(origem,addColumn[1].toLowerCase()),arquivo}));}
 }
 return edges;
}

function fallbackEdges(sql,arquivo,structured){
 const extras=[];
 for(const bloco of blocosDeCriacao(sql)){
  for(const m of bloco.corpo.matchAll(/references\s+public\.([a-z0-9_]+)/gi)){
   if(!structured.some(e=>e.origem===bloco.tabela&&e.destino===m[1]))extras.push(edge({origem:bloco.tabela,destino:m[1],arquivo}));
  }
 }
 for(const trecho of sql.split(/;/)){
  const alter=/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?public\.([a-z0-9_]+)/i.exec(trecho);if(!alter)continue;
  for(const m of trecho.matchAll(/references\s+public\.([a-z0-9_]+)/gi))if(!structured.some(e=>e.origem===alter[1]&&e.destino===m[1]))extras.push(edge({origem:alter[1],destino:m[1],arquivo}));
 }
 return extras;
}

function includesAll(haystack,needles){return needles.every(v=>haystack.includes(v));}
function removeRhTenantRedundancy(edges){
 const cleanupPresent=arquivosSql().some(({nome})=>RH_DEDUP_MIGRATION.test(nome));if(!cleanupPresent)return edges;
 return edges.filter(simple=>{
  if(!simple.origem.startsWith("rh_")||!simple.destino.startsWith("rh_"))return true;
  if(!simple.sourceCols.length||simple.sourceCols.includes("organization_id"))return true;
  const stronger=edges.some(composite=>composite!==simple&&composite.origem===simple.origem&&composite.destino===simple.destino&&composite.sourceCols.length>simple.sourceCols.length&&composite.sourceCols.includes("organization_id")&&composite.destCols.includes("organization_id")&&includesAll(composite.sourceCols,simple.sourceCols)&&includesAll(composite.destCols,simple.destCols));
  return !stronger;
 });
}

function arestasDasMigrations(){
 let edges=[];
 for(const{nome,texto}of arquivosSql()){
  const limpo=texto.replace(/--[^\n]*/g,"");const structured=[];
  for(const bloco of blocosDeCriacao(limpo))structured.push(...parseCreateEdges(bloco,nome));
  structured.push(...parseAlterEdges(limpo,nome));edges.push(...structured,...fallbackEdges(limpo,nome,structured));
  for(const trecho of limpo.split(/;/)){
   const alter=/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?public\.([a-z0-9_]+)/i.exec(trecho);if(!alter)continue;
   for(const drop of trecho.matchAll(/drop\s+constraint\s+(?:if\s+exists\s+)?([a-z0-9_]+)/gi))edges=edges.filter(e=>!(e.origem===alter[1]&&e.constraint===drop[1]));
  }
 }
 return removeRhTenantRedundancy(edges);
}

function paresAmbiguos(arestas){const contagem=new Map();for(const{origem,destino}of arestas){if(origem===destino)continue;const chave=[origem,destino].sort().join(" ");contagem.set(chave,(contagem.get(chave)??0)+1);}return new Set([...contagem.entries()].filter(([,n])=>n>1).map(([chave])=>chave));}
function arquivosDeCodigo(dir){const saida=[];if(!fs.existsSync(dir))return saida;for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(item.name==="node_modules"||item.name.startsWith("."))continue;const caminho=path.join(dir,item.name);if(item.isDirectory())saida.push(...arquivosDeCodigo(caminho));else if(/\.(ts|tsx)$/.test(item.name))saida.push(caminho);}return saida;}
function embedsDoSelect(base,select,linha){const achados=[],pilha=[base];for(let i=0;i<select.length;i++){if(select[i]===")"){if(pilha.length>1)pilha.pop();continue;}if(select[i]!=="(")continue;const antes=/([a-z0-9_]+)(?:!([a-z0-9_]+))?\s*$/i.exec(select.slice(0,i));if(!antes){pilha.push(pilha[pilha.length-1]);continue;}const modificador=antes[2];achados.push({base:pilha[pilha.length-1],relacionada:antes[1],nomeada:Boolean(modificador)&&!["inner","left"].includes(modificador.toLowerCase()),linha});pilha.push(antes[1]);}return achados;}

function fimDoStatement(texto,inicio){
 // Supabase chains no repositório são statements terminados por ';'. Limitar a
 // busca evita associar um .from() ao .select() da instrução seguinte em código
 // minificado. Respeita strings/templates para não parar em ';' dentro de literal.
 let quote=null,escape=false,templateDepth=0;
 for(let i=inicio;i<texto.length;i++){
  const ch=texto[i];
  if(escape){escape=false;continue;}
  if(quote){if(ch==="\\"){escape=true;continue;}if(ch===quote){quote=null;continue;}if(quote==="`"&&ch==="$"&&texto[i+1]==="{"){templateDepth++;i++;}continue;}
  if(ch==="'"||ch==='"'||ch==="`"){quote=ch;continue;}
  if(templateDepth>0){if(ch==="{")templateDepth++;else if(ch==="}")templateDepth--;continue;}
  if(ch===";")return i+1;
 }
 return texto.length;
}

function embedsDoArquivo(texto){
 const achados=[],from=/\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/gi;let m;
 while((m=from.exec(texto))){
  const end=fimDoStatement(texto,m.index),statement=texto.slice(m.index,end),select=/\.select\(\s*(["'`])([\s\S]*?)\1/.exec(statement);if(!select)continue;
  const linha=texto.slice(0,m.index).split("\n").length;achados.push(...embedsDoSelect(m[1],select[2],linha));
 }
 return achados;
}

const arestas=arestasDasMigrations();const ambiguos=paresAmbiguos(arestas);const existe=new Set(arestas.filter(a=>a.origem!==a.destino).map(a=>[a.origem,a.destino].sort().join(" ")));const tabelas=new Set([...arestas.flatMap(a=>[a.origem,a.destino]),...arquivosSql().flatMap(({texto})=>[...texto.replace(/--[^\n]*/g,"").matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi)].map(m=>m[1]))]);
const problemas=[];let selectsLidos=0;
for(const pasta of PASTAS)for(const arquivo of arquivosDeCodigo(path.join(raiz,pasta))){const texto=fs.readFileSync(arquivo,"utf8");for(const{base,relacionada,nomeada,linha}of embedsDoArquivo(texto)){if(!tabelas.has(relacionada)||!tabelas.has(base))continue;selectsLidos++;const chave=[base,relacionada].sort().join(" ");if(!existe.has(chave)){problemas.push(`${path.relative(raiz,arquivo)}:${linha} — embed \`${relacionada}(...)\` a partir de \`${base}\`: não há chave estrangeira entre as duas tabelas. O PostgREST devolve PGRST200 e a consulta inteira falha — leia em duas consultas.`);continue;}if(nomeada||!ambiguos.has(chave))continue;problemas.push(`${path.relative(raiz,arquivo)}:${linha} — embed \`${relacionada}(...)\` a partir de \`${base}\` é ambíguo: há mais de um caminho entre as duas tabelas. Nomeie a chave (\`${relacionada}!nome_da_constraint(...)\`), senão o PostgREST devolve PGRST201 e a consulta inteira falha.`);}}
if(problemas.length){console.error("Embeds ambíguos no PostgREST:\n");for(const problema of problemas)console.error(`  - ${problema}`);console.error(`\n${problemas.length} embed(s) reprovado(s). Pares com mais de um caminho: ${ambiguos.size}.`);process.exit(1);}
console.log(`Embeds do PostgREST conferidos: ${selectsLidos} embed(s) em ${arestas.length} chave(s) estrangeira(s) finais, ${ambiguos.size} par(es) ambíguo(s), nenhum sem chave nomeada.`);
