# Audit Apply Notes — AIDentalPracticeManager

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_02.md` (lines 1183-1221).

The audit reports 0 AI endpoints. Inspection shows 3 already exist in
`routes/aiNew.js` (insurance-preauth, treatment-plan-summary, practice-insights)
plus a `/history` endpoint. Audit metadata is stale.

## Original audit recommendations

### Missing AI counterparts (audit)
- `/diagnose-from-xray`, `/predict-treatment-outcome`,
  `/identify-recall-candidates`, `/optimize-scheduling`, `/predict-no-show`,
  `/insurance-claim-optimization`, `/treatment-recommendations`,
  `/patient-risk-scoring`.

### Missing non-AI features
- Dental imaging (PACS) integration.
- Intraoral camera integration.
- EHR compliance.
- Patient portal / reminders.
- Insurance eligibility verification.

### Custom feature suggestions
- Predictive AI diagnostics (CV on x-rays).
- Patient risk stratification.
- Treatment outcome prediction.
- Appointment no-show prediction.
- Insurance claim automation.

## Implemented in this pass (mechanical)

1. `POST /api/ai/predict-no-show` — closes audit gap `/predict-no-show`.
2. `POST /api/ai/identify-recall-candidates` — closes audit gap
   `/identify-recall-candidates`.

Both stateless, follow the existing `queryOpenRouter` + `aiRateLimiter` +
`persistAIResult` pattern. No schema changes (the existing `ai_results` table
absorbs them). Verified with `node --check`.

## Backlog (not implemented this pass)

### Mechanical, low-risk
- `/api/ai/predict-treatment-outcome` — outcome estimation.
- `/api/ai/patient-risk-scoring` — risk-stratification scoring.
- `/api/ai/optimize-scheduling` — schedule optimization.
- `/api/ai/insurance-claim-optimization` — claim-optimization helper.

### Needs product decision
- `/diagnose-from-xray` requires CV models, not LLM (avoid stub endpoint).
- Patient-portal feature design.

### Needs credentials / external SDK
- Practice-management integrations (Dentrix, Open Dental, Eaglesoft).
- Imaging (PACS DICOM).
- Insurance eligibility (Eligible, Change Healthcare).

### Too risky / large refactor
- Real CV-based x-ray diagnostics.
- HIPAA-compliant patient portal with secure messaging.

## Apply pass 4 (mechanical backlog)

Implemented all four mechanical backlog items as stateless AI endpoints in `backend/routes/aiNew.js`:

1. `POST /api/ai/predict-treatment-outcome` — outcome estimation from patient profile + treatment plan.
2. `POST /api/ai/patient-risk-scoring` — caries / perio / adherence risk stratification with recall interval.
3. `POST /api/ai/optimize-scheduling` — schedule optimization suggestions for a day/week.
4. `POST /api/ai/insurance-claim-optimization` — CDT-aware claim review with narrative + attachment recommendations.

Each endpoint short-circuits with HTTP 503 when `OPENROUTER_API_KEY` is missing, follows the existing `queryOpenRouter` + `parseAIJson` + `persistAIResult` + `aiRateLimiter` pattern, and persists to the existing `ai_results` JSONB table.

Frontend: `frontend/src/pages/AINewTools.js` extended with four new tool cards (matching icons / placeholders / `parseJson` flags) so the AI Center exposes all six endpoints. No App.js / sidebar changes required (page already routed).

Smoke test: `node --check` PASS for `aiNew.js`; `esbuild` PASS for `AINewTools.js`. Live HTTP smoke skipped (PostgreSQL dependency in start.sh).

Deferred from earlier passes: `/diagnose-from-xray` (TOO-RISKY: real CV models, not LLM); imaging / EHR / PMS integrations (NEEDS-CREDS); HIPAA secure messaging / patient portal (NEEDS-PRODUCT-DECISION + TOO-RISKY).

## Apply pass 3 (frontend)

FE already wired. `frontend/src/pages/AINewTools.js` is the existing CRA-based AI tools page; it lists at least the two pass-2 endpoints (`/ai/predict-no-show`, `/ai/identify-recall-candidates`) and the older endpoints in `routes/aiNew.js`. Routed in `App.js` at `/ai-new-tools`. No FE changes made this pass.

## Apply pass 5 (all backlog)

10 features added.

### NEEDS-CREDS (503 stubs)
- Dentrix sync — `POST /api/integrations/dentrix/sync` — env: `DENTRIX_API_KEY, DENTRIX_PRACTICE_ID`.
- Open Dental sync — `POST /api/integrations/opendental/sync` — env: `OPENDENTAL_API_KEY, OPENDENTAL_BASE_URL`.
- Eaglesoft sync — `POST /api/integrations/eaglesoft/sync` — env: `EAGLESOFT_API_KEY, EAGLESOFT_PRACTICE_ID`.
- PACS DICOM — `POST /api/integrations/pacs/study` — env: `PACS_BASE_URL, PACS_AE_TITLE`.
- Eligible eligibility — `POST /api/integrations/eligibility/eligible` — env: `ELIGIBLE_API_KEY`.
- Change Healthcare eligibility — `POST /api/integrations/eligibility/change-healthcare` — env: `CHC_API_KEY, CHC_TRADING_PARTNER_ID`.
- Twilio SMS reminder — `POST /api/integrations/sms/twilio` — env: `TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER`.

### NEEDS-PRODUCT-DECISION
- Patient portal — `GET /api/portal/my-summary` returns the JWT user's patient record + appointment/treatment placeholders. Scope decision: minimal portal until full HIPAA infra is in place.
- Secure messaging — `POST/GET /api/portal/messages`. Uses guarded `CREATE TABLE IF NOT EXISTS portal_messages`. No existing schema modified.

### TOO-RISKY (with guardrails)
- X-ray CV diagnostics — `POST /api/xray-cv/analyze`. Heuristic stub, deterministic per study_uid. Clearly labelled "NOT a clinical diagnostic". Activates a real CV pipeline only when `XRAY_CV_PROVIDER` is set.

### Files
- `backend/routes/integrations.js`
- `backend/routes/portal.js`
- `backend/routes/xrayCv.js`
- `backend/server.js` (3 line additions to mount routes)
- `frontend/src/pages/Integrations.js`
- `frontend/src/pages/PortalAndCv.js`
- `frontend/src/App.js` (route + nav additions)

### Smoke test
PASS — backend booted on alt port 3092 (3001 occupied by another project), `/api/health` 200, login OK, JWT-authenticated tests against new routes returned proper 503/200 payloads.
