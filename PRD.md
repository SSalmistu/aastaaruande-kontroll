# Aastaaruande kontrollija — PRD

## Mis see äpp on?

Veebirakendus, kuhu kasutaja laeb üles mikroettevõtja majandusaasta aruande PDF-i. Äpp saadab PDF-i sisu koos kontrollpromptiga OpenAI API-le ja kuvab kasutajale struktureeritud tagasiside.

## Kasutaja teekond

1. Kasutaja registreerub (e-mail + parool)
2. Kasutaja logib sisse
3. Kasutaja laeb üles PDF-faili
4. Äpp parsib PDF-ist teksti välja (pdf.js)
5. Äpp saadab teksti + süsteemprompti OpenAI API-le
6. Äpp kuvab AI vastuse kasutajale

## Tehnoloogiad

- **Frontend:** React + Vite + Tailwind CSS
- **Backend/andmebaas:** Supabase (Auth, Database, Storage)
- **PDF parsimine:** pdf.js (frontendis)
- **AI kontroll:** OpenAI API (GPT-4o)
- **API võti:** jagatud .env faili kaudu (töötoa jaoks)

## Arhitektuur

Kasutaja brauser
  → PDF üleslaadimine → Supabase Storage
  → PDF teksti parsimine (pdf.js)
  → Tekst + süsteemiprompt → OpenAI API
  → Vastus → kuvatakse ekraanil
  → Tulemused → salvestatakse Supabase DB-sse

## Supabase seadistus (ette valmistatud)

- **Auth:** e-maili + parooliga registreerumine/sisselogimine
- **Storage:** bucket `reports` (PDF-failide hoidmiseks)
- **Database:** tabel `reports`

## Tabel: reports

| Veerg | Tüüp | Kirjeldus |
|-------|------|-----------|
| id | uuid | Primaarvõti (automaatne) |
| user_id | uuid | Viide auth.users tabelile |
| file_name | text | Üleslaetud faili nimi |
| file_path | text | Faili asukoht Storage'is |
| results | text | AI kontrolli vastus |
| created_at | timestamptz | Loomise aeg (automaatne) |

## Süsteemiprompt AI kontrollile

Süsteemiprompt asub failis `src/prompts/system-prompt.txt`. See sisaldab detailseid juhiseid mikroettevõtja aastaaruande kontrollimiseks:

- Mikro-kategooria kontroll (varad <=450k, tulu <=900k, töötajad <=10)
- Kohustuslikud osad: detailne bilanss, kasumiaruanne, lisad
- Lisade kontroll: arvestuspõhimõtted, seotud osapooled, tööjõukulud
- Netovara kontroll
- Anomaaliate ja ebaloogilisuste tuvastamine
- Struktureeritud väljund eesti keeles

## Lehed/vaated

1. **Login/Register** — sisselogimine ja registreerumine
2. **Dashboard** — PDF üleslaadimine + tulemuste kuvamine
3. **Ajalugu** (nice-to-have) — varasemate kontrollide nimekiri

## Mida EI tee

- Ei kontrolli arvude õigsust
- Ei genereeri aruandeid
- Ei saada andmeid kolmandatele osapooltele
