# Relatório de homologação — Etapa 12

**Escopo:** gestão de obras, planejamento, campo, documentos e portal do cliente.  
**Ambiente:** Supabase de homologação.  
**Estado:** migrations aplicadas; CI final em validação.

## Banco aplicado

A Etapa 12 foi instalada em migrations ordenadas por domínio:

1. esquema e tabelas;
2. funções e invariantes;
3. RLS do núcleo da obra;
4. RLS de recursos e equipes;
5. RLS de baselines;
6. RLS de campo e documentos;
7. políticas de Storage;
8. permissões de funções auxiliares;
9. permissões de RPCs de planejamento;
10. permissões de RPCs de campo;
11. índices críticos de desempenho.

## Estrutura validada

- 18 tabelas esperadas;
- 18 tabelas existentes;
- RLS habilitado nas 18 tabelas;
- nenhuma tabela ausente;
- 2 buckets privados;
- funções transacionais disponíveis somente para papéis autorizados;
- execução anônima removida das funções da Etapa 12;
- nenhuma política pública com `USING true` ou `WITH CHECK true`.

## Buckets privados

### `project-documents`

- privado;
- limite de 50 MB;
- PDF, imagens, DOCX e XLSX;
- leitura por registro autorizado e URL assinada;
- escrita restrita à organização e obra presentes no caminho.

### `daily-log-media`

- privado;
- limite de 150 MB;
- imagens, MP4, QuickTime e PDF;
- leitura do cliente somente após aprovação e liberação;
- escrita restrita a quem possui permissão de diário na obra.

## Regras validadas

- obra criada somente a partir de contrato assinado, ativo ou aditado;
- cliente somente acessa obra própria explicitamente liberada;
- tarefa bloqueada exige justificativa;
- progresso fica entre zero e um;
- progresso da obra é recalculado a partir das tarefas;
- baseline congelada é imutável;
- diário possui fluxo rascunho, envio, aprovação ou rejeição;
- diário rejeitado exige motivo;
- conteúdo do diário só chega ao cliente quando aprovado e liberado;
- documento liberado exige SHA-256 e torna a versão imutável;
- uploads permanecem privados;
- ações críticas geram auditoria.

## Desempenho

Foram adicionados índices para os caminhos mais utilizados por RLS e consultas:

- organização e obra;
- hierarquia da EAP e tarefas;
- predecessoras do cronograma;
- recursos e equipes;
- atividades, recursos e mídias do diário;
- documentos, versões e aprovadores;
- snapshots de progresso.

Não foram criados índices indiscriminados em todas as colunas de autoria, para evitar custo desnecessário de escrita.

## Segurança residual

Os advisors do Supabase podem continuar sinalizando funções `SECURITY DEFINER` expostas pelo schema público. As funções da Etapa 12 possuem:

- `search_path` fixo;
- validação interna de organização, obra e papel;
- execução anônima revogada;
- concessão explícita apenas a `authenticated` e `service_role`.

Mover RPCs internas para um schema privado permanece como endurecimento futuro, sem bloquear a homologação atual.

## Critérios restantes

- executar a Etapa 11 autenticada após cadastrar os secrets do ambiente `homologation`;
- testar uploads reais no navegador;
- testar câmera e vídeo em dispositivo móvel;
- testar isolamento administrador x cliente com JWT real;
- validar UX com uma obra piloto;
- realizar revisão final de LGPD e pentest antes da produção.
