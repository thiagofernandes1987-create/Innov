"use client";

import { useId, useState } from "react";
import {
  somenteDigitos,
  formatarCEP,
  formatarDocumento,
  formatarTelefone,
  validarCEP,
  validarDocumento,
  validarEmail,
  validarTelefone,
  type Resultado,
  type TipoPessoa
} from "@/lib/validacao/br";
import { formatarDecimal, lerMoeda, mascararMoeda } from "@/lib/validacao/moeda";

// Campos brasileiros como componentes, não `<input>` cru.
//
// O princípio vem do padrão de mercado: no Odoo, telefone e e-mail são widgets
// (`widget="phone"`, `widget="email"`), não caixas de texto. O componente
// formata enquanto se digita e mostra o erro **no campo**, não em faixa no topo.
//
// A validação aqui é a mesma de `lib/validacao/br.ts` que a ação usa no
// servidor. O navegador orienta cedo; quem recusa continua sendo a ação.
// Contrato em `diretrizes/PADRAO-DE-INTERFACE.md`, seção 6.

type Base = {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Erro vindo do servidor, para o campo já nascer marcado após o retorno. */
  erroServidor?: string | null;
};

type CampoProps = Base & {
  formatar: (valor: string) => string;
  validar: (valor: string) => Resultado;
  inputMode?: "numeric" | "tel" | "email" | "text";
  /** Chamado ao sair do campo com valor válido. */
  aoConfirmar?: (valor: string) => void;
  autoComplete?: string;
  maxLength?: number;
};

function Campo({
  name,
  label,
  defaultValue,
  required,
  disabled,
  placeholder,
  erroServidor,
  formatar,
  validar,
  inputMode = "text",
  autoComplete,
  maxLength,
  aoConfirmar
}: CampoProps) {
  const id = useId();
  const [valor, setValor] = useState(() => formatar(String(defaultValue ?? "")));
  const [erro, setErro] = useState<string | null>(erroServidor ?? null);
  const [tocado, setTocado] = useState(Boolean(erroServidor));

  // Enquanto digita, o erro some: acusar a cada tecla atrapalha quem ainda não
  // terminou de preencher.
  function aoDigitar(bruto: string) {
    setValor(formatar(bruto));
    if (erro) setErro(null);
  }

  function aoSair() {
    setTocado(true);
    if (!valor.trim()) {
      setErro(required ? `${label} é obrigatório.` : null);
      return;
    }
    const resultado = validar(valor);
    setErro(resultado.valido ? null : (resultado.erro ?? "Valor inválido."));
    if (resultado.valido) aoConfirmar?.(valor);
  }

  const invalido = Boolean(erro) && tocado;
  const idErro = `${id}-erro`;

  return (
    <label className={invalido ? "campo-br campo-br-invalido" : "campo-br"}>
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        id={id}
        name={name}
        value={valor}
        onChange={event => aoDigitar(event.target.value)}
        onBlur={aoSair}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={invalido || undefined}
        aria-describedby={invalido ? idErro : undefined}
      />
      {invalido ? (
        <small className="campo-br-erro" id={idErro} role="alert">
          {erro}
        </small>
      ) : null}
    </label>
  );
}

export function CampoDocumento({ tipoPessoa, ...props }: Base & { tipoPessoa?: TipoPessoa }) {
  return (
    <Campo
      {...props}
      formatar={valor => formatarDocumento(valor, tipoPessoa)}
      validar={valor => validarDocumento(valor, tipoPessoa)}
      inputMode="numeric"
      maxLength={18}
      placeholder={props.placeholder ?? (tipoPessoa === "COMPANY" ? "00.000.000/0000-00" : "000.000.000-00")}
    />
  );
}

export function CampoTelefone(props: Base) {
  return (
    <Campo
      {...props}
      formatar={formatarTelefone}
      validar={validarTelefone}
      inputMode="tel"
      autoComplete="tel"
      maxLength={15}
      placeholder={props.placeholder ?? "(00) 00000-0000"}
    />
  );
}

/**
 * CEP com preenchimento de endereço.
 *
 * A consulta vai para `/api/cep`, que chama o serviço no servidor: a CSP
 * restringe `connect-src` a `'self'`, então o navegador não fala com o
 * ViaCEP direto — e afrouxar a política por causa de um campo seria um mau
 * negócio.
 *
 * Preenche apenas campo que estiver **vazio**: sobrescrever o que a pessoa
 * digitou é a forma mais rápida de fazê-la desconfiar do formulário.
 */
