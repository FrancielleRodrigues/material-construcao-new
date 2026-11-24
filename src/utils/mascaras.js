// Máscaras de campo: a pessoa digita só números e o sistema coloca pontos, traços e parênteses.
// Cada função aceita qualquer texto (inclusive já mascarado), ignora o que não é dígito e corta no limite.

export const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");

export function mascararCpf(valor) {
  const d = soDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function mascararCnpj(valor) {
  const d = soDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

// tipo "PF" → CPF, "PJ" → CNPJ; sem tipo, decide pela quantidade de dígitos (até 11 = CPF).
export function mascararDocumento(valor, tipo) {
  const d = soDigitos(valor);
  const comoCnpj = tipo ? tipo === "PJ" : d.length > 11;
  return comoCnpj ? mascararCnpj(d) : mascararCpf(d);
}

export const TAMANHO_DOCUMENTO = { PF: 11, PJ: 14 };

// Fixo (10 dígitos): (27) 3333-4455; celular (11 dígitos): (27) 99999-0000.
export function mascararTelefone(valor) {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascararCep(valor) {
  return soDigitos(valor).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

// Validações de tamanho (o banco também confere o tamanho do CPF/CNPJ).
export const documentoCompleto = (valor, tipo) => soDigitos(valor).length === TAMANHO_DOCUMENTO[tipo];
export const telefoneValido = (valor) => [0, 10, 11].includes(soDigitos(valor).length); // vazio é permitido
