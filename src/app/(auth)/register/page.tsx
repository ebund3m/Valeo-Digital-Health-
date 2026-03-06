"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const registerSchema = z.object({
  displayName: z.string().min(2, "Please enter your full name"),
  email:       z.string().email("Please enter a valid email address"),
  password:    z.string().min(8, "Password must be at least 8 characters"),
  confirm:     z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path:    ["confirm"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router   = useRouter();
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterFormData) {
    setError(null);
    setLoading(true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const { user } = userCredential;

      // 2. Set display name
      await updateProfile(user, { displayName: data.displayName });

      // 3. Create Firestore user document
      //    onboarded: false triggers the onboarding wizard
      await setDoc(doc(db, "users", user.uid), {
        uid:         user.uid,
        email:       data.email,
        displayName: data.displayName,
        role:        "client",
        onboarded:   false,
        isActive:    true,
        createdAt:   serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });

      // 4. Small delay to ensure Firestore write completes before redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Go to onboarding — NOT the dashboard
      router.push("/onboarding");

    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Please sign in.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Mobile logo */}
      <div className="lg:hidden mb-8">
        <span
          className="text-2xl"
          style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}
        >
          The Valeo Experience
        </span>
      </div>

      <h1
        className="text-4xl mb-2"
        style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}
      >
        Begin your journey
      </h1>
      <p className="text-slate-500 mb-8">
        Create your account and take the first step.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Full name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Full name
          </label>
          <input
            {...register("displayName")}
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:border-transparent
                       transition-all placeholder:text-slate-400"
          />
          {errors.displayName && (
            <p className="text-red-500 text-xs mt-1">{errors.displayName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:border-transparent
                       transition-all placeholder:text-slate-400"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Password
          </label>
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:border-transparent
                       transition-all placeholder:text-slate-400"
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirm password
          </label>
          <input
            {...register("confirm")}
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:border-transparent
                       transition-all placeholder:text-slate-400"
          />
          {errors.confirm && (
            <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>
          )}
        </div>

        {/* Terms */}
        <p className="text-xs text-slate-400 leading-relaxed">
          By creating an account you agree to our{" "}
          <span className="underline cursor-pointer">Terms of Service</span> and{" "}
          <span className="underline cursor-pointer">Privacy Policy</span>.
          Your information is kept strictly confidential.
        </p>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 rounded-lg text-white font-semibold text-sm
                     transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: loading ? "#8A9BA8" : "linear-gradient(135deg, #0D3B44, #1A535C)" }}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

      </form>

      {/* Login link */}
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: "#0D3B44" }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
