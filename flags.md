# Task: Add Small Country Flags to Match Cards Without Touching the Database

You are working on the `quiniela-wc2026` project.

## Project Context

Tech stack:

* Backend: Go with `net/http` + Chi router
* Database: PostgreSQL hosted on Railway
* Frontend: React + Vite + TailwindCSS
* Hosting: Railway
* The app displays FIFA World Cup 2026 group-stage matches.
* Match data already comes from the API using the existing `matches` table.
* Team names are stored in PostgreSQL in fields such as `home_team` and `away_team`.
* Previous UTF-8 encoding issues have already been fixed in the database.

## Main Goal

Add small country flags next to each team name in the frontend UI, especially inside the match cards, without changing the database, API contract, scoring logic, authentication, prediction logic, deadlines, or migrations.

This is a frontend-only task.

## Very Important Rule

Do not modify PostgreSQL, migrations, seed files, schema, or existing match data.

The flags must be resolved in React using a local frontend mapping based on the team names already received from the API.

Example:

```txt
API / DB:
home_team = "México"
away_team = "Sudáfrica"

Frontend:
teamFlags["México"] = "MX"
teamFlags["Sudáfrica"] = "ZA"

UI:
[MX flag] México  -  [ZA flag] Sudáfrica
```

## Do Not Change

Do not modify:

* Database schema
* Existing migrations
* Seed files
* Match names
* Team names
* API response structure
* Prediction logic
* Scoring logic
* Deadline logic
* Auth logic
* League logic
* Admin result logic

Do not remove accents from team names.

For example:

```txt
Correct: México
Wrong: Mexico

Correct: Panamá
Wrong: Panama

Correct: Bélgica
Wrong: Belgica
```

## Recommended Frontend Approach

Use a local mapping file in the frontend.

Create:

```txt
web/src/lib/teamFlags.ts
```

Suggested mapping:

```ts
export const teamFlags: Record<string, string> = {
  "México": "MX",
  "Sudáfrica": "ZA",
  "Corea del Sur": "KR",
  "Chequia": "CZ",
  "Canadá": "CA",
  "Bosnia y Herzegovina": "BA",
  "Estados Unidos": "US",
  "Paraguay": "PY",
  "Australia": "AU",
  "Türkiye": "TR",
  "Catar": "QA",
  "Suiza": "CH",
  "Brasil": "BR",
  "Marruecos": "MA",
  "Haití": "HT",
  "Escocia": "GB-SCT",
  "Alemania": "DE",
  "Curazao": "CW",
  "Países Bajos": "NL",
  "Japón": "JP",
  "Costa de Marfil": "CI",
  "Ecuador": "EC",
  "Suecia": "SE",
  "Túnez": "TN",
  "España": "ES",
  "Cabo Verde": "CV",
  "Arabia Saudita": "SA",
  "Uruguay": "UY",
  "Bélgica": "BE",
  "Egipto": "EG",
  "Irán": "IR",
  "Nueva Zelanda": "NZ",
  "Austria": "AT",
  "Jordania": "JO",
  "Francia": "FR",
  "Senegal": "SN",
  "Irak": "IQ",
  "Noruega": "NO",
  "Argentina": "AR",
  "Argelia": "DZ",
  "Portugal": "PT",
  "RD Congo": "CD",
  "Uzbekistán": "UZ",
  "Colombia": "CO",
  "Inglaterra": "GB-ENG",
  "Croacia": "HR",
  "Ghana": "GH",
  "Panamá": "PA"
};
```

## Recommended Package

Prefer a lightweight SVG flag package.

Recommended:

```bash
npm install country-flag-icons
```

Alternative:

```bash
npm install flag-icons
```

Prefer local SVG/package assets instead of CDN links so the app works reliably after deployment and does not depend on external network calls.

## Create a Reusable Component

Create:

```txt
web/src/components/TeamName.tsx
```

Expected props:

```ts
type TeamNameProps = {
  name: string;
  align?: "left" | "right" | "center";
};
```

Expected behavior:

* Render a small flag next to the team name.
* Use the existing team name from the API.
* If no flag exists for a team, render only the team name.
* Never crash if the team name is empty, null, undefined, or unexpected.
* Keep the UI mobile-friendly.
* Use SVG flags, not emoji flags.
* Recommended flag size: 20px to 24px.
* Keep flags aligned vertically with the team name.
* Flags are decorative, so use `alt=""` or proper accessible labeling.

## Special Cases

England and Scotland may not be supported by every flag package because they are not standard ISO country codes.

For these:

```ts
"Inglaterra": "GB-ENG"
"Escocia": "GB-SCT"
```

If the selected flag package does not support those codes:

* Do not change the database.
* Do not rename the teams.
* Use a clean fallback showing only the team name.
* Optionally add local SVG files only for England and Scotland if needed.

## Files to Inspect First

Before editing, inspect the current frontend structure:

```txt
web/src/components/MatchCard.tsx
web/src/pages/Matches.tsx
web/src/api/
web/src/types/
```

Find where `home_team` and `away_team` are currently rendered.

Then replace the direct team-name rendering with the new `TeamName` component.

Example:

```tsx
<TeamName name={match.home_team} align="right" />
<TeamName name={match.away_team} align="left" />
```

## Styling Requirements

Use TailwindCSS.

Recommended layout:

```tsx
<div className="inline-flex items-center gap-2 min-w-0">
  <Flag className="h-5 w-5 shrink-0 rounded-sm" />
  <span className="truncate">{name}</span>
</div>
```

For right-aligned team names:

```tsx
<div className="inline-flex items-center justify-end gap-2 min-w-0">
  <span className="truncate">{name}</span>
  <Flag className="h-5 w-5 shrink-0 rounded-sm" />
</div>
```

Do not break the existing card layout.

## Safety Rules

* This task is frontend-only.
* Do not touch PostgreSQL.
* Do not touch migrations.
* Do not touch seed files.
* Do not update match data.
* Do not normalize names.
* Do not remove accents.
* Do not change the API contract unless absolutely necessary.
* Do not add heavy dependencies.
* Do not use a CDN as the primary solution.
* Do not break mobile layout.
* Do not break `npm run build`.

## Validation Steps

After implementation:

Run:

```bash
cd web
npm run build
```

If the project has linting or tests, also run them.

Then verify visually:

* México shows a small flag.
* Sudáfrica shows a small flag.
* Canadá shows a small flag.
* Türkiye shows a small flag.
* Panamá shows a small flag.
* Inglaterra and Escocia do not crash even if their flags are unavailable.
* On mobile, names do not overflow badly.
* Cards still look aligned.

## Expected Deliverable

Return:

1. Files modified.
2. Dependency added, if any.
3. Short explanation of the implementation.
4. Confirmation that `npm run build` passes.
5. If build fails, provide the exact error and do not hide it.
