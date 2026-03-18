import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Check } from "lucide-react";
import { Button } from "@/modules/jjseguros/components/ui/button";
import { LegalModals } from "./LegalModals";

export const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setShowConsent(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowConsent(false);
  };

  return (
    <>
      <AnimatePresence>
        {showConsent && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-4 left-4 z-50 max-w-sm"
          >
            <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-elevated">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cookie className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    Usamos cookies para melhorar sua experiência.
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => setShowPrivacy(true)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                    >
                      Saiba mais
                    </button>
                    <Button
                      onClick={handleAccept}
                      size="sm"
                      className="h-8 px-4 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aceitar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LegalModals
        showTerms={false}
        showPrivacy={showPrivacy}
        onCloseTerms={() => {}}
        onClosePrivacy={() => setShowPrivacy(false)}
      />
    </>
  );
};
