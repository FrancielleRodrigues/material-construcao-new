import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarEndereco, formatarEnderecoEntrega } from "./format.js";

const end = { logradouro: "Rua das Flores", numero: "120", complemento: "Casa 2", referencia: "ao lado da padaria", bairro: "Centro", cidade: "Viana", uf: "ES" };

test("endereço de entrega traz complemento e ponto de referência; o endereço comum não muda", () => {
  assert.equal(formatarEndereco(end), "Rua das Flores, 120 - Centro - Viana/ES");
  assert.equal(formatarEnderecoEntrega(end), "Rua das Flores, 120 - Centro - Viana/ES - Casa 2 - Ref.: ao lado da padaria");
  assert.equal(formatarEnderecoEntrega({ ...end, complemento: "", referencia: "" }), "Rua das Flores, 120 - Centro - Viana/ES");
  assert.equal(formatarEnderecoEntrega(null), "");
});
