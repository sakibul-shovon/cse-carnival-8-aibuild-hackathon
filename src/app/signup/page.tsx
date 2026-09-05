"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormState = {
  name: string;
  student_id: string;
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMAIL_DOMAIN = "@aust.edu";

export default function SignupPage() {
  const router = useRouter();
  const [values, setValues] = React.useState<FormState>({
    name: "",
    student_id: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [checkEmail, setCheckEmail] = React.useState(false);

  function setField(key: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const fieldErrors: FieldErrors = {};
    if (!values.name.trim()) fieldErrors.name = "Full name is required.";
    if (!values.student_id.trim())
      fieldErrors.student_id = "Student ID is required.";
    const email = values.email.trim().toLowerCase();
    if (!email) fieldErrors.email = "Email is required.";
    else if (!email.endsWith(EMAIL_DOMAIN))
      fieldErrors.email = `Use your university email (${EMAIL_DOMAIN}).`;
    if (values.password.length < 6)
      fieldErrors.password = "Password must be at least 6 characters.";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: {
            name: values.name.trim(),
            student_id: values.student_id.trim(),
          },
        },
      });
      if (error) {
        setFormError(error.message);
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        // Email confirmation is on — user must confirm before signing in.
        setCheckEmail(true);
      }
    } catch {
      setFormError("Couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
            <MailCheck className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-lg font-semibold">Check your email</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{values.email}</strong>.
            Confirm it, then sign in.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join CampusOS with your university email
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Full name</Label>
              <Input
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. Sakibul Hassan"
                autoComplete="name"
                aria-invalid={!!errors.name}
                autoFocus
              />
              {errors.name ? (
                <p className="text-xs text-danger">{errors.name}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Student ID</Label>
              <Input
                value={values.student_id}
                onChange={(e) => setField("student_id", e.target.value)}
                placeholder="e.g. 20-40532"
                aria-invalid={!!errors.student_id}
              />
              {errors.student_id ? (
                <p className="text-xs text-danger">{errors.student_id}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">University email</Label>
              <Input
                type="email"
                value={values.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="you@aust.edu"
                autoComplete="email"
                aria-invalid={!!errors.email}
              />
              {errors.email ? (
                <p className="text-xs text-danger">{errors.email}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Password</Label>
              <Input
                type="password"
                value={values.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
              />
              {errors.password ? (
                <p className="text-xs text-danger">{errors.password}</p>
              ) : null}
            </div>

            {formError ? (
              <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
