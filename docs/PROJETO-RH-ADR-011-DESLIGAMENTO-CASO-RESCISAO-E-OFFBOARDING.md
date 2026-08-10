# Projeto RH — ADR-011 — Desligamento como Caso Auditável, Rescisão Versionada e Offboarding Independente

**Versão:** 0.1.0  
**Estado:** decisão funcional registrada; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Contexto

O encerramento de uma relação de trabalho produz efeitos jurídicos, financeiros, previdenciários, fundiários, operacionais, documentais e de segurança. Esses efeitos não acontecem necessariamente no mesmo instante nem são comprovados pelo mesmo documento.

Um único campo `status = desligado` não é suficiente para representar:

- iniciativa e fundamento do encerramento;
- pedido, aprovação e comunicação;
- aviso prévio e sua projeção;
- último dia trabalhado;
- data jurídica de término;
- cálculo rescisório;
- pagamento efetivo;
- quitação discriminada;
- evento enviado ao eSocial;
- FGTS rescisório e indenização compensatória;
- requerimento de seguro-desemprego, quando aplicável;
- devolução de bens e EPIs;
- revogação de acessos;
- encerramento de benefícios;
- transferência de responsabilidades;
- pendências financeiras ou judiciais;
- correção, retificação, reintegração ou reversão posterior.

O sistema precisa preservar a diferença entre intenção, decisão, fato, cálculo, pagamento, declaração e encerramento operacional.

---

## 2. Decisão

O Projeto RH adotará o seguinte fluxo canônico:

```text
Intenção ou gatilho
  → caso de desligamento
    → fundamento e validações
      → aprovação
        → aviso e projeção
          → ocorrência do término
            → cálculo rescisório versionado
              → documentos e ciência
                → pagamento e recolhimentos
                  → eventos externos
                    → offboarding operacional
                      → conclusão auditável
```

As seguintes entidades serão independentes:

```text
Caso de desligamento
  ≠ motivo legal
  ≠ aviso prévio
  ≠ ocorrência de término
  ≠ execução de cálculo
  ≠ documento rescisório
  ≠ pagamento
  ≠ evento governamental
  ≠ guia ou recolhimento
  ≠ checklist de offboarding
  ≠ encerramento do vínculo
```

---

## 3. Caso de desligamento

O caso será a unidade auditável que coordena o processo sem substituir seus fatos componentes.

Campos conceituais:

- organização, empresa e estabelecimento;
- trabalhador e vínculo;
- contrato e versão vigente de origem;
- tipo de caso;
- iniciativa;
- fundamento interno;
- motivo legal aplicável;
- motivo externo mapeado;
- data proposta;
- data do conhecimento;
- data de abertura;
- responsável;
- aprovadores;
- confidencialidade;
- risco jurídico;
- evidências;
- dependências;
- bloqueios;
- prazos;
- estado;
- versão.

### Estados mínimos

```text
RASCUNHO
SOLICITADO
EM_TRIAGEM
EM_ANALISE
PENDENTE_EVIDENCIA
PENDENTE_APROVACAO
APROVADO
AVISO_ATIVO
TERMINO_PROGRAMADO
CALCULO_EM_PREPARACAO
CALCULO_APROVADO
DOCUMENTOS_PENDENTES
PAGAMENTO_PENDENTE
EVENTOS_EXTERNOS_PENDENTES
OFFBOARDING_PENDENTE
CONCLUIDO
CANCELADO
REABERTO
EM_DISPUTA
```

O estado do caso será derivado de componentes e pendências, não um substituto para o estado de cada componente.

---

## 4. Motivo interno, fundamento jurídico e código externo

O sistema manterá três camadas separadas:

1. **razão administrativa interna**, com acesso restrito;
2. **fundamento jurídico aprovado**, com evidências e pareceres;
3. **código do sistema externo**, conforme versão do leiaute.

O catálogo poderá contemplar, entre outros:

- dispensa sem justa causa;
- pedido de demissão;
- dispensa por justa causa;
- rescisão indireta reconhecida ou formalizada;
- extinção por acordo entre as partes;
- término normal de contrato por prazo determinado;
- término antecipado por iniciativa do empregador;
- término antecipado por iniciativa do trabalhador;
- falecimento;
- força maior ou extinção da atividade, quando aplicável;
- culpa recíproca reconhecida;
- transferência entre declarantes;
- sucessão ou mudança de identificação;
- término de trabalhador sem vínculo;
- determinação judicial;
- outras hipóteses configuradas e validadas.

