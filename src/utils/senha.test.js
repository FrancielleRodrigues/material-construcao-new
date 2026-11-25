import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { gerarSenhaProvisoria, MINIMO_SENHA } from "./senha.js";

const aleatorio = (n) => webcrypto.getRandomValues(new Uint32Array(n));

test("senha provisória: formato xxxx-xxxx-xxxx, sem caracteres ambíguos e acima do mínimo", () => {
  for (let i = 0; i < 200; i++) {
    const s = gerarSenhaProvisoria(aleatorio);
    assert.match(s, /^[A-HJKMNP-Za-hjkmnp-z2-9]{4}-[A-HJKMNP-Za-hjkmnp-z2-9]{4}-[A-HJKMNP-Za-hjkmnp-z2-9]{4}$/);
    assert.ok(s.length >= MINIMO_SENHA);
    assert.doesNotMatch(s, /[0O1lI]/);
  }
});

test("senha provisória: não se repete", () => {
  const todas = new Set(Array.from({ length: 500 }, () => gerarSenhaProvisoria(aleatorio)));
  assert.equal(todas.size, 500);
});

test("usa só o gerador recebido (determinístico quando injetado)", () => {
  assert.equal(gerarSenhaProvisoria(() => new Uint32Array(12)), "AAAA-AAAA-AAAA");
});
