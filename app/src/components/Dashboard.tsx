import { ChangeEvent, useState } from "react";
import { supabase } from "../lib/supabase";

export function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setError(null);
    setSuccessMessage(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Palun vali enne üleslaadimist PDF-fail.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Ainult PDF-failid on lubatud.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError("Kasutaja tuvastamisel tekkis viga. Proovi uuesti.");
        return;
      }

      if (!user) {
        setError("Kasutaja ei ole sisse logitud.");
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeFileName = file.name.replace(/\s+/g, "_");
      const filePath = `${user.id}/${timestamp}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(filePath, file);

      if (uploadError) {
        setError("Faili üleslaadimisel tekkis viga. Proovi uuesti.");
        return;
      }

      setSuccessMessage("Fail on edukalt üles laaditud Supabase Storage'isse.");
      setFile(null);
    } catch (err) {
      setError("Midagi läks valesti. Palun proovi uuesti.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-slate-900">
            Aastaaruande kontrollija
          </h1>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Logi välja
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-slate-900">
            Lae üles aastaaruanne (PDF)
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            Vali mikroettevõtja majandusaasta aruande PDF-fail. Fail salvestatakse
            Supabase Storage&apos;i bucket&apos;isse <code>reports</code>.
          </p>

          <div className="space-y-3">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sky-700"
            />

            {file ? (
              <p className="text-xs text-slate-600">
                Valitud fail: <span className="font-medium">{file.name}</span>
              </p>
            ) : null}

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
              type="button"
              disabled={isUploading}
              onClick={handleUpload}
              className="mt-2 inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUploading ? "Laen üles..." : "Lae fail üles"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