Transferência entre estabelecimentos do mesmo declarante não será tratada automaticamente como desligamento.

Nenhum catálogo interno decidirá sozinho direitos ou verbas. A aplicação dependerá de regra versionada e validação jurídica.

---

## 5. Aviso prévio

O aviso será objeto próprio e poderá registrar:

- parte notificante;
- data de concessão;
- modalidade trabalhada, indenizada, mista ou não aplicável;
- duração e regra de origem;
- projeção do término;
- redução de jornada ou dias;
- opção do trabalhador;
- dispensa do cumprimento;
- faltas e intercorrências;
- reconsideração;
- aceite ou recusa da reconsideração;
- alteração de motivo durante o aviso;
- documento e ciência;
- versão.

A data de comunicação, o último dia efetivamente trabalhado, a data do desligamento e a data projetada do aviso serão campos distintos.

A projeção do aviso poderá afetar tempo de serviço, férias, décimo terceiro, estabilidade, reajustes e obrigações externas conforme regra vigente. Esses efeitos serão calculados, não presumidos por um campo único.

---

## 6. Proteções, impedimentos e estabilidade

Antes da aprovação, o sistema executará verificações configuráveis, incluindo:

- afastamento ativo;
- acidente de trabalho e estabilidade correlata;
- gestação e licença relacionada;
- representação sindical;
- CIPA e outras garantias;
- pré-aposentadoria prevista em instrumento coletivo;
- doença ocupacional ou restrição;
- garantia decorrente de acordo ou convenção coletiva;
- contrato suspenso;
- ordem judicial;
- investigação ou denúncia protegida;
- período de experiência ou contrato a termo;
- aprendizagem;
- trabalhador menor;
- pessoa com deficiência e obrigações de cota, quando aplicável;
- dispensa coletiva ou programa de desligamento;
- bloqueios internos de compliance.

O resultado poderá ser:

```text
SEM_BLOQUEIO_IDENTIFICADO
REVISAO_OBRIGATORIA
APROVACAO_ESPECIAL
BLOQUEADO
DEPENDENTE_DE_DECISAO_EXTERNA
```

A ausência de alerta automático não será parecer jurídico.

---

## 7. Justa causa e casos sensíveis

A justa causa não será selecionada como atalho de cálculo.

O caso exigirá, conforme política:

- descrição objetiva do fato;
- data, local e contexto;
- enquadramento proposto;
- evidências íntegras;
- depoimentos e contraditório quando aplicável;
- histórico disciplinar permitido;
- verificação de imediatidade, proporcionalidade e gradação;
- análise jurídica;
- aprovação segregada;
- documento final;
- controle de acesso reforçado.

Acusações, investigações e evidências não serão exibidas a gestores sem finalidade ou permissão.

A reversão posterior não apagará o caso original; criará decisão corretiva, nova execução de cálculo e impactos explícitos.

---

## 8. Ocorrência de término e encerramento do vínculo

O vínculo permanecerá ativo até a ocorrência de término juridicamente aplicável.

A ocorrência registrará:

- data do término;
- último dia trabalhado;
- data projetada do aviso;
- motivo aprovado;
- versão contratual encerrada;
- origem da decisão;
- responsável;
- correlação com o caso;
- evento externo correspondente;
- estado de confirmação.

Estados possíveis:

```text
PLANEJADA
CONFIRMADA
CORRIGIDA
RETIFICADA
ANULADA
REVERTIDA_POR_REINTEGRACAO
```

O encerramento não apagará lotações, alocações, equipes, exposições, documentos, marcações ou históricos.

---

## 9. Cálculo rescisório

O cálculo utilizará o motor do Módulo 09.

Cada execução manterá:

