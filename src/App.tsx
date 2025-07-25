
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import MyEmails from "./pages/MyEmails";
import EmailEditor from "./pages/EmailEditor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
  <div className="blob" style={{ top: '20%', left: '10%' }}></div>
  <div className="blob" style={{ top: '60%', left: '50%' }}></div>
  <div className="blob" style={{ top: '30%', left: '80%' }}></div>
</div>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/generator" element={<Index />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-emails" element={<MyEmails />} />
            <Route path="/email-editor" element={<EmailEditor />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
