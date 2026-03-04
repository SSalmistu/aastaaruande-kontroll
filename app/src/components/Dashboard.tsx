import { ChangeEvent, useState } from "react";
import OpenAI from "openai";
import { supabase } from "../lib/supabase";
import systemPrompt from "../prompts/system-prompt.txt";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.mjs?worker&url";

const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: openaiApiKey,
  dangerouslyAllowBrowser: true,
});

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib: any = await import("pdfjs-dist/build/pdf.mjs");

  // Seadistame pdf.js worker'i, et vältida GlobalWorkerOptions viga.
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");

    fullText += `\n\n[Lehekülg ${pageNumber}]\n${pageText}`;
  }

  return fullText.trim();
}

export function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setError(null);
    setSuccessMessage(null);
    setAiResult(null);
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

    if (!openaiApiKey) {
      setError(
        "Puudub OpenAI API võti (VITE_OPENAI_API_KEY). Lisa see .env faili."
      );
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    setAiResult(null);

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

      // Storage poliitika eeldab, et esimene kaust on kasutaja ID:
      // auth.uid() = foldername
      const safeFileName = file.name.replace(/\s+/g, "_");
      const filePath = `${user.id}/${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(filePath, file, {
          contentType: file.type || "application/pdf",
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        setError(
          `Faili üleslaadimisel tekkis viga: ${uploadError.message}. Proovi uuesti.`
        );
        return;
      }

      // Salvestame metaandmed ka reports tabelisse.
      const insertPayload = {
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        results: "",
      };

      console.log("Reports INSERT debug:", {
        userIdFromAuth: user.id,
        filePath,
        payload: insertPayload,
      });

      const { error: insertError } = await supabase
        .from("reports")
        .insert([insertPayload]);

      if (insertError) {
        console.error("Supabase reports insert error:", insertError);
        setError(
          `Fail laaditi üles, aga kirje reports tabelisse salvestamisel tekkis viga: ${insertError.message}.`
        );
        return;
      }

      setSuccessMessage(
        "Fail on edukalt üles laaditud ja kirje lisatud reports tabelisse. Alustan AI-analüüsi..."
      );

      setIsAnalyzing(true);

      const pdfText = await extractTextFromPdf(file);

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Allpool on mikroettevõtja majandusaasta aruande tekst PDF-ist. Kontrolli aruannet vastavalt süsteemipromptis toodud reeglitele.\n\n" +
              pdfText,
          },
        ],
      });

      const content = completion.choices[0]?.message?.content;
      setAiResult(typeof content === "string" ? content : content ?? null);

      setSuccessMessage(
        "Fail on edukalt üles laaditud ja AI analüüs on valmis."
      );
      setFile(null);
    } catch (err) {
      console.error("Dashboard upload/analyze error:", err);
      setError("Midagi läks valesti. Palun proovi uuesti.");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label
                htmlFor="pdf-file"
                className="inline-flex cursor-pointer items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
              >
                Vali fail
              </label>
              <input
                id="pdf-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="sr-only"
              />

              {file ? (
                <p className="text-xs text-slate-600">
                  Valitud fail:{" "}
                  <span className="font-medium break-all">{file.name}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Fail ei ole veel valitud.
                </p>
              )}
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

            {isAnalyzing ? (
              <div className="mt-2 flex items-center gap-3 text-sm text-slate-700">
                <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                <span>Analüüsin aruannet...</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleUpload}
                className="mt-2 inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUploading ? "Laen üles..." : "Lae fail üles"}
              </button>
            )}
          </div>
        </section>

        {aiResult ? (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              AI analüüsi tulemus
            </h2>
            <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm text-slate-800">
              {aiResult}
            </pre>
          </section>
        ) : null}
      </main>
    </div>
  );
}

