import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputClasses } from "./ui/inputClasses";
import { cn } from "../utils/format";

// Campo de senha com o "olho" para mostrar/ocultar o que foi digitado.
export function InputSenha({ className, ...props }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input {...props} type={visivel ? "text" : "password"} className={cn(inputClasses, "pr-10", className)} />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        title={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visivel}
        tabIndex={-1}
        style={{ position: "absolute", right: "0.25rem", top: "50%", transform: "translateY(-50%)" }}
        className="w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700"
      >
        {visivel ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
