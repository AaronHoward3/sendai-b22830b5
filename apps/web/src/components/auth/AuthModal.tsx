import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientButton } from "@/components/ui/gradient-button";

const AuthModal: React.FC = () => {
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
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle>Sign in to continue</CardTitle>
        <CardDescription>We’ll email you a magic link.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            placeholder="you@example.com"
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
        {sent && <p className="text-sm text-green-600">Magic link sent. Check your inbox.</p>}

        <GradientButton
          variant="solid"
          onClick={sendMagicLink}
          disabled={loading || !email.trim()}
          className="w-full"
        >
          {loading ? "Sending…" : "Send magic link"}
        </GradientButton>
      </CardContent>
    </Card>
  );
};

export default AuthModal;
