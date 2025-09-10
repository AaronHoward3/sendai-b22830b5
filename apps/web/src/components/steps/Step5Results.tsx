import React, { useMemo, useState, useEffect } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { FormData, GeneratedEmail } from "../EmailGenerator";
import { Save, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { SubscriptionPrompt } from "@/components/SubscriptionPrompt";

interface Step5ResultsProps {
  formData: FormData;
  onPrev: () => void;
  onRestart: () => void;
}

export const Step5Results: React.FC<Step5ResultsProps> = ({
  formData,
  onPrev,
  onRestart,
}) => {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (user?.id) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('user_id', user.id)
            .maybeSingle();
          setIsAdmin(Boolean(data?.is_admin));
        } catch (error) {
          console.error('Failed to check admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAdmin();
  }, [user?.id]);

  // Check if user has already used their free trial
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false);

  useEffect(() => {
    // Check localStorage for free trial usage
    const freeTrialUsed = localStorage.getItem('freemium_trial_used');
    setHasUsedFreeTrial(!!freeTrialUsed);
  }, []);

  // Mark free trial as used when in preview mode
  useEffect(() => {
    if (formData.isPreviewMode && !hasUsedFreeTrial) {
      localStorage.setItem('freemium_trial_used', 'true');
      setHasUsedFreeTrial(true);
    }
  }, [formData.isPreviewMode, hasUsedFreeTrial]);

  const handleSubscribe = () => {
    window.location.href = "/settings?plan=1";
  };

  const handleSignIn = () => {
    window.location.href = "/settings";
  };

  // support either generatedEmails[0] or generatedEmail
  const email = formData.generatedEmails?.[0] ?? (formData as { generatedEmail?: GeneratedEmail })?.generatedEmail;

  const computedSubject = useMemo(() => {
    const topLevel = formData.subjectLine;
    const perEmail = email?.subject;
    if (typeof topLevel === "string" && topLevel.trim()) {
      return topLevel;
    }
    if (typeof perEmail === "string" && perEmail.trim()) {
      return perEmail;
    }
    return "(No Subject)";
  }, [formData, email]);

  const html = useMemo(() => {
    if (!email) return "";
    return email.html && email.html.trim().length > 0 ? email.html : "";
  }, [email]);

  const [copiedMJML, setCopiedMJML] = useState(false);
  const [copiedHTML, setCopiedHTML] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopyMJML = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email.content || "");
    setCopiedMJML(true);
    setTimeout(() => setCopiedMJML(false), 2000);
  };

  const handleCopyHTML = async () => {
    await navigator.clipboard.writeText(html || "");
    setCopiedHTML(true);
    setTimeout(() => setCopiedHTML(false), 2000);
  };

  const handleSaveEmail = async () => {
    if (!email) return;
    if (!user) {
      toast({ title: "Sign in required", description: "Open Settings and sign in to save emails.", variant: "destructive" });
      return;
    }

    const style_meta = {
      emailType: formData.emailType,
      tone: formData.tone,
      designAesthetic: formData.designAesthetic,
    };
    const base_payload = (formData as { basePayload?: unknown })?.basePayload ?? null;

    const { error } = await supabase.from("emails").insert({
      user_id: user.id,
      brand_domain: formData.domain || "",
      subject: computedSubject || "",
      mjml: email.content || "",
      html: html || "",
      preview_image_url: (email as { previewImageUrl?: string })?.previewImageUrl || null,
      base_payload,
      style_meta
    });

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setSaved(true);
    toast({ title: "Saved", description: "Your email was saved to My Emails." });
  };

  if (!email) {
    return (
      <div className="text-center space-y-8 pt-16">
        <h1 className="text-3xl font-bold text-foreground">No email generated</h1>
        <GradientButton onClick={onPrev} className="!bg-primary !text-primary-foreground hover:!bg-primary/90">
          Go Back
        </GradientButton>
      </div>
    );
  }

  // Show subscription prompt for preview mode users (but not for admins)
  if (formData.isPreviewMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8">
          {/* Email Preview */}
          <div className="bg-white rounded-xl border shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/40">
              <h2 className="text-lg font-semibold truncate" title={computedSubject}>{computedSubject}</h2>
              <p className="text-sm text-muted-foreground mt-1">Preview - Subscribe to access full features</p>
            </div>
            <div className="h-[60vh] overflow-auto">
              <iframe srcDoc={html} sandbox="" className="w-full h-full border-0" style={{ background: "white" }} title="Email Preview" />
            </div>
          </div>

          {/* Subscription Prompt */}
          <SubscriptionPrompt onSubscribe={handleSubscribe} onSignIn={handleSignIn} />
        </div>
      </div>
    );
  }

  return (
    <div className="lg:fixed lg:inset-x-0 lg:top-16 lg:bottom-0 grid gap-6 p-6 grid-cols-1 lg:grid-cols-2 lg:grid-rows-1">
      {/* Left: subject + preview (unchanged layout) */}
      <div className="flex flex-col rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/40">
          <h2 className="text-lg font-semibold truncate" title={computedSubject}>{computedSubject}</h2>
        </div>
        <div className="flex-1 min-h-0 bg-background rounded-b-lg">
          <div className="h-[70vh] md:h-[65vh] lg:h-full overflow-auto">
            <iframe srcDoc={html} sandbox="" className="w-full h-full border-0" style={{ background: "white" }} title="Email Preview" />
          </div>
        </div>
      </div>

      {/* Right: MJML + HTML panes (unchanged visuals) */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-rows-[1fr_1fr_auto] lg:h-full">
        <div className="min-h-0 flex flex-col rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
            <h2 className="text-lg font-semibold">MJML</h2>
            <GradientButton size="sm" variant="white-outline" onClick={handleCopyMJML}
              className="hover:scale-105 !bg-background !text-foreground !border !border-border hover:!bg-muted">
              <Copy className="w-4 h-4 mr-2" /> {copiedMJML ? "Copied" : "Copy MJML"}
            </GradientButton>
          </div>
          <div className="flex-1 min-h-0">
            <div className="h-44 md:h-60 lg:h-full overflow-auto p-4">
              <pre className="text-xs whitespace-pre-wrap break-words">{email.content}</pre>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex flex-col rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
            <h2 className="text-lg font-semibold">HTML</h2>
            <GradientButton size="sm" variant="white-outline" onClick={handleCopyHTML} disabled={!html}
              className="hover:scale-105 !bg-background !text-foreground !border !border-border hover:!bg-muted disabled:opacity-60">
              <Copy className="w-4 h-4 mr-2" /> {copiedHTML ? "Copied" : "Copy HTML"}
            </GradientButton>
          </div>
          <div className="flex-1 min-h-0">
            <div className="h-44 md:h-60 lg:h-full overflow-auto p-4">
              <pre className="text-xs whitespace-pre-wrap break-words">{html}</pre>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 lg:row-auto">
          <GradientButton variant="solid" onClick={handleSaveEmail}
            className="w-full justify-center text-lg hover:scale-105 !bg-primary !text-primary-foreground hover:!bg-primary/90 disabled:opacity-60"
            disabled={saved}>
            <Save className="h-5 w-5 mr-2" /> {saved ? "Saved" : "Save Email"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
};
