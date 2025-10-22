import React, { useEffect, useRef, useState } from "react";
import { FormData } from "../EmailGenerator";
import { AnimatedBlobLoader } from "@/components/ui/AnimatedBlobLoader";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabaseClient";
import { SubscriptionUpgradePrompt } from "@/components/SubscriptionUpgradePrompt";
import { checkUserCredits } from "@/lib/api";
import { API_ROOT } from "@/utils/constants";
interface Step4GenerationProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack?: () => void;
}
export const Step4Generation: React.FC<Step4GenerationProps> = ({ formData, updateFormData, onNext, onBack }) => {
  const { user, loading: isLoadingUser } = useSupabaseAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingPreVerification, setIsLoadingPreVerification] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'no_credits' | 'no_subscription' | 'trial_expired' | 'no_image_credits'>('no_credits');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    const checkAdmin = async () => {
      if (user?.id) {
        try {
          const { data } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle();
          setIsAdmin(Boolean(data?.is_admin));
        } catch (error) {
          console.error('Failed to check admin status:', error);
          setIsAdmin(false);
      }} else { setIsAdmin(false); }
      setIsLoadingPreVerification(false);
    };
    checkAdmin();
  }, [user?.id]);
  const [status, setStatus] = useState("Starting…");
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);
  const isGeneratingRef = useRef(false);
  const handleUpgrade = () => { window.location.href = "/dashboard?plan=1"; };
  const handleBack = () => { setShowUpgradePrompt(false); };
  const handleErrorAndGoBack = (message: string) => {
    setErrorMessage(message);
    setShowError(true);
    // Navigate back to step 1 after showing error for 3 seconds
    setTimeout(() => {
      if (onBack) { onBack(); } else { window.location.href = '/?step=1';}
    }, 3000);
  };
  const handleContinueWithoutImage = () => {
    setShowUpgradePrompt(false);
    updateFormData({ useCustomHero: false });
    window.location.reload();
  };
  useEffect(() => {
    if (isLoadingPreVerification || isLoadingUser) { console.log("🔍 [DEBUG] Admin check still loading, skipping generation"); return; }
    if (isGeneratingRef.current) { console.log("🔍 [DEBUG] Generation already in progress, skipping..."); return }
    isGeneratingRef.current = true;
    console.log("🔍 [DEBUG] Starting generation process", { hasUser: !!user, isTrial: !user });
    const controller = new AbortController();
    abortRef.current = controller;
    // If we have a saved image URL, treat as "no custom hero generation" for progress timing.
    const stopFake = startFakeProgress({ useCustomHero: !!formData.useCustomHero && !formData.savedHeroImageUrl, setStatus, timersRef });
    let didAbort = false;
    const run = async () => {
      setStatus("Generating email…");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        let hasActiveSubscription = false;
        console.log("🔍 [DEBUG] Current user object:", user);
        if (user) {
          const userCredits = await checkUserCredits(token);
          console.log("🔍 [DEBUG] User credits:", userCredits);
          const needsImageCredit = !!formData.useCustomHero && !formData.savedHeroImageUrl;
          if (userCredits.balance.emails_remaining < 1 || (needsImageCredit && userCredits.balance.images_remaining < 1)) {
            console.log("🔍 [DEBUG] Insufficient credits");
            stopFake();
            setStatus(`No ${userCredits.balance.emails_remaining < 1 ?'email':'image'} credits remaining`);
            setUpgradeReason(userCredits.balance.emails_remaining < 1 ? 'no_credits' : 'no_image_credits');
            setShowUpgradePrompt(true);
            return;
          }
          try {
            const { data: subscription, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
            console.log("🔍 [DEBUG] User subscription query result:", { subscription, subError });
            
            // Check if subscription exists and is active (NULL current_period_end is OK)
            hasActiveSubscription = !!(subscription && subscription.status === 'active');
            console.log("🔍 [DEBUG] hasActiveSubscription:", hasActiveSubscription);
            
            // Also check if user has any credits
            const { data: credits, error: creditsError } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
            console.log("🔍 [DEBUG] User credits:", { credits, creditsError });
            
          } catch (error) {
            console.error('Failed to check subscription status:', error); console.error('Error details:', error.message, error.stack);
        }}
        // Choose endpoint based on authentication AND subscription status
        // Only use authenticated route if user has active subscription
        const finalIsAuthenticated = !!user && hasActiveSubscription;
        const endpoint = finalIsAuthenticated ? `${API_ROOT}/generate` : `${API_ROOT}/generate/preview`;
        // console.log("🔍 [DEBUG] Final endpoint selection:", {
        //   hasUser: !!user, userId: user?.id, isAdmin, hasActiveSubscription, finalIsAuthenticated, endpoint, sessionToken: token ? "Present" : "Missing",
        //   reason: finalIsAuthenticated ? "User authenticated with active subscription" : "No user or no active subscription, using preview",
        // });
        // Make the generate request directly
        console.log("🔍 [DEBUG] Making API call to:", endpoint);
        const generateResponse = await fetch(endpoint, { method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: controller.signal,
          body: JSON.stringify({
            domain: formData.domain,
            emailType: formData.emailType,
            designAesthetic: formData.designAesthetic,
            tone: formData.tone,
            userContext: formData.userContext,
            imageContext: formData.imageContext,
            products: formData.products || [],
            brandData: formData.brandData || {},
            customHeroImage: formData.useCustomHero ?? true,
            savedHeroImageUrl: formData.savedHeroImageUrl || null, // NEW: backend uses this to inject
            savedHeroImageId: formData.savedHeroImageId || null,
        })});
        if (generateResponse.status === 402) {
          const errorText = await generateResponse.text();
          console.log("🔍 [DEBUG] 402 Error Response:", errorText);
          stopFake();
          setStatus(`No credits left. Redirecting to Manage Plan…`);
          window.location.href = "/dashboard?plan=1";
          return;
        }
        if (!generateResponse.ok) {
          const errorText = await generateResponse.text();
          let errorMessage = `HTTP ${generateResponse.status} ${generateResponse.statusText}`;
          
          // Try to parse error as JSON, but handle non-JSON responses gracefully
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch (parseError) {
            // If it's not JSON, use the raw text (truncated)
            errorMessage = errorText.slice(0, 200) || errorMessage;
          }
          
          if (generateResponse.status === 429) {
            stopFake();
            setStatus("Rate limit exceeded. Please wait before trying again.");
            handleErrorAndGoBack("Too many requests. Please wait a moment before trying again.");
            return
          }
          if (generateResponse.status >= 500) {
            stopFake();
            setStatus("Service temporarily unavailable. Please try again later.");
            handleErrorAndGoBack("Email generator service is temporarily unavailable. Please try again later.");
            return
          }
          throw new Error(`${errorMessage}\n${errorText.slice(0, 800)}`);
        }
        const data = await generateResponse.json();
        const first = data?.emails?.[0];
        if (!first) { stopFake(); setStatus("Error: No email returned"); return; }
        const subjectFromTop = data?.subjectLine;
        const subjectFromEmail = first?.subject;
        const subject = (typeof subjectFromTop === "string" && subjectFromTop.trim()) || (typeof subjectFromEmail === "string" && subjectFromEmail.trim()) || "(No Subject)";
        stopFake();
        finishedRef.current = true;
        updateFormData({
          subjectLine: subject,
          generatedEmails: [{ index: 1, subject, content: first.content || "", html: first.html || "" }],
          isPreviewMode: data.isPreviewMode || false,
          previewMessage: data.previewMessage || null,
        });
        setStatus("Done!");
        isGeneratingRef.current = false;
        onNext();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") { didAbort = true; isGeneratingRef.current = false; return; }
        stopFake();
        isGeneratingRef.current = false;
        console.error("Generate failed:", err);
        if (err instanceof Error) {
          if (err.message.includes("HTTP 402")) {
            setStatus("No email credits left");
            setUpgradeReason('no_credits');
            setShowUpgradePrompt(true);
            return;
          }
          if (err.message.includes("subscription") || err.message.includes("Subscription")) {
            setUpgradeReason('no_subscription');
            setShowUpgradePrompt(true);
            return;
          }
          if (err.message.includes('Too many requests') || err.message.includes('Rate limit')) {
            setStatus("Rate limit exceeded. Please wait a moment before trying again.");
            handleErrorAndGoBack("Too many requests. Please wait a moment before trying again.");
            return;
          }
          // Handle service unavailable errors
          if (err.message.includes('temporarily unavailable')) {
            setStatus("Service temporarily unavailable. Please try again later.");
            handleErrorAndGoBack("Email generator service is temporarily unavailable. Please try again later.");
            return;
          }
          setStatus("Error: " + err.message);
        } else { setStatus("Error: unknown"); }
    }};
    run();
    return () => {
      if (!finishedRef.current && !didAbort) controller.abort();
      stopFake();
      isGeneratingRef.current = false;
  }}, [isLoadingPreVerification, isLoadingUser]);
  return <>
      {showUpgradePrompt ? (
        <SubscriptionUpgradePrompt onUpgrade={handleUpgrade} onBack={handleBack} reason={upgradeReason} onContinueWithoutImage={upgradeReason === 'no_image_credits' ? handleContinueWithoutImage : undefined} />
      ) : showError ? (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background overflow-hidden"><div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-4 text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-red-800 mb-2">Generation Failed</h1>
          <p className="text-red-700 mb-4">{errorMessage}</p>
          <p className="text-sm text-red-600">Redirecting you back to the beginning...</p>
        </div></div>
      ) : (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background overflow-hidden">
          <h1 className="text-2xl font-normal text-gray-100 z-10 text-center" style={{ textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)" }}>Generating your email...</h1>
          <p className="text-sm text-gray-400 animate-pulse mt-2 z-10">{status}</p>
          <AnimatedBlobLoader />
        </div>
      )}
  </>;
};
function startFakeProgress({ useCustomHero, setStatus, timersRef}: { useCustomHero: boolean;  setStatus: (status: string) => void;  timersRef: { current: number[] } }) {
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const addTimer = (ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };
  const stop = () => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  };
  if (!useCustomHero) {
    const total = randInt(12_000, 30_000);
    const t0 = randInt(400, 800);
    const t1 = randInt(Math.floor(total * 0.30), Math.floor(total * 0.45));
    const t2 = randInt(Math.floor(total * 0.55), Math.floor(total * 0.70));
    const t3 = randInt(Math.floor(total * 0.80), Math.floor(total * 0.92));
    addTimer(t0, () => setStatus("Creating layout…"));
    addTimer(t1, () => setStatus("Writing content…"));
    addTimer(t2, () => setStatus("Refining email…"));
    addTimer(t3, () => setStatus("Finalizing…"));
  } else {
    const tCreate = randInt(500, 1_200);
    const tWrite = tCreate + randInt(1_200, 4_000);
    const tRefine = tWrite + randInt(1_500, 4_000);
    const tHero = Math.max(randInt(15_000, 20_000), tRefine + 1_000);
    const tFinalize = Math.max(randInt(108_000, 114_000), tHero + 5_000);
    addTimer(tCreate, () => setStatus("Creating layout…"));
    addTimer(tWrite, () => setStatus("Writing content…"));
    addTimer(tRefine, () => setStatus("Refining email…"));
    addTimer(tHero, () => setStatus("Generating custom hero image…"));
    addTimer(tFinalize, () => setStatus("Finalizing…"));
  }
  return stop;
}