- tipo de rescisão;
- data-base;
- versão do contrato;
- aviso e projeção;
- população e vínculo;
- remunerações fixas e variáveis;
- médias e períodos considerados;
- saldos de salário;
- férias vencidas e proporcionais;
- décimo terceiro;
- adicionais e diferenças;
- descontos autorizados;
- pensões e ordens judiciais;
- empréstimos e consignações;
- benefícios;
- banco de horas;
- verbas indenizatórias;
- incidências;
- bases e encargos;
- indenização compensatória de FGTS;
- parâmetros e instrumentos coletivos;
- arredondamentos;
- memória de cálculo;
- hash e versão.

Verbas não serão hardcoded pelo nome do motivo. A composição dependerá de regras versionadas, fatos e vigências.

O recálculo gerará nova execução. A execução aprovada não será sobrescrita.

---

## 10. Pagamento, quitação e diferenças

Serão mantidos separadamente:

- valor devido;
- valor aprovado;
- valor pago;
- data e meio de pagamento;
- comprovante;
- pagamento parcial;
- devolução ou rejeição bancária;
- diferença posterior;
- complemento;
- estorno;
- compensação autorizada;
- quitação discriminada.

O recibo de quitação não transformará parcela não discriminada em quitada.

Diferença decorrente de erro original será tratada como correção ou retificação. Diferença cujo direito surgiu depois do desligamento será tratada como fato posterior, sem reescrever silenciosamente a rescisão original.

---

## 11. Documentos

O caso poderá produzir ou receber:

- pedido de demissão;
- aviso prévio;
- comunicação de dispensa;
- termo de acordo;
- decisão disciplinar;
- TRCT e demonstrativos;
- memória de cálculo;
- recibo de pagamento;
- comprovantes bancários;
- documentos de FGTS;
- requerimento ou comunicação relacionada ao seguro-desemprego;
- termos de devolução;
- declaração de responsabilidades;
- termo de confidencialidade pós-contrato;
- documentos de assistência ou homologação quando aplicável;
- decisão judicial;
- termo de reintegração ou reversão.

Documento assinado será evidência. A fonte canônica permanecerá nos fatos e versões estruturadas.

---

## 12. Eventos e integrações externas

O Módulo 10 projetará os eventos externos a partir dos fatos aprovados.

Integrações previstas:

- `S-2299` — desligamento;
- `S-2399` — término de trabalhador sem vínculo;
- `S-1210` — pagamentos;
- `S-2298` — reintegração;
- `S-3000` — exclusão quando aplicável;
- eventos periódicos e totalizadores relacionados;
- FGTS Digital e remunerações para fins rescisórios;
- indenização compensatória;
- guias e pagamentos;
- CTPS Digital;
- seguro-desemprego quando aplicável;
- sistemas financeiros e bancários.

Evento aceito não concluirá automaticamente pagamento, offboarding ou quitação.

Período fechado poderá exigir reabertura antes de determinadas transmissões ou retificações.

---

## 13. Offboarding operacional

O offboarding será um caso operacional relacionado, mas independente da extinção contratual.

Itens possíveis:

- revogação de conta e sessões;
- remoção de permissões;
- bloqueio de acesso físico;
- devolução de notebook, celular, ferramentas, cartões e chaves;
- devolução, descarte ou baixa de EPIs;
- encerramento de acesso a obras e frentes;
- transferência de arquivos e responsabilidades;
- passagem de conhecimento;
- encerramento de procurações;
- cancelamento ou continuidade de benefícios;
- acerto de adiantamentos;
- conciliação de despesas;
- devolução de documentos;
- encerramento de alojamento, transporte ou alimentação;
- comunicação a clientes e equipes;
- retenção legal de dados;
- entrevista de desligamento;
- confirmação final.

A revogação emergencial de acesso poderá ocorrer antes do término contratual por decisão autorizada, sem alterar automaticamente o vínculo.

A ausência de devolução de bem não impedirá a comunicação legal do desligamento; gerará pendência própria e tratamento autorizado.

---

## 14. Desligamentos coletivos e programas

O sistema poderá agrupar casos por:

- dispensa coletiva;
- encerramento de obra;
- redução de quadro;
- fechamento de estabelecimento;
- sucessão;
- programa de demissão voluntária ou incentivada;
- término de contrato em massa;
- contingência.

O caso coletivo não substituirá os casos individuais. Cada trabalhador terá motivo, cálculo, documentos, pagamentos e eventos próprios.

