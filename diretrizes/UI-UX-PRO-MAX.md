# UI/UX Pro Max — Diretriz canônica da Innovar Platform

**Documento canônico:** sim  
**Versão:** 1.1.0
**Aplicação inicial:** Etapa 20 — Prontidão de Produção  
**Atualizado em:** 28 de julho de 2026

## 1. Propósito

Este documento transforma a UI/UX Pro Max em regra permanente de produto para a Innovar Platform. Ele deve ser consultado em toda criação ou alteração de página, fluxo, componente, estado, navegação, formulário, tabela, dashboard ou portal.

A plataforma não deve parecer um template SaaS genérico. A experiência deve comunicar:

- precisão de engenharia;
- organização de obra;
- confiança operacional;
- rastreabilidade;
- acabamento de alto padrão;
- clareza para usuários técnicos e não técnicos.

## 2. Direção visual autoral

### Conceito

**Arquitetura em operação.**

A interface combina a disciplina de uma prancha técnica com a materialidade de uma obra de alto padrão. Estrutura, alinhamento, proporção, hierarquia e informação possuem prioridade sobre decoração.

### Fonte visual aprovada

O launcher escuro versionado em `docs/referencias/visual/launcher-dark-target-2026-07-28.png`
é a fonte visual de verdade da casca e da tela de aplicativos. Interações
referenciadas no Odoo devem ser traduzidas para essa identidade, sem copiar sua
marca. O portão de fidelidade está em `diretrizes/ALVO-VISUAL.md` e na
`VACINA-027`.

### Paleta canônica

| Token | Uso | Referência |
|---|---|---|
| `--ink` | navegação e fundos críticos | azul quase preto |
| `--navy` | superfícies institucionais | azul profundo |
| `--brand` | ações primárias e foco de marca | azul estrutural |
| `--brand-strong` | hover e contraste | azul intenso |
| `--copper` | detalhe premium e indicadores | cobre envelhecido |
| `--copper-soft` | fundos de destaque | cobre claro |
| `--limestone` | fundos naturais | calcário claro |
| `--paper` | fundo principal | papel quente |
| `--surface` | superfícies operacionais | branco controlado |
| `--text` | conteúdo principal | azul grafite |
| `--muted` | conteúdo secundário | cinza azulado |
| `--border` | divisores e contornos | cinza mineral |

O cobre é acento, não cor dominante. Rosa, fúcsia, neon e gradientes chamativos não pertencem à identidade canônica.

## 2.1 Marca — manual oficial

O responsável entregou o manual da marca em 3 de agosto. Ele é a fonte, e o que
estiver escrito aqui cede a ele em caso de divergência.

| Cor | HEX | RGB | Uso |
|---|---|---|---|
| Azul-marinho profundo | `#0F1E3A` | 15 30 58 | superfície institucional, barra superior, símbolo |
| Bronze dourado | `#C59A5B` | 197 154 91 | acento, filete, assinatura — nunca corpo de texto |
| Off-white | `#F6F4F1` | 246 244 241 | papel, fundo do símbolo sobre a barra escura |
| Grafite | `#2D3137` | 45 49 55 | texto de apoio e estruturas secundárias |

Assinatura verbal: **"Um novo jeito de construir!"** Essência declarada:
solidez, sofisticação, inovação e confiança.

Arquivos em `public/marca/`:

```text
innovar-icone.png          claro: quadrado marinho, iN em off-white, cantos transparentes
innovar-icone-escuro.png   escuro: só o iN em bronze, sem quadrado
innovar-icone-grande.png   o mesmo símbolo em resolução maior
innovar-horizontal.png     lockup completo com assinatura, para documento e e-mail
```

**Duas variantes, e o motivo é físico.** No tema escuro o quadrado marinho do
símbolo encosta no fundo e desaparece — sobra um retângulo vazio onde deveria
estar a marca. A variante escura larga o quadrado e fica só com o **iN em
bronze** `#C59A5B`, que é cor da própria marca: 6,3:1 sobre o azul-marinho da
barra. Foi escolha do responsável entre cinza e dourado, em 3 de agosto.

A troca é por `display: none`, nunca por opacidade: o que está escondido não
deve ocupar espaço nem ser lido. O componente `MarcaInnovar` carrega as duas e
serve barra, login e portal do cliente — cópia solta de `<Image>` em cada
superfície seria uma chance a mais de alguém apontar para o arquivo errado.

