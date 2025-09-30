import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, getAuthRedirectUrl } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientButton } from "@/components/ui/gradient-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { AuthGuard } from "@/components/AuthGuard";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    if (error) setErr(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-4 p-2 h-auto text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-col items-center mb-6">
              <button
                onClick={() => navigate("/")}
                className="mb-4 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Logo size="lg" />
              </button>
              <h1 className="text-3xl font-bold text-center">Welcome to your Email Studio</h1>
              <p className="text-center text-muted-foreground mt-2">
                Create your account to start generating amazing emails
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sign up</CardTitle>
              <CardDescription>We'll email you a magic link to get started.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendMagicLink();
                    }
                  }}
                  autoFocus
                />
              </div>

              {err && <p className="text-sm text-red-500">{err}</p>}
              {sent && (
                <div className="text-sm text-green-600 space-y-2">
                  <p>Magic link sent! Check your inbox.</p>
                  <p className="text-muted-foreground">
                    Click the link in your email to complete your signup.
                  </p>
                </div>
              )}

              <GradientButton
                variant="solid"
                onClick={sendMagicLink}
                disabled={loading || !email.trim()}
                className="w-full"
              >
                {loading ? "Sending…" : "Send magic link"}
              </GradientButton>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button
                  variant="link"
                  onClick={() => navigate("/signin")}
                  className="p-0 h-auto text-primary"
                >
                  Sign in
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Signup;

