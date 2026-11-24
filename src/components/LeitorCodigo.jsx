import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Painel } from "./ui/Painel";

// Formatos de produto (barras 1D) e QR Code, caso o SKU esteja impresso assim.
const FORMATOS_NATIVOS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"];
const INTERVALO_REPETIDO_MS = 2500; // o mesmo código na frente da câmera não conta duas vezes

function mensagemDeErro(e) {
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Este navegador não permite usar a câmera aqui. Abra o sistema pelo endereço https:// e use um navegador atualizado.";
  }
  if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
    return "A permissão da câmera foi negada. Libere a câmera para este site nas configurações do navegador e tente de novo.";
  }
  if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") return "Nenhuma câmera foi encontrada neste aparelho.";
  if (e?.name === "NotReadableError") return "A câmera está sendo usada por outro aplicativo.";
  return "Não foi possível abrir a câmera.";
}

// Lê código de barras/QR pela câmera do aparelho. Usa o leitor nativo do navegador quando existe
// (Chrome/Android) e, nos demais (iPhone/Safari, computador), uma biblioteca em JavaScript puro
// carregada só quando a câmera é aberta — nada de WebAssembly nem Web Workers, por causa do CSP.
//
// onLer(codigo) pode devolver { ok, mensagem } para mostrar o resultado na própria tela.
// Com `continuo`, a câmera fica aberta para bipar vários produtos seguidos (PDV); sem ele,
// fecha no primeiro código lido (cadastro).
export function LeitorCodigo({ onLer, onFechar, continuo = false, titulo = "Ler código de barras" }) {
  const videoRef = useRef(null);
  const onLerRef = useRef(onLer);
  const onFecharRef = useRef(onFechar);
  const [estado, setEstado] = useState("abrindo"); // abrindo | lendo | erro
  const [erro, setErro] = useState("");
  const [ultimo, setUltimo] = useState(null); // { ok, texto }

  useEffect(() => {
    onLerRef.current = onLer;
    onFecharRef.current = onFechar;
  });

  // Esc fecha só a câmera (e não o formulário que está por baixo dela).
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onFecharRef.current();
    }
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, []);

  useEffect(() => {
    let encerrado = false;
    let parar = () => {};
    const recentes = new Map(); // código → quando foi lido

    function aoDetectar(valor) {
      const codigo = String(valor || "").trim();
      const agora = Date.now();
      if (!codigo || encerrado) return;
      if (agora - (recentes.get(codigo) || 0) < INTERVALO_REPETIDO_MS) return;
      recentes.set(codigo, agora);
      navigator.vibrate?.(60);
      const r = onLerRef.current(codigo);
      if (r && typeof r === "object") setUltimo({ ok: r.ok !== false, texto: r.mensagem || codigo });
      else setUltimo({ ok: true, texto: codigo });
      if (!continuo) onFecharRef.current();
    }

    async function iniciar() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("sem câmera");
        const restricoes = { video: { facingMode: { ideal: "environment" } }, audio: false };

        if ("BarcodeDetector" in window) {
          const formatos = (await window.BarcodeDetector.getSupportedFormats?.())?.filter((f) => FORMATOS_NATIVOS.includes(f));
          const detector = new window.BarcodeDetector(formatos?.length ? { formats: formatos } : undefined);
          const stream = await navigator.mediaDevices.getUserMedia(restricoes);
          if (encerrado) { stream.getTracks().forEach((t) => t.stop()); return; }
          const video = videoRef.current;
          video.srcObject = stream;
          await video.play();
          setEstado("lendo");
          const timer = setInterval(async () => {
            if (video.readyState < 2) return;
            try {
              const achados = await detector.detect(video);
              if (achados[0]?.rawValue) aoDetectar(achados[0].rawValue);
            } catch { /* quadro sem código */ }
          }, 200);
          parar = () => { clearInterval(timer); stream.getTracks().forEach((t) => t.stop()); };
          return;
        }

        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (encerrado) return;
        const dicas = new Map();
        dicas.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.QR_CODE,
        ]);
        dicas.set(DecodeHintType.TRY_HARDER, true);
        const leitor = new BrowserMultiFormatReader(dicas, { delayBetweenScanAttempts: 150 });
        const controles = await leitor.decodeFromConstraints(restricoes, videoRef.current, (resultado) => {
          if (resultado) aoDetectar(resultado.getText());
        });
        if (encerrado) { controles.stop(); return; }
        setEstado("lendo");
        parar = () => controles.stop();
      } catch (e) {
        if (encerrado) return;
        setErro(mensagemDeErro(e));
        setEstado("erro");
      }
    }

    iniciar();
    return () => {
      encerrado = true;
      parar();
    };
  }, [continuo]);

  return (
    <Painel titulo={titulo} subtitulo={continuo ? "A câmera fica aberta: aponte para um produto de cada vez" : "Aponte a câmera para o código"} onFechar={onFechar}>
      {estado === "erro" ? (
        <div role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            data-testid="leitor-camera"
            style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#1c1917", borderRadius: "0.75rem", overflow: "hidden" }}
          >
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {estado === "lendo" && (
              <div
                aria-hidden="true"
                style={{ position: "absolute", left: "10%", right: "10%", top: "50%", height: 2, background: "rgba(239,68,68,0.85)", boxShadow: "0 0 6px rgba(239,68,68,0.8)" }}
              />
            )}
            {estado === "abrindo" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#d6d3d1", fontSize: 14 }}>
                <Loader2 size={16} className="animate-spin" /> Abrindo a câmera…
              </div>
            )}
          </div>
          {ultimo ? (
            <p
              role="status"
              className={ultimo.ok
                ? "flex items-center gap-1.5 text-sm text-teal-800 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2"
                : "flex items-center gap-1.5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"}
            >
              {ultimo.ok ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
              <span className="min-w-0 break-words">{ultimo.texto}</span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-stone-400">
              <Camera size={13} /> Códigos de barras (EAN, UPC, Code 128…) e QR Code. Boa luz e o código dentro da faixa ajudam.
            </p>
          )}
        </div>
      )}
    </Painel>
  );
}
