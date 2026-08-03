// Credencial do loop de QA vem do ambiente, nunca do código.
//
// A homologação usa credencial fraca conhecida — dívida assumida e datada em
// T-23.26.4 do inventário. Enquanto ela existir, o mínimo é não deixá-la
// escrita num arquivo versionado: quem roda o arnês informa, e quem trocar a
// senha não precisa procurar onde ela ficou copiada.
export function credencial(nome) {
  const valor = process.env[nome];
  if (!valor) {
    console.error(
      `${nome} não definida. O arnês de QA entra na aplicação como uma persona real:\n` +
        "  QA_USER=<e-mail> QA_PASS=<senha> pnpm qa:visual <modulo> <rota>"
    );
    process.exit(2);
  }
  return valor;
}
