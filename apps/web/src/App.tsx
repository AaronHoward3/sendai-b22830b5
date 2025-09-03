import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import MyEmails from "./pages/MyEmails";
import EmailEditor from "./pages/EmailEditor";
import NotFound from "./pages/NotFound";
import ScrollToTop from "@/components/ScrollToTop";
// 👇 add this import
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        {/* Background blobs */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="blob" style={{ top: "20%", left: "10%" }}></div>
          <div className="blob" style={{ top: "60%", left: "50%" }}></div>
          <div className="blob" style={{ top: "30%", left: "80%" }}></div>
        </div>

        {/* Main app wrapper - now uses auto scroll to prevent phantom scrollbar */}
        <div className="min-h-screen overflow-y-auto overflow-x-hidden">
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/my-emails" element={<MyEmails />} />
              <Route path="/email-editor" element={<EmailEditor />} />
              {/* 👇 new admin route */}
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
        
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