Critérios de seleção, aprovações e comunicações terão trilha reforçada para análise de discriminação e conformidade.

---

## 15. Reintegração, anulação e decisão posterior

Reintegração não será reativação manual do campo de vínculo.

O fluxo será:

```text
Decisão ou fato de reintegração
  → caso de reintegração
    → impacto no término anterior
      → evento externo
        → reconstrução temporal do vínculo
          → folha e benefícios retroativos
            → restabelecimento operacional
```

A decisão original, o desligamento, os pagamentos e os eventos permanecerão no histórico.

Anulação por erro cadastral será diferente de reintegração jurídica.

---

## 16. Modelo temporal

O módulo distinguirá:

- data do fato;
- data da comunicação;
- data de concessão do aviso;
- último dia trabalhado;
- data de desligamento;
- data projetada;
- data de cálculo;
- data de aprovação;
- data de pagamento;
- data de transmissão;
- data de processamento externo;
- data de conclusão operacional;
- instante de registro no sistema.

Correções retroativas gerarão impactos explícitos em folha, ponto, férias, benefícios, SST, contabilidade, eventos e acessos.

---

## 17. Segurança e privacidade

- casos sensíveis terão compartimentos de acesso;
- evidências disciplinares não aparecerão em pesquisa geral;
- documentos judiciais serão protegidos;
- dados bancários terão acesso restrito;
- logs não conterão conteúdo sensível;
- exportações serão auditadas;
- o trabalhador acessará apenas documentos e informações autorizados;
- retenção seguirá categoria, fundamento e política vigente;
- exclusão lógica não apagará evidência que deva ser preservada.

---

## 18. Consequências

### Positivas

- cálculo e encerramento reproduzíveis;
- menor risco de perda de evidências;
- distinção entre obrigação legal e tarefa operacional;
- reconciliação entre devido, pago e declarado;
- suporte a correções e reintegrações;
- integração segura com folha, eSocial, FGTS Digital e Financeiro;
- controle de ativos e acessos sem alterar fatos trabalhistas.

### Custos

- mais estados e entidades;
- maior necessidade de regras temporais;
- integração entre muitos módulos;
- governança de documentos sensíveis;
- homologação jurídica, contábil e operacional obrigatória.

---

## 19. Alternativas rejeitadas

### 19.1 Atualizar apenas `employment_status = terminated`

Rejeitada porque perde aviso, motivo, cálculo, pagamento, documentos, eventos e offboarding.

### 19.2 Usar o S-2299 como fonte canônica

Rejeitada porque o evento é projeção externa e não substitui o caso interno.

### 19.3 Encerrar acessos somente após concluir toda a rescisão

Rejeitada porque riscos de segurança podem exigir bloqueio emergencial separado.

### 19.4 Apagar desligamento cancelado

Rejeitada porque cancelamentos e reconsiderações precisam permanecer auditáveis.

### 19.5 Permitir edição direta de cálculo aprovado

Rejeitada porque impede reprodução e auditoria.

---

## 20. Baseline oficial consultada

Em 6 de agosto de 2026 foram verificadas fontes oficiais:

- CLT compilada, especialmente arts. 477, 479, 480, 482, 483, 484-A e 487 a 491;
- Lei nº 12.506/2011 sobre aviso prévio;
- Lei nº 8.036/1990 e regulamentação do FGTS;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- eventos S-2298, S-2299, S-2399, S-1210 e S-3000;
- Manual do FGTS Digital versão 1.70, de 12 de junho de 2026;
- leiaute de Remunerações para Fins Rescisórios versão 1.2;
- orientações oficiais sobre seguro-desemprego.

A baseline confirma que pagamento, documentos, comunicação da extinção, evento de desligamento, FGTS e acesso a benefícios possuem regras e comprovações distintas.

Prazos, motivos, verbas, incidências, códigos e interpretações deverão ser revalidados antes da implementação, homologação e produção.

---

## 21. Estado honesto

Esta ADR registra uma decisão funcional.

Não foram implementados:

- tabelas;
- migrations;
- motor rescisório;
- documentos;
- assinaturas;
- pagamentos;
- integrações bancárias;
- eventos do eSocial;
- FGTS Digital;
- seguro-desemprego;
- offboarding;
- revogação de acessos;
- testes de produção.
