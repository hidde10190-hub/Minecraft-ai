# Code-review en beveiligingsreview (oktober 2026)

Review van `main` @ f771efc, gevolgd door een eerste ronde fixes (stappen 1, 4, 5 en 6) op branch
`fix/review-stappen-1-4-5-6`. Dit document legt vast **wat gevonden is, wat is aangepast, hoe het is
geverifieerd en wat nog openstaat**.

Legenda: **[B]** bevestigd in de code · **[V]** vermoeden, nog te verifiëren.

## 1. Status per stap

| Stap | Onderwerp | Status |
|---|---|---|
| 1 | Dashboard herstellen (build brak door een merge-fout) | Opgelost |
| 2 | Netwerk dichtzetten (127.0.0.1, VNC-wachtwoord, CORS) | **Open** |
| 3 | Authenticatie, keys maskeren, `export-full-zip` | **Open** |
| 4 | Poort-/URL-validatie en escaping in `config.env` | Opgelost (rest: zie 4b) |
| 5 | Binaries (69 MB) uit git | Opgelost voor de werkboom (geschiedenis blijft groot) |
| 6 | npm audit, Docker-hardening, CI | Opgelost (Docker-runtime niet getest) |
| 7 | Opruimen en onderhoud | **Open** |

## 2. Wat is aangepast

### Stap 1 – dashboard-build hersteld (commit "fix: herstel dashboard-build")
- **Oorzaak:** een eerdere cherry-pick van `3d-workbench` (conflicten opgelost met "main wint") verwijderde de lokale
  definities van `normalizeBlockId`, `isExactBlockMatch`, `blockNamesCompatible` in `src/App.tsx`, terwijl de bestanden
  `src/utils/blockMatch.ts` en `src/utils/worldMemory.ts` niet waren meegekomen.
- **Fix:** beide bestanden teruggezet (uit commit `6714ef9`), imports toegevoegd (incl. `noteLessonLocal`, dat ook in de
  oorspronkelijke branch niet geïmporteerd werd) en de declaratie van `playerRef` toegevoegd die de overgenomen
  verdrinkingsbeveiliging nodig heeft.
- **Resultaat:** `tsc --noEmit` van 15 fouten naar 0.

### Stap 4 – invoervalidatie (`server.ts`)
- `isValidPortString`: de bridge-poort moet `1–65535` zijn. Voorkomt host-injectie via `/api/bridge/:port/*`
  (bijv. `1@evil.example` leidde het verzoek naar een andere host). Toegepast in de route (HTTP 400) en centraal in
  `getWorkingBridgeBase`.
- `safeBaseUrl`: provider-base-URL's (NVIDIA, Groq, OpenRouter, Ollama) moeten `http(s)` zijn, zonder ingebedde
  credentials. `POST /api/env-config` weigert ongeldige waarden met HTTP 400; de test-/model-routes vallen terug op de
  geconfigureerde waarde.
- `sanitizeEnvValue`: verwijdert CR, LF, NUL, `"` en `\` uit alle waarden voordat ze naar `config.env`/`.env` worden
  geschreven. Voorkomt het injecteren van extra variabelen.
- **4b – niet opgelost:** een aanvaller met toegang tot de API kan nog steeds een *geldige* http(s)-URL als base-URL zetten
  en zo keys naar een eigen server laten sturen. Dit vereist authenticatie (stap 3).

### Stap 5 – binaries uit git
- `framework/.gradle/` en `framework/build/` (o.a. twee kopieën van de Minecraft-jar, 36 MB elk) zijn uit de index
  gehaald (32 bestanden); bestanden blijven lokaal staan.
- `.gitignore` uitgebreid met `framework/.gradle/`, `framework/build/`, `framework/run/`, `*.class`, `*.jar`
  (uitzondering: `gradle-wrapper.jar`) en `.env`.
- **Let op:** de oude commits bevatten de bestanden nog (repo-pack ≈ 65 MB). Verkleinen kan alleen met een
  history-rewrite (bijv. `git filter-repo`) en een force-push; dat is bewust niet gedaan.

### Stap 6 – dependencies, Docker, CI
- `npm audit fix` (alleen lockfile): 4 kwetsbaarheden (1 critical, 1 high, 2 moderate) naar 0.
- `docker-compose.yml`: `cap_add: SYS_MODULE` verwijderd, `security_opt: no-new-privileges`,
  `itzg/minecraft-server:latest` → `:java21`. De **dubbele top-level `services:`** (merge-artefact waardoor
  `minecraft-standalone-client` uit de configuratie viel) is hersteld.
- `.github/workflows/ci.yml`: `npm ci`, `tsc`, `vite build` en `npm audit --audit-level=high` op elke push/PR.

## 3. Verificatie
- Schone kopie van `HEAD`: `npm ci` → 0 kwetsbaarheden, `tsc` → 0 fouten, `npm run build` slaagt.
- Rooktest van de gebouwde server: `/api/bridge/1@evil.example/status` → 400; `/api/bridge/8080/status` → 502 (geen bot
  actief, verwacht); `ollamaBaseUrl` met credentials → 400; `botTeamName` met `"` en newline wordt als één regel
  `BOT_TEAM_NAME="xEVIL=1"` weggeschreven.
