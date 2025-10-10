import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TrialGuard } from "@/components/TrialGuard";
import Dashboard from "./pages/Dashboard";
import MyEmails from "./pages/MyEmails";
import EmailEditor from "./pages/EmailEditor";
import Signup from "./pages/Signup";
import Signin from "./pages/Signin";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import ScrollToTop from "@/components/ScrollToTop";
// 👇 add this import
import Admin from "./pages/Admin";
import EmailGenerator from "./components/EmailGenerator";

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

        {/* Trial Guard - blocks site if free trial is used */}
        <TrialGuard>
          {/* Main app wrapper - now uses auto scroll to prevent phantom scrollbar */}
          <div className="min-h-screen">
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<EmailGenerator />} />
                <Route path="/about" element={<About />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/my-emails" element={<MyEmails />} />
                <Route path="/email-editor" element={<EmailEditor />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </TrialGuard>
        
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
