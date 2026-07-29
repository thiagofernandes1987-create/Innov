# Atualização automática do SINAPI

**Estado:** implementação em andamento  
**Fonte:** CAIXA — relatórios mensais SINAPI em ZIP/XLSX  
**Regra de segurança:** nenhum dado é importado se descoberta, download, ZIP, XLSX, cabeçalhos ou volume mínimo falharem.

## 1. Objetivo

Permitir que um usuário autorizado, na tela `/app/orcamentos/sinapi`, selecione a UF e o regime e acione **Atualizar SINAPI automaticamente**.

O servidor deve executar sem upload manual:

1. descobrir o pacote XLSX mais recente publicado pela CAIXA;
2. baixar o ZIP apenas de domínio oficial;
3. limitar tempo e tamanho do download;
4. validar assinatura ZIP e SHA-256;
5. extrair em memória, sem gravar caminhos fornecidos pelo arquivo;
6. abrir os XLSX sem macros;
7. localizar relatórios de insumos e composições da UF/regime;
8. detectar cabeçalhos por semântica, sem depender de posição fixa;
9. validar data-base e quantidade mínima de linhas;
10. importar por chunks no catálogo versionado;
11. concluir o lote ou registrar falha;
12. nunca alterar custos já copiados para versões históricas de orçamento.

## 2. Escopo do botão

Cada execução trata somente:

```yaml
organization: organização ativa
region: UF selecionada na tela
tax_relief: regime selecionado na tela
```

O pacote nacional pode conter todas as UFs, mas arquivos não relacionados à seleção não são processados.

## 3. Descoberta da publicação

Ordem:

1. `SINAPI_XLSX_URL`, quando configurada, desde que seja HTTPS e domínio CAIXA;
2. página oficial de downloads da categoria SINAPI;
3. pasta oficial de relatórios mensais a partir de 2025;
4. página institucional do SINAPI;
5. candidatos mensais oficiais recentes, quando a listagem não expuser links estáticos.

Somente são aceitos links:

- HTTPS;
- `caixa.gov.br` ou subdomínio;
- caminho associado aos relatórios SINAPI;
- identificação de pacote XLSX;
- conteúdo iniciado por assinatura ZIP.

Redirecionamentos são revalidados em cada salto. Redirecionamento para domínio externo é recusado.

## 4. Limites e ZIP seguro

O processador deve:

- limitar o arquivo compactado;
- limitar número de entradas;
- limitar tamanho descompactado por entrada e no total;
- bloquear arquivos criptografados;
- bloquear ZIP64 não suportado;
- bloquear caminhos absolutos e `..`;
- bloquear taxas de compressão incompatíveis com uso legítimo;
- aceitar somente métodos `stored` e `deflate`;
- nunca extrair para o filesystem.

## 5. XLSX

O leitor utiliza somente XML do padrão XLSX:

```text
xl/workbook.xml
xl/_rels/workbook.xml.rels
xl/sharedStrings.xml
xl/worksheets/*.xml
```

Não executa fórmulas, macros, links externos ou objetos incorporados. Apenas valores armazenados nas células são lidos.

Os cabeçalhos são normalizados sem acentos e comparados com aliases de:

- código;
- descrição;
- unidade;
- preço/custo;
- UF;
- regime;
- tipo de insumo.

A coluna de custo deve corresponder ao regime solicitado quando o arquivo trouxer mais de uma coluna de preço.

## 6. Fail-closed

A execução falha antes da importação quando ocorrer qualquer condição abaixo:

- pacote oficial não encontrado;
- download fora do domínio permitido;
- conteúdo não ZIP;
- nenhum XLSX;
- data-base não identificada;
- relatório da UF/regime não localizado;
- cabeçalhos obrigatórios ausentes;
- registros abaixo do mínimo técnico;
- custo inválido ou volume anormal;
- lote concorrente recente para o mesmo hash.

## 7. Idempotência e concorrência

A chave técnica é:

```text
organização + UF + data-base + regime + SHA-256
```

Se um lote igual já estiver concluído, o botão retorna “base já atualizada”.

Uma trava transacional impede duas importações simultâneas da mesma chave. Lotes `RUNNING` recentes não podem ser reiniciados; lotes falhos ou abandonados podem ser retomados.

## 8. Evidência na interface

A tela deve mostrar:

- botão de atualização;
- UF e regime que serão atualizados;
- mensagem de sucesso, base já atualizada ou falha;
- último status do lote;
- data-base;
- quantidades de insumos, composições e rejeições;
- horário de início/fim;
- origem oficial.

## 9. Permissões

Podem acionar o botão:

```text
SUPER_ADMIN
DIRECAO
ADMINISTRADOR
ORCAMENTISTA
```

A operação usa `service_role` apenas no servidor. A chave nunca é enviada ao navegador.

## 10. Critério de conclusão

A funcionalidade será considerada concluída quando:

- build e typecheck passarem;
- parser tiver teste com ZIP/XLSX sintético;
- teste de idempotência e guardas do banco passar;
- deployment estiver `READY`;
- nenhum novo advisor crítico for introduzido;
- uma execução real conseguir descobrir e interpretar o arquivo oficial, ou registrar de forma explícita e segura a incompatibilidade encontrada.
