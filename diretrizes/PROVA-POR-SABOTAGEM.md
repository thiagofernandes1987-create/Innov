# Prova por sabotagem — todo portão precisa ser provado quebrando o código

**Documento canônico:** sim
**Aplica-se a:** todo teste, validador, verificação de CI e regra de tipo introduzida neste repositório.
**Precedência:** complementa `METODO-DE-TRABALHO.md` §2 (evidência antes de afirmação). Onde §2 exige a saída do comando, este documento exige **a saída do comando com o código errado**.

---

## 1. A regra

> **Portão que nunca foi visto reprovando não foi provado. Antes de declarar um teste ou validador como proteção, quebre de propósito o comportamento que ele deveria proteger, mostre a reprovação, restaure e mostre a aprovação.**

Três saídas, nesta ordem, sempre:

```text
1. verde   — código correto, portão passa
2. vermelho— código sabotado, portão reprova, com a diferença medida
3. verde   — código restaurado, portão passa de novo
```

Sem o passo 2 não existe portão. Existe um arquivo de teste.

---

## 2. Por que esta regra existe, com o número que a motivou

O extrator de PDF (`lib/planilhas/pdf-texto.ts`) carregava **dois defeitos ao mesmo tempo**:

- tratava qualquer literal entre parênteses como texto, inclusive o miolo de um fluxo de imagem;
- lia cada fluxo **duas vezes**, porque `endstream` contém a palavra `stream`.

Para um artefato publicado de ~1.800 caracteres, ele devolvia **730 pedaços e 24.924 caracteres**. Treze vezes o tamanho do documento, em ruído binário, entregue como se fosse a publicação do SINDUSCON.

**Os dois defeitos passaram pela bateria inteira.** Não por falta de teste — havia teste. O teste perguntava se o texto **continha** `"R8-N"`. E continha, ao lado de 23.000 caracteres de lixo. Agulha encontrada, palheiro ignorado.

### 2.1 A medição que fecha o argumento

Ao reintroduzir o primeiro defeito de propósito, contra os dois artefatos reais:

| Métrica | Correto | Sabotado | A antiga asserção pegaria? |
| --- | ---: | ---: | --- |
| caracteres (`composicao_cub_julho_26.pdf`) | 1.849 | 20.191 | — |
| pedaços | 218 | 352 | — |
| **códigos distintos** | **19** | **19** | **não — idêntico** |
| **valores monetários** | **95** | **95** | **não — idêntico** |
| caracteres (`tabela_cub_julho_2026.pdf`) | 2.424 | 20.766 | — |
| **códigos distintos** | **4** | **4** | **não — idêntico** |
| **valores monetários** | **21** | **21** | **não — idêntico** |

As duas linhas em negrito são o ponto inteiro deste documento. O defeito **adiciona** ruído sem **remover** conteúdo. Toda asserção do tipo "contém", "está definido", "é maior que zero" continua verdadeira depois da sabotagem — porque essas asserções perguntam se o esperado está lá, e ele está. Nenhuma delas pergunta **o que mais** está lá.

O segundo defeito, sabotado isoladamente, moveu `fluxosLidos` de 2 para 3, `pedaços` de 90 para 91 e caracteres de 2.424 para 2.442. Diferença de 0,7% — invisível para qualquer asserção que não constranja o número exato.

---

## 3. O que a regra exige de uma asserção

Uma asserção protege quando **nenhuma escrita plausível de código errado a satisfaz por acaso**. Na prática:

- **constranja o resultado inteiro, não uma amostra dele.** `toEqual` sobre um objeto com todas as contagens, em vez de `toContain` sobre um trecho;
- **inclua pelo menos uma métrica de tamanho** — número de itens, de caracteres, de linhas. É ela que detecta o defeito que adiciona sem remover;
- **inclua a ausência.** Zero declarado é medição; campo omitido é silêncio (VACINA-060);
- **verifique identidade antes de conteúdo.** Comparar números contra outro arquivo é comparar contra outra coisa e chamar de regressão — daí o `sha256` do artefato antes das contagens no golden.

O teto de asserções fracas (`pnpm validate:assercoes`, `diretrizes/ASSERCOES-FRACAS-ACEITAS.json`) existe para que a população dessas asserções só possa cair. Ele não julga uma asserção individual; impede que a média piore.

---

## 4. O que sabotar, por tipo de portão

| Portão | A sabotagem que o prova |
| --- | --- |
| teste de comportamento | inverter a condição, remover a guarda, ou reintroduzir o defeito histórico que motivou o teste |
| validador de CI (`validate:*`) | introduzir exatamente uma violação do que ele mede e confirmar `exit 1` com a violação **nomeada** na saída |
| teto numérico (asserções fracas, exports mortos) | subir o número em 1 acima do teto e confirmar reprovação; e conferir que baixar o teto também reprova, para o teto não ser decorativo |
| regra de tipo (`noUnusedLocals`) | deixar uma variável não usada e confirmar que `pnpm typecheck` reprova |
| política de banco (RLS, permissão) | executar a operação com o perfil que **deve** ser recusado, medindo `permitido → negado → permitido` |

Sabotagem de permissão nunca se prova trocando o papel do usuário: o perfil de acesso concede por cima do papel, e a operação continua passando. Prova-se com `user_module_permission_overrides` (`denied = true`), medindo os três estados.

---

## 5. Onde o resultado fica registrado

A sabotagem é executada na sessão, não commitada. O que fica versionado é:

- o teste ou validador na sua forma correta;
- o comentário no topo do arquivo, com **o número que motivou o portão** — os 730 pedaços e 24.924 caracteres, no caso do golden. Portão sem esse número vira, com o tempo, um teste que ninguém sabe por que existe e que a primeira pessoa apressada apaga;
- quando o defeito for inédito, a vacina correspondente, com as cinco perguntas de `METODO-DE-TRABALHO.md` §3.

Artefato binário não é commitado como fixture: 98 KB que ninguém revisa, e que ninguém sabe dizer se ainda representa o publicado quando o leitor muda. O padrão do repositório é o de `sinapi:layout` — o artefato vem de fora por variável de ambiente, o esperado vem do arquivo versionado, e **sem o artefato o teste pula com motivo**, nunca passa em silêncio.

```bash
ARTEFATOS_DE_CUSTO=/caminho/da/pasta pnpm test tests/golden-pdf-publicado.test.ts
```

---

## 6. Quando a regra não se aplica

Não se aplica a teste de tipo puro, a snapshot de documentação e a verificação cuja sabotagem exigiria quebrar dependência de terceiro. Nesses casos, registrar na descrição do teste **por que** a sabotagem não foi executada. Limitação declarada é informação; limitação omitida vira portão presumido.
