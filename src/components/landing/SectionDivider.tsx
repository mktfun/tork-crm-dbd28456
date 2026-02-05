
import { motion } from "framer-motion";

type DividerVariant = "dark-to-light" | "light-to-dark" | "dark-glow";

interface SectionDividerProps {
    variant: DividerVariant;
    className?: string;
}

export function SectionDivider({ variant, className = "" }: SectionDividerProps) {

    // VARIANTE 1: DO ESCURO PARA O CLARO (Dark Mist)
    // Usa um gradiente que vai do Slate-950 sólido para transparente, criando um fade suave sobre o fundo branco.
    if (variant === "dark-to-light") {
        return (
            <div className={`relative w-full h-32 -mt-32 z-20 pointer-events-none ${className}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950 transform rotate-180" />
            </div>
        );
    }

    // VARIANTE 2: DO CLARO PARA O ESCURO (Light Mist)
    // Suaviza a entrada numa seção escura vindo de uma clara.
    if (variant === "light-to-dark") {
        return (
            <div className={`relative w-full h-32 -mt-32 z-20 pointer-events-none ${className}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
            </div>
        );
    }

    // VARIANTE 3: HORIZONTE BRILHANTE (Dark to Dark separator)
    // Uma linha de luz sutil para separar seções escuras sem mudar a cor de fundo.
    if (variant === "dark-glow") {
        return (
            <div className={`relative w-full flex justify-center py-20 bg-slate-950 ${className}`}>
                <motion.div
                    initial={{ opacity: 0, width: "0%" }}
                    whileInView={{ opacity: 1, width: "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-[1px] w-full max-w-4xl bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
                />
                <div className="absolute inset-0 bg-cyan-500/5 blur-3xl pointer-events-none" />
            </div>
        );
    }

    return null;
}
