import { test } from "node:test";
import assert from "node:assert/strict";
import { mascararCpf, mascararCnpj, mascararDocumento, mascararTelefone, mascararCep, documentoCompleto, telefoneValido } from "./mascaras.js";

test("CPF: só números, máscara progressiva e limite de 11 dígitos", () => {
  assert.equal(mascararCpf(""), "");
  assert.equal(mascararCpf("123"), "123");
  assert.equal(mascararCpf("1234"), "123.4");
  assert.equal(mascararCpf("1234567"), "123.456.7");
  assert.equal(mascararCpf("12345678901"), "123.456.789-01");
  assert.equal(mascararCpf("123456789012345"), "123.456.789-01", "corta no limite");
  assert.equal(mascararCpf("abc123.456.789-01xyz"), "123.456.789-01", "ignora letras e já mascarado");
});

test("CNPJ: máscara progressiva e limite de 14 dígitos", () => {
  assert.equal(mascararCnpj("12"), "12");
  assert.equal(mascararCnpj("123"), "12.3");
  assert.equal(mascararCnpj("12345678"), "12.345.678");
  assert.equal(mascararCnpj("123456780001"), "12.345.678/0001");
  assert.equal(mascararCnpj("12345678000195"), "12.345.678/0001-95");
  assert.equal(mascararCnpj("1234567800019599"), "12.345.678/0001-95");
  assert.equal(mascararCnpj("12.345.678/0001-95"), "12.345.678/0001-95", "idempotente");
});

test("documento: por tipo ou decidindo pela quantidade de dígitos", () => {
  assert.equal(mascararDocumento("12345678901", "PF"), "123.456.789-01");
  assert.equal(mascararDocumento("12345678901234", "PJ"), "12.345.678/9012-34");
  assert.equal(mascararDocumento("12345678901"), "123.456.789-01");
  assert.equal(mascararDocumento("123456789012"), "12.345.678/9012", "12 dígitos já vira CNPJ");
  assert.equal(mascararDocumento("123.456.789-01", "PJ"), "12.345.678/901", "trocar PF→PJ reaproveita os dígitos");
});

test("telefone: fixo (10) e celular (11) e limite", () => {
  assert.equal(mascararTelefone(""), "");
  assert.equal(mascararTelefone("2"), "(2");
  assert.equal(mascararTelefone("27"), "(27");
  assert.equal(mascararTelefone("273"), "(27) 3");
  assert.equal(mascararTelefone("2733334455"), "(27) 3333-4455");
  assert.equal(mascararTelefone("27999990000"), "(27) 99999-0000");
  assert.equal(mascararTelefone("279999900001234"), "(27) 99999-0000");
  assert.equal(mascararTelefone("(27) 99999-0000"), "(27) 99999-0000");
});

test("CEP e validações de tamanho", () => {
  assert.equal(mascararCep("29100000"), "29100-000");
  assert.equal(mascararCep("291000001"), "29100-000");
  assert.equal(mascararCep("2910"), "2910");
  assert.equal(documentoCompleto("123.456.789-01", "PF"), true);
  assert.equal(documentoCompleto("123.456.789-0", "PF"), false);
  assert.equal(documentoCompleto("12345678000195", "PJ"), true);
  assert.equal(documentoCompleto("12345678000195", "PF"), false);
  assert.equal(telefoneValido(""), true);
  assert.equal(telefoneValido("(27) 3333-4455"), true);
  assert.equal(telefoneValido("(27) 3333-445"), false);
});
