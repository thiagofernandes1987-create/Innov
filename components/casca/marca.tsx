import Image from "next/image";

// A marca da Innovar, nas duas variantes do manual.
//
// Existe como componente porque aparece em quatro superfícies com fundos
// diferentes — barra do aplicativo, login, portal do cliente e favicon — e cada
// cópia solta do `<Image>` seria uma chance de alguém apontar para o arquivo
// errado ou esquecer a variante escura.
//
// No claro: quadrado marinho com o iN em off-white, como no manual.
// No escuro: só o **iN em bronze**, sem quadrado. O quadrado marinho encostaria
// no fundo escuro e o símbolo sumiria — foi o que o responsável apontou.
export function MarcaInnovar({ className = "", tamanho = 46 }: { className?: string; tamanho?: number }) {
  return (
    <span className={`marca-innovar ${className}`.trim()} aria-hidden="true">
      <Image className="marca-innovar-clara" src="/marca/innovar-icone.png" alt="" width={tamanho} height={tamanho} />
      <Image className="marca-innovar-escura" src="/marca/innovar-icone-escuro.png" alt="" width={tamanho} height={tamanho} />
    </span>
  );
}
