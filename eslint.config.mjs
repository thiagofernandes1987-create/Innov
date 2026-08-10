import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // `docs/referencias` guarda material de origem recebido do responsável —
  // blueprint e executable spec. É referência histórica, não código da
  // plataforma, e nenhuma parte da aplicação importa de lá.
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts", "docs/referencias/**"]),
  // `scripts/` é ferramenta de linha de comando em Node. Não há React ali, e a
  // regra `react-hooks/rules-of-hooks` decide o que é hook **pelo nome**: todo
  // identificador que comece com `use` vira "hook chamado fora de componente".
  //
  // O falso positivo apareceu com `useMultiFileAuthState`, que é API do Baileys
  // para carregar credenciais de um diretório — nome escolhido por eles, não por
  // nós. Desligar a regra só aqui é o corte certo: ela continua valendo em `app`
  // e `components`, que é onde existe React. O alternativo seria um `disable`
  // por linha, que teria de ser reescrito a cada `use*` novo de terceiro.
  {
    files: ["scripts/**/*.{js,mjs,cjs,ts}"],
    rules: { "react-hooks/rules-of-hooks": "off" }
  }
]);
