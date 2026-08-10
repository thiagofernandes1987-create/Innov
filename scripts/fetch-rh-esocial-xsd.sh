#!/usr/bin/env bash
set -euo pipefail

XSD_DIR="${ESOCIAL_XSD_DIR:-/tmp/esocial-xsd}"
ZIP_PATH="${ESOCIAL_XSD_ZIP:-/tmp/esocial-xsd.zip}"
EXPECTED_SHA256="${ESOCIAL_XSD_SHA256:-32535dba33d0470cf44afce410840af450028fd32d3ddf9123f601c45cf9af8e}"
PRIMARY_URL="${ESOCIAL_XSD_URL:-https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/2026-07-01_esquemas_xsd_v_s_01_03_00.zip}"
DOWNLOAD_URL="${ESOCIAL_XSD_DOWNLOAD_URL:-https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/2026-07-01_esquemas_xsd_v_s_01_03_00.zip/@@download/file}"

verify_zip() {
  [[ -f "$ZIP_PATH" ]] || return 1
  printf '%s  %s\n' "$EXPECTED_SHA256" "$ZIP_PATH" | sha256sum --check --status
}

if verify_zip; then
  echo "Pacote XSD eSocial pinado recuperado do cache e validado por SHA-256."
else
  rm -f "$ZIP_PATH" "${ZIP_PATH}.part"
  downloaded=false

  for url in "$DOWNLOAD_URL" "$PRIMARY_URL"; do
    echo "Baixando pacote XSD oficial do eSocial: $url"
    if curl --ipv4 --fail --silent --show-error --location \
      --retry 4 --retry-delay 5 --retry-all-errors \
      --connect-timeout 30 --max-time 180 \
      "$url" --output "${ZIP_PATH}.part"; then
      mv "${ZIP_PATH}.part" "$ZIP_PATH"
      downloaded=true
      break
    fi
    rm -f "${ZIP_PATH}.part"
  done

  if [[ "$downloaded" != true ]]; then
    echo "Não foi possível obter o pacote XSD pelas URLs oficiais do eSocial." >&2
    exit 28
  fi

  if ! verify_zip; then
    actual="$(sha256sum "$ZIP_PATH" | awk '{print $1}')"
    echo "SHA-256 do pacote XSD divergiu do pin aprovado." >&2
    echo "Esperado: $EXPECTED_SHA256" >&2
    echo "Obtido:   $actual" >&2
    echo "A atualização do pacote deve ser revisada explicitamente antes de alterar o pin." >&2
    exit 2
  fi
  echo "Pacote XSD oficial baixado e validado por SHA-256."
fi

rm -rf "$XSD_DIR"
mkdir -p "$XSD_DIR"
unzip -q "$ZIP_PATH" -d "$XSD_DIR"

xsd_count="$(find "$XSD_DIR" -type f -name '*.xsd' | wc -l | tr -d ' ')"
if [[ "$xsd_count" -le 0 ]]; then
  echo "Pacote XSD validado não contém arquivos .xsd." >&2
  exit 3
fi

printf 'XSD eSocial pronto: %s arquivos; SHA-256 %s\n' "$xsd_count" "$EXPECTED_SHA256"
