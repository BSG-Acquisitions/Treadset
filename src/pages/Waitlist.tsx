import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

const STATES: { code: string; name: string }[] = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],
  ["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],
  ["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],
  ["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],
  ["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],
  ["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],
  ["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],
  ["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],
  ["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],
  ["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],
  ["WI","Wisconsin"],["WY","Wyoming"],
].map(([code, name]) => ({ code, name }));

const schema = z.object({
  name:         z.string().trim().min(2, "Your name is required"),
  email:        z.string().trim().email("Enter a valid email"),
  company_name: z.string().trim().optional(),
  state_code:   z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Status =
  | { kind: "idle" }
  | { kind: "submitted"; data: FormValues }
  | { kind: "error"; message: string };

export default function Waitlist() {
  const [params] = useSearchParams();
  const prefilled = params.get("name") || params.get("email") || params.get("state_code");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:         params.get("name")         ?? "",
      email:        params.get("email")        ?? "",
      company_name: params.get("company_name") ?? "",
      state_code:   params.get("state_code")   ?? "",
    },
  });

  useEffect(() => {
    document.title = "Stay in the loop — TreadSet";
  }, []);

  const onSubmit = async (values: FormValues) => {
    // Cast: waitlist table is created by 20260508103300_pioneer_waitlist_tables.sql.
    // Once that migration runs and types.ts is regenerated, this cast can drop.
    const { error } = await (supabase as unknown as {
      from: (table: string) => {
        insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from("waitlist")
      .insert({
        name:         values.name,
        email:        values.email.toLowerCase(),
        company_name: values.company_name || null,
        state_code:   values.state_code || null,
      });

    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }

    void notifyZ({
      kind: "waitlist",
      data: {
        name:         values.name,
        email:        values.email.toLowerCase(),
        company_name: values.company_name || null,
        state_code:   values.state_code || null,
      },
    });

    setStatus({ kind: "submitted", data: values });
  };

  const stateCode = watch("state_code");

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-12 md:pt-16">
        {status.kind === "submitted" ? (
          <Card className="border-emerald-200">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-700" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                You're on the list.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                We'll send a note the next time a Pioneer slot opens — and
                keep you in the loop on new modules and updates as we ship
                them.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-10">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />
                Waitlist
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[0.95] tracking-tight md:text-5xl">
                {prefilled ? "Almost there." : "Stay close."}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                {prefilled
                  ? "We carried your info over. Confirm and submit — we'll let you know the moment your state opens up."
                  : "Pioneer slots fill fast. Drop your details and we'll let you know if your state opens up — or when we open the next charter window."}
              </p>
            </div>

            <Card>
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your name</Label>
                      <Input
                        id="name"
                        placeholder="Jane Henderson"
                        {...register("name")}
                      />
                      {errors.name && (
                        <p className="text-xs text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@henderson.com"
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input
                        id="company_name"
                        placeholder="Henderson Tire Recycling"
                        {...register("company_name")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state_code">State <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Select
                        value={stateCode}
                        onValueChange={(v) => setValue("state_code", v, { shouldValidate: true })}
                      >
                        <SelectTrigger id="state_code">
                          <SelectValue placeholder="Pick your state" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {STATES.map((s) => (
                            <SelectItem key={s.code} value={s.code}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {status.kind === "error" && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{status.message}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white"
                    size="lg"
                  >
                    {isSubmitting ? "Sending…" : "Send me more"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

/** On-brand header — same component used by /pioneer.  Replaces the shared
    BrandHeader (which carries BSG's tagline + sustainability badges). */
function PageHeader() {
  return (
    <header className="border-b bg-card/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/pioneer" className="flex items-center gap-2 group">
          <span aria-hidden className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-800">
            <span className="absolute inset-[28%] rounded-full bg-card" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            TreadSet
          </span>
        </Link>
        <span className="hidden text-xs font-medium tracking-wide text-muted-foreground sm:block">
          The complete tire recycling operations platform
        </span>
      </div>
    </header>
  );
}

async function notifyZ(payload: {
  kind: "waitlist";
  data: { name: string; email: string; company_name: string | null; state_code: string | null };
}): Promise<void> {
  try {
    await supabase.functions.invoke("notify-tradeshow-signup", { body: payload });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("notify-tradeshow-signup failed", e);
  }
}
