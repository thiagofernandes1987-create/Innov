import Image from "next/image";

// A marca da Innovar.
//
// Duas peças, e a separação é decisão do responsável em 3 de agosto:
//
//   **símbolo sozinho** na lateral de toda tela do aplicativo. *"Quero
//   construir minha identidade, precisam olhar o logo e identificar a marca."*
//   Símbolo acompanhado do nome escrito nunca é aprendido — quem lê a palavra
//   não precisa reconhecer a forma, e a forma é o que se quer que fique.
//
//   **lockup horizontal**, com nome e assinatura, **só no login**. É a primeira
//   tela, é onde o nome tem função: dizer de quem é a plataforma para quem
//   ainda não sabe.
//
// O nome sai da tela, não da acessibilidade: quem usa o símbolo dá rótulo ao
// elemento que o contém. Símbolo sozinho sem rótulo é um botão mudo.

/** Símbolo iN. Branco por padrão, para viver sobre o azul-marinho da casca. */
export function MarcaInnovar({
  className = "",
  tamanho = 46,
  variante = "branco"
}: {
  className?: string;
  tamanho?: number;
  variante?: "branco" | "marinho" | "bronze";
}) {
  const arquivo = {
    branco: "/marca/innovar-icone-branco.png",
    marinho: "/marca/innovar-icone.png",
    bronze: "/marca/innovar-icone-escuro.png"
  }[variante];
  return (
    <Image
      className={`marca-innovar ${className}`.trim()}
      src={arquivo}
      alt=""
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
    />
  );
}

/**
 * Lockup horizontal — símbolo, nome e assinatura.
 *
 * Duas variantes porque a superfície muda de cor com o tema: no claro o nome é
 * azul-marinho, no escuro é branco. A assinatura fica em bronze nos dois, que é
 * como o manual a desenha.
 */
export function LockupInnovar({ largura = 300 }: { largura?: number }) {
  const altura = Math.round((largura * 120) / 689);
  return (
    <span className="lockup-innovar">
      <Image
        className="lockup-innovar-claro"
        src="/marca/innovar-horizontal.png"
        alt="Innovar — um novo jeito de construir"
        width={largura}
        height={altura}
        priority
      />
      <Image
        className="lockup-innovar-escuro"
        src="/marca/innovar-horizontal-escuro.png"
        alt="Innovar — um novo jeito de construir"
        width={largura}
        height={altura}
        priority
      />
    </span>
  );
}
