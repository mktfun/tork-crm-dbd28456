export function TorkLogo({ className }: { className?: string }) {
    return (
        <img
            src="/tork_symbol_favicon.png"
            alt="Tork Logo"
            className={`object-contain ${className || "w-full h-full"}`}
        />
    );
}