- `docker-compose.yml` geparsed met PyYAML: drie services aanwezig.
- **Niet getest:** Docker-runtime (Docker ontbreekt op de ontwikkelmachine), Java-mod, Python-tests, de React-UI in de browser.

## 4. Nog open (hoogste prioriteit eerst)
1. **Geen authenticatie** op het dashboard en op de Java-bridge; beide luisteren op `0.0.0.0` (**S1, S7**). Java-bridge heeft
   bovendien CORS `*` en accepteert o.a. `send_chat` (met `/commando's`), `connect_server` en accountwissel.
2. `GET /api/env-config` geeft alle API-keys terug en `GET /api/export-full-zip` zipt `config.env`/`.env` mee (**S2, S3**).
3. VNC draait zonder wachtwoord (`-nopw`) en 5900/6080 zijn naar de host gepubliceerd; poorten staan niet op `127.0.0.1` (**S8**).
4. Containers draaien als root (niet aangepast: zonder Docker niet te testen).
5. Dashboard schrijft API-keys naar `config.env`, dat in git getrackt wordt – risico op per ongeluk committen.
6. De NVIDIA-key uit het verwijderde `master` moet door de eigenaar worden **ingetrokken**.
7. Overig: opgeslagen skills/failures zonder limiet (mogelijke prompt-injectie), 25 MB body-limiet zonder rate limiting,
   Gemini-key in URL (`?key=`), requestlog schrijft query-strings, dubbele route `/api/nvidia/test`, `server.test.cjs`
   is een bundel en geen test, `src/data/sourceFiles.ts` is een kopie van broncode, grote bestanden (`server.ts` 3.9k regels).

## 5. Volledig reviewrapport (oorspronkelijke bevindingen)

Gelezen: `server.ts` (kritieke delen), `GameStateExporter.java` (routes/acties), docker-compose, Dockerfiles,
Python-orchestrator (aanroepen), repo-hygiëne, npm audit, tsc. **Niet** gelezen: het grootste deel van de React-componenten,
`LitematicaBridge`/`VoiceChatBridge`/`AutoConnectHandler`, Python `memory_engine`/`action_validation` (inhoudelijk).

### Kritiek
- **S1 [B]** Geen authenticatie op de dashboard-server; luistert op `0.0.0.0` (`server.ts`, ~36 routes).
- **S2 [B]** `GET /api/env-config` geeft alle API-keys in leesbare tekst terug.
- **S3 [B]** `GET /api/export-full-zip` zipt de werkmap inclusief `config.env`/`.env`.
- **S4 [B]** Key-exfiltratie via instelbare base-URL's (gedeeltelijk gemitigeerd, zie 4b).
- **S5 [B]** Injectie in `config.env` via ongeëscapete waarden (**opgelost**).
- **S6 [B]** SSRF/host-injectie via `/api/bridge/:port/*` (**opgelost**).
- **S7 [B]** Java-bridge zonder auth, CORS `*`, ongeëscapete JSON in `/api/session/offline`-response.
- **S8 [B]** Docker: VNC zonder wachtwoord en gepubliceerd; `SYS_MODULE` (**verwijderd**); root; `:latest` (**gepind**).

### Hoog
- **H1 [B]** 69 MB binaries in git (**uit de index gehaald**).
- **H2 [B]** `gradlew` haalt `gradle-wrapper.jar` van `raw.githubusercontent.com/.../master` zonder checksum (supply-chain).
- **H3 [B]** Geen limieten/validatie op `POST /api/ai/skills|failures`; mogelijk prompt-injectie met persistentie **[V]**.
- **H4 [B]** Gemini-key in URL (`?key=`) in `ai_orchestrator.py`.
- **H5 [B]** Requestlog schrijft `originalUrl` incl. query-strings.
- **H6 [B]** `express.json({limit:"25mb"})` globaal, geen rate limiting.
- **H7 [B]** Server-side fetch naar client-opgegeven Ollama-URL (beperkt tot GET; nu wel tot http(s) beperkt).
- **H8 [B]** `npm audit`: 1 critical, 1 high (**opgelost**).

### Middel / laag
- Dubbele route `POST /api/nvidia/test` (regels 278 en ~1512).
- `server.test.cjs` is een esbuild-bundel, geen test; er was geen CI (**CI toegevoegd**).
- `execSync("npm run build")` bij ontbrekende `dist` tijdens opstarten.
- Dashboard overschrijft `config.env` zonder back-up of atomaire write **[V]**.
- `src/data/sourceFiles.ts` (3.3k regels) is een kopie van broncode.
- Python `requirements.txt` zonder bovengrenzen/lockfile **[V]**; Java `handleIncomingPacket` thread-safety **[V]**.
- Grote bestanden splitsen; `data/*.json` runtime-data in git; Dockerfile bouwt het dashboard niet; `pack_project.py`,
  `test_*.gradle` en vier `start.*`-varianten consolideren; geen healthchecks of resource-limits.

### Geen problemen gevonden (voor zover gecontroleerd)
- Geen `dangerouslySetInnerHTML`/`eval`/`new Function` in `src/`.
- Python: geen `shell=True`, `eval` of `pickle`; subprocess alleen met lijst-argumenten.
- Geen echte secrets in de huidige `main`-geschiedenis.
