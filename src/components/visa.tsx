"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw, ShieldAlert, ShieldCheck, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { VisaRow, VisaStatus } from "@/lib/visa";
import { cn } from "@/lib/utils";

type LookupState = "idle" | "loading" | "done" | "failed";

type Ctx = {
  passport: string | null;
  rows: Record<string, VisaRow>;
  state: LookupState;
  retry: () => void;
};

const VisaContext = createContext<Ctx | null>(null);

// Wraps a page. It receives what the server already knows, then makes ONE batched call
// to the visa-lookup Edge Function for anything missing, and fills badges in as answers arrive.
export function VisaProvider({
  passport,
  initial,
  missing,
  children,
}: {
  passport: string | null;
  initial: Record<string, VisaRow>;
  missing: string[];
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState(initial);
  const [state, setState] = useState<LookupState>(missing.length ? "loading" : "idle");
  const ranFor = useRef("");
  const key = missing.join(",");

  const run = useCallback(async () => {
    setState("loading");
    let failed = false;
    for (let i = 0; i < missing.length; i += 25) {
      const { data, error } = await supabase.functions.invoke("visa-lookup", {
        body: { destinations: missing.slice(i, i + 25) },
      });
      if (error || !data?.results) {
        failed = true;
        continue;
      }
      const fresh: Record<string, VisaRow> = {};
      for (const [code, r] of Object.entries<Record<string, unknown>>(data.results)) {
        if (r.status) {
          fresh[code] = {
            status: r.status as VisaStatus,
            stay_days: (r.stay_days as number) ?? null,
            stay_text: (r.stay_text as string) ?? null,
            link: (r.link as string) ?? null,
          };
        } else if (!r.home) failed = true;
      }
      setRows((prev) => ({ ...prev, ...fresh }));
    }
    setState(failed ? "failed" : "done");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!key || ranFor.current === key) return; // once per set of countries
    ranFor.current = key;
    run();
  }, [key, run]);

  return (
    <VisaContext.Provider value={{ passport, rows, state, retry: run }}>{children}</VisaContext.Provider>
  );
}

const META: Record<VisaStatus, { label: string; icon: typeof ShieldCheck; className: string }> = {
  visa_free: { label: "Visa free", icon: ShieldCheck, className: "bg-visited text-visited-foreground" },
  visa_on_arrival: {
    label: "Visa on arrival",
    icon: Ticket,
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  },
  evisa: { label: "eVisa", icon: Ticket, className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200" },
  eta: { label: "eTA", icon: Ticket, className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  visa_required: {
    label: "Visa required",
    icon: ShieldAlert,
    className: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
};

const pill = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

// The badge for one country, for the signed-in user's passport.
export function VisaBadge({ code, className }: { code: string; className?: string }) {
  const ctx = useContext(VisaContext);
  if (!ctx || !ctx.passport) return null;

  if (code === ctx.passport) {
    return <span className={cn(pill, "bg-muted text-muted-foreground", className)}>Your passport country</span>;
  }

  const row = ctx.rows[code];
  if (row) {
    const m = META[row.status];
    const Icon = m.icon;
    const stay = row.stay_text ? ` · ${row.stay_text}` : "";
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <span className={cn(pill, m.className)} title={`${m.label}${stay} for your passport`}>
          <Icon className="size-3" aria-hidden /> {m.label}
          {stay}
        </span>
        {row.link && (
          <a
            href={row.link}
            target="_blank"
            rel="noreferrer"
            aria-label={`Official visa information for ${code}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </span>
    );
  }

  if (ctx.state === "loading") {
    return <span className={cn(pill, "animate-pulse bg-muted text-muted-foreground", className)}>Checking visa…</span>;
  }

  return (
    <button
      type="button"
      onClick={ctx.retry}
      className={cn(pill, "cursor-pointer bg-muted text-muted-foreground hover:text-foreground", className)}
      title="Couldn't get visa information. Click to try again."
    >
      <RefreshCw className="size-3" aria-hidden /> Visa info unavailable
    </button>
  );
}

export function VisaDisclaimer() {
  const ctx = useContext(VisaContext);
  if (!ctx?.passport) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Visa information is for a {ctx.passport} passport. Rules change, so always check the official source before you
      travel.
    </p>
  );
}
