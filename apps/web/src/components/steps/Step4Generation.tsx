import React, { useEffect, useRef, useState } from "react";
import { FormData } from "../EmailGenerator";
import { AnimatedBlobLoader } from "@/components/ui/AnimatedBlobLoader";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabaseClient";
import { postJSON } from "@/lib/api";

const API_ROOT = '/api';

interface Step4GenerationProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
}

export const Step4Generation: React.FC<Step4GenerationProps> = ({
  formData,
  updateFormData,
  onNext,
}) => {
  const { user } = useSupabaseAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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
      setIsLoading(false);
    };
    
    checkAdmin();
  }, [user?.id]);
  
  // Admin users are always considered authenticated for full access
  const isAuthenticated = !!user || isAdmin;
  
  console.log("🔍 [DEBUG] Step4Generation auth status:", {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    isAdmin,
    isAuthenticated
  });
  
  // Also log each value separately for better debugging
  console.log("🔍 [DEBUG] hasUser:", !!user);
  console.log("🔍 [DEBUG] userId:", user?.id);
  console.log("🔍 [DEBUG] userEmail:", user?.email);
  console.log("🔍 [DEBUG] isAdmin:", isAdmin);
  console.log("🔍 [DEBUG] isAuthenticated:", isAuthenticated);
  const [status, setStatus] = useState("Starting…");
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    // If we have a saved image URL, treat as "no custom hero generation" for progress timing.
    const useCustomHeroEffective = !!formData.useCustomHero && !formData.savedHeroImageUrl;

    const stopFake = startFakeProgress({
      useCustomHero: useCustomHeroEffective,
      setStatus,
      timersRef,
    });

    let didAbort = false;
    const run = async () => {
      setStatus("Generating email…");
      try {
        // Get the current session token for authenticated requests
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        // Choose endpoint based on authentication status
        const endpoint = isAuthenticated ? `${API_ROOT}/generate` : `${API_ROOT}/generate/preview`;

        // Make the generate request directly
        const generateResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
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
            // kept for future compatibility if you ever resolve by id:
            savedHeroImageId: formData.savedHeroImageId || null,
          }),
          signal: controller.signal,
        });

        if (generateResponse.status === 402) {
          stopFake();
          setStatus("No email credits left. Redirecting to Manage Plan…");
          window.location.href = "/settings?plan=1";
          return;
        }

        if (!generateResponse.ok) {
          const errorText = await generateResponse.text();
          throw new Error(`HTTP ${generateResponse.status} ${generateResponse.statusText}\n${errorText.slice(0, 800)}`);
        }

        const data = await generateResponse.json();

        const first = data?.emails?.[0];
        if (!first) {
          stopFake();
          setStatus("Error: No email returned");
          return;
        }

        const subjectFromTop = data?.subjectLine;
        const subjectFromEmail = first?.subject;
        const subject =
          (typeof subjectFromTop === "string" && subjectFromTop.trim()) ||
          (typeof subjectFromEmail === "string" && subjectFromEmail.trim()) ||
          "(No Subject)";

        stopFake();
        finishedRef.current = true;

        updateFormData({
          subjectLine: subject,
          generatedEmails: [
            {
              index: 1,
              subject,
              content: first.content || "",
              html: first.html || "",
            },
          ],
          // Store preview mode information
          isPreviewMode: data.isPreviewMode || false,
          previewMessage: data.previewMessage || null,
        });

        setStatus("Done!");
        onNext();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          didAbort = true;
          return;
        }
        stopFake();
        console.error("Generate failed:", err);
        
        // Handle specific error cases
        if (err instanceof Error) {
          if (err.message.includes("HTTP 402")) {
            setStatus("No email credits left. Redirecting to Manage Plan…");
            window.location.href = "/settings?plan=1";
            return;
          }
          setStatus("Error: " + err.message);
        } else {
          setStatus("Error: unknown");
        }
      }
    };

    run();

    return () => {
      if (!finishedRef.current && !didAbort) controller.abort();
      stopFake();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background overflow-hidden">
      <h1 className="text-2xl font-normal text-gray-100 z-10 text-center" style={{ textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)" }}>
        Generating your email...
      </h1>
      <p className="text-sm text-gray-400 animate-pulse mt-2 z-10">{status}</p>
      <AnimatedBlobLoader />
    </div>
  );
};

function startFakeProgress({ 
  useCustomHero, 
  setStatus, 
  timersRef 
}: { 
  useCustomHero: boolean; 
  setStatus: (status: string) => void; 
  timersRef: { current: number[] } 
}) {
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
