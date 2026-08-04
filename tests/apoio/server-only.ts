// `server-only` recusa ser importado fora do runtime de servidor do Next: em
// Node puro ele lança na hora do import. Isso tornava intestável todo módulo
// que o declara — inclusive `lib/sinapi/automatic-update.ts`, exatamente o
// caminho que passou quarenta dias quebrado sem que nenhum teste o tocasse.
//
// O alias vive só no vitest (`vitest.config.ts`). No build do Next o pacote
// verdadeiro continua valendo, e continua barrando importação de cliente.
export {};