**O símbolo é imagem, não letra.** Até 3 de agosto a barra desenhava as letras
"IN" em cobre sobre o azul-marinho: 2,87:1, e era a **única reprovação de
contraste que restava em todas as telas medidas**. Imagem não tem contraste de
texto a cumprir, e o nome ao lado continua em texto de verdade — é ele que o
leitor de tela anuncia e a busca do navegador encontra. Depois da troca, a
auditoria fecha em **0 reprovação nos dois temas**.

## 3. Tipografia

- usar pilha local e segura, sem depender de fonte remota para renderizar;
- títulos: `Manrope`, `Inter`, sistema sans-serif;
- corpo: `Inter`, sistema sans-serif;
- códigos, IDs e hashes: `IBM Plex Mono`, sistema monoespaçado;
- máximo recomendado de 68 caracteres por linha em conteúdo textual longo;
- títulos devem ser curtos, informativos e orientados à tarefa;
- evitar caixa alta em parágrafos; caixa alta é reservada a eyebrows, status e cabeçalhos compactos.

## 4. Escala e composição

### Grid

- conteúdo principal: máximo de `1320px`;
- espaçamento base: múltiplos de 4px;
- espaços preferenciais: 8, 12, 16, 20, 24, 32, 40 e 56px;
- grids devem colapsar sem scroll horizontal, exceto tabelas ou artefatos que o exijam;
- cards devem representar agrupamentos reais, nunca apenas preencher espaço.

### Cantos e profundidade

- raio principal entre 12 e 18px;
- botões e campos entre 8 e 12px;
- pílula somente para badges, filtros e estados;
- sombras discretas; hierarquia deve vir primeiro de contraste, espaçamento e borda;
- não usar glassmorphism em superfícies operacionais.

## 5. Navegação

- menu deve exibir somente módulos autorizados;
- navegação deve permanecer reconhecível em desktop, tablet e celular;
- ícone nunca substitui rótulo quando houver espaço;
- agrupamentos e estados ativos devem ser perceptíveis sem depender apenas de cor;
- deve existir link de salto para o conteúdo principal;
- títulos de página e contexto organizacional devem permanecer claros;
- sair da sessão não pode competir visualmente com a tarefa principal.

## 6. Componentes

### Botões

- altura mínima: 44px;
- ação primária: preenchida com cor de marca;
- ação secundária: superfície clara e borda mineral;
- ação destrutiva: semântica explícita, confirmação proporcional ao risco;
- estado desabilitado deve informar indisponibilidade sem parecer ação ativa;
- ícones devem acompanhar texto em ações não triviais.

### Campos

- rótulo visível; placeholder não substitui label;
- erro ligado ao campo e descrito em texto;
- foco visível com contraste suficiente;
- ajuda contextual próxima ao ponto de decisão;
- datas, moedas e documentos devem respeitar locale `pt-BR`;
- campos sensíveis não devem revelar valores em logs ou mensagens de erro.

### Cards

- card operacional precisa ter propósito: resumo, ação, estado ou agrupamento;
- evitar mosaico de cartões idênticos sem hierarquia;
- cards clicáveis precisam de foco, hover discreto e área inteira acionável;
- títulos e ações devem seguir ordem de leitura consistente;
- estados críticos precisam de texto e ícone, não apenas cor.

### Tabelas

- cabeçalho persistente quando a densidade justificar;
- alinhamento numérico à direita quando comparativo;
- filtros e ordenação devem indicar estado;
- ações por linha não devem desaparecer em hover;
- mobile deve oferecer reflow, prioridade de colunas ou visualização de detalhe;
- scroll horizontal deve ser declarado e acessível quando inevitável.

### Badges e status

- usar vocabulário de domínio consistente;
- `success`, `warning`, `danger`, `info` e `neutral` possuem texto e contraste próprios;
- nunca usar somente verde/vermelho para comunicar resultado;
- status de workflow deve corresponder ao contrato do banco.

## 7. Estados obrigatórios

Toda tela que depende de dados deve prever:

1. carregando;
2. vazio;
3. sucesso;
4. erro recuperável;
5. erro bloqueante;
6. acesso negado;
7. indisponibilidade externa;
8. conexão lenta ou offline quando aplicável;
9. ação em andamento;
10. confirmação concluída.

Empty states devem explicar o motivo e a próxima ação possível. Skeletons devem reproduzir a estrutura real, sem animação excessiva.

## 8. Acessibilidade

Meta mínima: **WCAG 2.2 nível AA**.

