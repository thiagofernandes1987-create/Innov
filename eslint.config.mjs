import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // `docs/referencias` guarda material de origem recebido do responsável —
  // blueprint e executable spec. É referência histórica, não código da
  // plataforma, e nenhuma parte da aplicação importa de lá.
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts", "docs/referencias/**"])
]);
