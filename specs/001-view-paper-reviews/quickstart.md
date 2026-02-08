# Quickstart: Editor Review Visibility (UC-10)

## 1. Prerequisites

- Node.js 20 LTS
- npm 10+
- Repository root: `/home/m_srnic/ece493/lab2/ECE493Lab2`

## 2. Bootstrap MVC Project Skeleton

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
mkdir -p src/models src/controllers src/views src/assets/css src/assets/js
mkdir -p tests/acceptance tests/integration tests/unit
```

Create MVC files mapped in `plan.md`:

- Models: `src/models/paper-model.js`, `src/models/review-model.js`, `src/models/editor-assignment-model.js`, `src/models/review-access-audit-model.js`
- Controllers: `src/controllers/review-page-controller.js`, `src/controllers/review-api-controller.js`
- View and assets: `src/views/editor-reviews.html`, `src/assets/css/editor-reviews.css`, `src/assets/js/editor-reviews.js`

## 3. Install Test/Runtime Dependencies

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm init -y
npm install express
npm install --save-dev jest supertest c8
```

Suggested `package.json` scripts:

```json
{
  "scripts": {
    "test": "jest --runInBand",
    "test:acceptance": "jest tests/acceptance --runInBand",
    "test:integration": "jest tests/integration --runInBand",
    "coverage": "c8 --check-coverage --lines 100 --functions 100 --branches 100 --statements 100 npm test"
  }
}
```

## 4. Implement UC-10 Behavior

- Enforce authorization in `review-api-controller.js` using paper or track assignments.
- Return completed reviews with reviewer identity (`status=available`) for submitted reviews.
- Return pending outcome (`status=pending`) when no submitted reviews exist.
- Return only generic unavailable response (`404`, `Paper reviews unavailable`) for unauthorized/inaccessible requests.
- Record successful accesses in audit model with one-year retention metadata.

## 5. Test and Verify

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm run test:acceptance
npm run test:integration
npm run coverage
```

Required outcomes:

- `Acceptance Tests/UC-10-AS.md` scenarios pass exactly as written.
- In-scope JavaScript coverage reports 100% line coverage target.
- No previously passing UC acceptance suite regresses.

## 6. Manual API Validation Examples

Authorized editor with completed reviews:

```bash
curl -i -b "session_id=<authorized-session>" \
  "http://localhost:3000/api/papers/PAPER-123/reviews"
```

Authorized editor with no completed reviews:

```bash
curl -i -b "session_id=<authorized-session>" \
  "http://localhost:3000/api/papers/PAPER-EMPTY/reviews"
```

Unauthorized editor:

```bash
curl -i -b "session_id=<unauthorized-session>" \
  "http://localhost:3000/api/papers/PAPER-123/reviews"
```

Expected unauthorized/inaccessible response body:

```json
{"message":"Paper reviews unavailable"}
```
