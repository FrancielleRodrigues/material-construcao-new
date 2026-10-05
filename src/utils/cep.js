export async function buscarCep(cep) {
  const limpo = cep.replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (!resp.ok) return null;
    const dados = await resp.json();
    if (dados.erro) return null;
    return {
      logradouro: dados.logradouro || "",
      bairro: dados.bairro || "",
      cidade: dados.localidade || "",
      uf: dados.uf || "",
    };
  } catch (erro) {
    console.error("Falha ao consultar o CEP:", erro);
    return null;
  }
}
