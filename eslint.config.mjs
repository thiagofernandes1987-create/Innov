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
  // O laboratório descartável do Baileys é Node puro, não React, e a regra
  // `react-hooks/rules-of-hooks` decide o que é hook **pelo nome**: todo
  // identificador iniciado por `use` vira "hook chamado fora de componente". A
  // API do Baileys que carrega credenciais de um diretório tem exatamente essa
  // forma de nome — escolhida por eles, não por nós.
  //
  // Este comentário não escreve o identificador de propósito. O
  // `validate-messaging-session-store` proíbe esse nome **em qualquer arquivo**
  // fora de `tests/disposable-baileys-lab/`, e a proibição é textual: citá-lo
  // aqui reprovava o portão, e reprovou. A guarda está certa — o que ela
  // confina é a gravação de credencial do WhatsApp em diretório, e confinar por
  // texto é o que a torna impossível de contornar com um `import` esperto.
  {
    files: ["tests/disposable-baileys-lab/**/*.{js,mjs,cjs,ts}"],
    rules: { "react-hooks/rules-of-hooks": "off" }
  }
]);
