import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { BrandHeader } from "@/components/BrandHeader";

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
  company_name: z.string().trim().min(2, "Company name is required"),
  state_code:   z.string().length(2, "Pick your state"),
  contact_name: z.string().trim().min(2, "Your name is required"),
  email: z.string().trim().email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

type Status =
  | { kind: "idle" }
  | { kind: "submitted"; data: FormValues }
  | { kind: "state_taken"; state_code: string }
  | { kind: "error"; message: string };

export default function Pioneer() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { company_name: "", state_code: "", contact_name: "", email: "" },
  });

  useEffect(() => {
    document.title = "Pioneer Program — TreadSet";
  }, []);

  const onSubmit = async (values: FormValues) => {
    // Cast: pioneers table is created by 20260508103300_pioneer_waitlist_tables.sql.
    // Once that migration runs and types.ts is regenerated, this cast can drop.
    const { error } = await (supabase as unknown as {
      from: (table: string) => {
        insert: (payload: Record<string, unknown>) => Promise<{ error: { code?: string; message: string } | null }>;
      };
    })
      .from("pioneers")
      .insert({
        company_name: values.company_name,
        state_code:   values.state_code,
        contact_name: values.contact_name,
        email:        values.email.toLowerCase(),
      });

    if (error) {
      // Postgres unique-violation = state already claimed
      if (error.code === "23505") {
        setStatus({ kind: "state_taken", state_code: values.state_code });
        return;
      }
      setStatus({ kind: "error", message: error.message });
      return;
    }

    setStatus({ kind: "submitted", data: values });
  };

  const stateCode = watch("state_code");

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader />

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-12 md:pt-20">
        {status.kind === "submitted" ? (
          <ConfirmationCard data={status.data} />
        ) : (
          <>
            <div className="mb-10">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />
                Pioneer Program · 49 spots
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[0.95] tracking-tight md:text-5xl">
                One per state.<br />
                <span className="italic font-normal text-emerald-800">That's it.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                Charter terms for the first processor in every state. We size
                pricing to your operation, lock it the day you sign, and never
                raise it on you. Once your state is claimed, it's gone.
              </p>
            </div>

            <Card>
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="company_name">Company name</Label>
                      <Input
                        id="company_name"
                        placeholder="Henderson Tire Recycling"
                        {...register("company_name")}
                      />
                      {errors.company_name && (
                        <p className="text-xs text-destructive">{errors.company_name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="state_code">Your state</Label>
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
                      {errors.state_code && (
                        <p className="text-xs text-destructive">{errors.state_code.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_name">Your name</Label>
                      <Input
                        id="contact_name"
                        placeholder="Jane Henderson"
                        {...register("contact_name")}
                      />
                      {errors.contact_name && (
                        <p className="text-xs text-destructive">{errors.contact_name.message}</p>
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
                  </div>

                  {status.kind === "state_taken" && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{status.state_code}</strong> has already been
                        claimed by another processor. Join the{" "}
                        <Link to="/waitlist" className="underline font-medium">
                          waitlist
                        </Link>{" "}
                        and we'll let you know if it opens up.
                      </AlertDescription>
                    </Alert>
                  )}

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
                    {isSubmitting ? "Locking your state…" : "Lock my state"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
              49 spots nationwide. One per state. Once it's gone, it's gone.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function ConfirmationCard({ data }: { data: FormValues }) {
  const stateName =
    STATES.find((s) => s.code === data.state_code)?.name ?? data.state_code;

  return (
    <Card className="border-emerald-200">
      <CardContent className="p-8 md:p-12 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-700" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          {stateName} is yours.
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          We've locked your state in the Pioneer roster. Zach will be in
          touch within 24 hours to size pricing to your operation and
          schedule onboarding.
        </p>
        <div className="mt-8 rounded-lg border bg-muted/40 p-5 text-left text-sm">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Confirmation
          </p>
          <p>
            <strong>{data.company_name}</strong>
            <br />
            {data.contact_name} · {data.email}
            <br />
            State: <span className="font-mono">{data.state_code}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