export function CampoCEP({
  camposEndereco,
  ...props
}: Base & {
  /** Nomes dos campos a preencher: `{ logradouro, bairro, cidade, uf }`. */
  camposEndereco?: { logradouro?: string; bairro?: string; cidade?: string; uf?: string };
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function preencher(valor: string) {
    if (!camposEndereco) return;
    if (!validarCEP(valor).valido) return;

    setBuscando(true);
    setAviso(null);
    try {
      const resposta = await fetch(`/api/cep/${somenteDigitos(valor)}`, { cache: "no-store" });
      const dados = (await resposta.json()) as {
        encontrado?: boolean;
        erro?: string;
        logradouro?: string;
        bairro?: string;
        cidade?: string;
        uf?: string;
      };
      if (!dados.encontrado) {
        setAviso(dados.erro ?? "Não foi possível consultar o CEP.");
        return;
      }
      const alvo = (nome: string | undefined, conteudo: string | undefined) => {
        if (!nome || !conteudo) return;
        const campo = document.querySelector<HTMLInputElement>(`[name="${nome}"]`);
        if (campo && !campo.value.trim()) {
          campo.value = conteudo;
          campo.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };
      alvo(camposEndereco.logradouro, dados.logradouro);
      alvo(camposEndereco.bairro, dados.bairro);
      alvo(camposEndereco.cidade, dados.cidade);
      alvo(camposEndereco.uf, dados.uf);
    } catch {
      // Serviço fora do ar nunca bloqueia o cadastro.
      setAviso("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="campo-br-cep">
      <Campo
        {...props}
        formatar={formatarCEP}
        validar={validarCEP}
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={9}
        placeholder={props.placeholder ?? "00000-000"}
        aoConfirmar={preencher}
      />
      {buscando ? <small className="campo-br-aviso">Buscando endereço…</small> : null}
      {aviso && !buscando ? <small className="campo-br-aviso">{aviso}</small> : null}
    </div>
  );
}

export function CampoEmail(props: Base) {
  return (
    <Campo
      {...props}
      formatar={valor => valor.trimStart()}
      validar={validarEmail}
      inputMode="email"
      autoComplete="email"
      maxLength={254}
      placeholder={props.placeholder ?? "nome@dominio.com.br"}
    />
  );
}

/**
 * Campo de valor monetário.
 *
 * Substitui `<input type="number" step="0.01">`, que no teclado brasileiro é
 * uma armadilha: quem digita "1.500" querendo mil e quinhentos grava **um e
 * meio**. Erro de três ordens de grandeza num campo de dinheiro.
 *
 * A máscara é a de caixa — o número entra pela direita, em centavos — e o valor
 * enviado ao servidor vai num `input` oculto já normalizado, com ponto decimal,
 * para a ação não precisar adivinhar formato. O campo visível fica com
 * `inputMode="numeric"`, que abre o teclado numérico no telefone.
 */
export function CampoMoeda({
  name,
  label,
  defaultValue,
  required,
  placeholder,
  ajuda
}: {
  name: string;
  label: string;
  defaultValue?: number | string | null;
  required?: boolean;
  placeholder?: string;
  ajuda?: string;
}) {
  const id = useId();
  const inicial = defaultValue === null || defaultValue === undefined || defaultValue === ""
    ? ""
    : formatarDecimal(Number(defaultValue));
  const [texto, setTexto] = useState(inicial);
  const numero = lerMoeda(texto);

  return (
    <label className="campo-br" htmlFor={id}>
      <span>{label}</span>
      <span className="campo-moeda">
        <span className="campo-moeda-simbolo" aria-hidden="true">R$</span>
        <input
          id={id}
          value={texto}
          onChange={evento => setTexto(mascararMoeda(evento.target.value))}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder ?? "0,00"}
          required={required}
          aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        />
      </span>
      {/* O servidor recebe o número já normalizado; a máscara é só para os olhos. */}
      <input type="hidden" name={name} value={numero === null ? "" : String(numero)} />
      {ajuda ? <small id={`${id}-ajuda`} className="campo-br-aviso">{ajuda}</small> : null}
    </label>
  );
}
