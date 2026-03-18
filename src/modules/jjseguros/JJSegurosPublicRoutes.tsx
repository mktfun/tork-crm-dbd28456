import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Cotacao from "./pages/Cotacao";
import InsuranceHub from "./pages/InsuranceHub";
import Success from "./pages/Success";
import Links from "./pages/Links";
import NotFound from "./pages/NotFound";
import { TooltipProvider } from "./components/ui/tooltip";
import "./index.css";

export function JJSegurosPublicRoutes() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/seguros" element={<InsuranceHub />} />
        <Route path="/cotacao" element={<Cotacao />} />
        <Route path="/sucesso" element={<Success />} />
        <Route path="/links" element={<Links />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  );
}
