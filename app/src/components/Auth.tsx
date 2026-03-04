import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "register";

export function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
  }, [mode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setSuccessMessage(
          "Registreerumine õnnestus. Kontrolli oma e-posti aadressi kinnituslingi jaoks (kui see on Supabase'is sisse lülitatud)."
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        setSuccessMessage("Sisselogimine õnnestus.");
      }
    } catch (err) {
      setError("Midagi läks valesti. Palun proovi uuesti.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-900">
          Aastaaruande kontrollija
        </h1>

        <div className="mb-4 flex gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              mode === "login"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-600"
            }`}
            onClick={() => setMode("login")}
          >
            Logi sisse
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              mode === "register"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-600"
            }`}
            onClick={() => setMode("register")}
          >
            Registreeru
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              E-post
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nimi@näide.ee"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Parool
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sisesta parool"
            />
            <p className="text-xs text-slate-500">
              Parool peab olema vähemalt 6 tähemärki pikk.
            </p>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading
              ? "Palun oota..."
              : mode === "login"
              ? "Logi sisse"
              : "Loo konto"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Sisselogimiseks kasutatakse Supabase Auth'i (e-post + parool).
        </p>
      </div>
    </div>
  );
}