- navegação completa por teclado;
- foco visível em todos os controles;
- ordem de foco coerente;
- link de salto;
- alvo mínimo de 44×44px para ações principais;
- contraste mínimo conforme WCAG;
- headings em ordem semântica;
- landmarks e labels acessíveis;
- mensagens de erro identificáveis por leitor de tela;
- zoom de 200% sem perda funcional;
- reflow até 320px sem scroll horizontal global;
- não depender apenas de cor, posição ou animação;
- respeitar `prefers-reduced-motion`;
- conteúdo dinâmico relevante deve usar anúncio acessível quando necessário.

## 9. Motion e feedback

- duração padrão entre 120 e 220ms;
- movimento deve esclarecer relação, estado ou resposta;
- hover discreto: elevação de 1–2px ou mudança de contraste;
- não animar grandes superfícies continuamente;
- loading não deve causar layout shift evitável;
- usuários com redução de movimento recebem transições praticamente instantâneas.

## 10. Responsividade

### Desktop

- casca superior em duas faixas, sem sidebar no aplicativo interno;
- conteúdo em grid com densidade controlada;
- rail lateral somente quando agrega contexto contínuo.

### Tablet

- menus do aplicativo em seletor compacto, com os mesmos destinos do desktop;
- grids de quatro colunas reduzem para duas;
- ações permanecem visíveis e legíveis.

### Mobile

- navegação deve ser alcançável sem esconder módulos essenciais;
- grids viram uma coluna quando o conteúdo exigir;
- formulário não deve exigir zoom;
- tabelas adotam reflow, detalhe ou scroll contido;
- ações primárias não podem ficar fora da área visível por causa de barras fixas.

## 11. Segurança percebida

A interface deve tornar limites de segurança compreensíveis:

- organização e obra ativas visíveis;
- dados sensíveis identificados sem revelar conteúdo indevido;
- acesso negado explícito;
- operações críticas com justificativa, alçada ou MFA quando exigidos;
- imutabilidade explicada como proteção, não como falha;
- download privado não deve parecer URL pública;
- auditoria e correlação devem possuir linguagem compreensível.

## 12. Exceções por superfície

### Área interna

Prioriza densidade, velocidade, filtros, teclado e rastreabilidade.

### Portal do cliente

Prioriza clareza, linguagem simples, progresso, documentos liberados e chamados próprios. Nunca expõe pipeline, custos internos, mensagens internas ou diagnósticos.

### Assinatura

Prioriza confiança, evidência, leitura do documento, progresso e confirmação. Campos devem ser grandes e inequívocos.

### Auditoria

Prioriza busca, filtros, severidade, correlação e leitura de metadados sanitizados. Dados técnicos não devem comprometer legibilidade.

## 13. Padrões proibidos

- preset SaaS rosa ou fúcsia;
- gradiente decorativo sem função;
- excesso de cards brancos idênticos;
- ícone como único rótulo em ações importantes;
- emoji como componente funcional principal;
- botão abaixo de 44px em fluxo crítico;
- texto cinza de baixo contraste;
- hover como único acesso a uma ação;
- animação contínua em dashboard;
- `outline: none` sem substituição;
- estado representado somente por cor;
- CSS inline repetitivo quando existe padrão reutilizável;
- inventar métricas, depoimentos ou dados operacionais na interface.

## 14. Pipeline obrigatório de UI/UX

```text
contexto e usuário
→ objetivo da tela
→ arquitetura da informação
→ estados e permissões
→ fluxo de teclado
→ composição responsiva
→ tokens e componentes canônicos
→ implementação
→ validação automática
→ revisão visual com conteúdo real
→ acessibilidade
→ evidência no PR
```

## 15. Checklist de entrega

- [ ] objetivo e usuário da tela documentados;
- [ ] hierarquia de informação revisada;
- [ ] estados obrigatórios implementados;
- [ ] permissões refletidas na interface e no servidor;
- [ ] desktop, tablet e mobile revisados;
- [ ] teclado e foco testados;
- [ ] contraste e zoom testados;
- [ ] `prefers-reduced-motion` respeitado;
- [ ] dados reais ou fixtures representativas usados na revisão;
- [ ] nenhuma métrica inventada;
- [ ] classes e tokens canônicos reutilizados;
- [ ] lint, typecheck, testes, build e `validate:stage20` verdes;
- [ ] evidências e limitações registradas no PR.

## 16. Governança

Alterações relevantes de identidade, navegação, tokens, acessibilidade ou componentes-base devem atualizar este documento no mesmo PR.

Exceções precisam declarar:

- superfície afetada;
- necessidade do desvio;
- impacto em acessibilidade;
- alternativa avaliada;
- prazo ou condição para convergência.

A UI/UX Pro Max é uma diretriz permanente da Innovar Platform e não uma decoração exclusiva da Etapa 20.
