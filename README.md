# S1VAULT — Gestionnaire de mots de passe (E2EE)

Application web moderne « dark cyber premium » avec chiffrement de bout en bout côté client, API Node.js/Express et base SQLite (extensible MySQL).

## Pile technique
- Frontend: React + Vite + TypeScript, WebCrypto (PBKDF2 + AES‑GCM), cookies avec `credentials: include`, thème sombre S1VAULT.
- Backend: Node.js + Express, JWT httpOnly en cookie, CORS, `bcryptjs` pour hash, TOTP via `otplib`.
- Base de données: Prisma ORM + SQLite (défaut). Migration future MySQL possible.

## Lancer en local
1) Backend
```
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```
L’API écoute sur http://localhost:4000 (CORS pour http://localhost:5173)

2) Frontend
```
cd ../client
npm install
npm run dev
```
Le front écoute sur http://localhost:5173 et **proxy** `^/api` vers http://localhost:4000

## Flux d’authentification
- `POST /api/auth/register` → crée l’utilisateur, renvoie `masterSalt` (base64) pour dériver la clé maître côté client (PBKDF2 SHA‑256 / 150k itérations, AES‑GCM 256).
- `POST /api/auth/login` → cookie JWT httpOnly. Si TOTP activé, renvoie `{ mfaRequired: true }` et attend un code `totp` ou `recoveryCode`.
- `GET /api/auth/me` → renvoie l’utilisateur courant (ou `null`).
- `POST /api/auth/logout` → supprime le cookie.
- TOTP: `/api/auth/totp/setup` (secret + otpauth), `/api/auth/totp/enable` (vérifie code et active), `/api/auth/recovery/regenerate`.

## Coffre (E2EE)
- Le client chiffre des paires `{ username, password }` via `AES‑GCM` avec `masterKey` dérivée localement.
- Le serveur stocke uniquement `{ cipherText, iv }` + méta utiles (titre, domaine, force, 2FA, fingerprint tronqué pour détection de réutilisation).
- Endpoints: `GET/POST/PATCH/DELETE /api/vault/entries`, `POST /api/vault/entries/:id/touch`.

## Centre de sécurité
- `/api/security/summary` → compte faibles/réutilisés/anciens/sans 2FA.
- `/api/security/problems` → liste priorisée par sévérité.

## Passer à MySQL plus tard
- Modifier `provider` et `DATABASE_URL` dans `server/prisma/schema.prisma`.
- Exemple `.env` MySQL:
```
DATABASE_URL="mysql://user:pass@localhost:3306/s1vault"
```
- Puis:
```
cd server
npx prisma generate
npx prisma migrate deploy   # ou migrate dev selon le flux
```

## Sécurité & notes
- Ne JAMAIS envoyer la clé maître au serveur. Elle reste en mémoire du navigateur uniquement.
- Le fingerprint `secretFingerprint` est calculé côté client (SHA‑256 hex tronqué) pour détecter les réutilisations sans exposer le mot de passe.
- Les cookies sont `httpOnly`/`sameSite=lax`. En prod, activer `COOKIE_SECURE=true`.
- Changer `JWT_SECRET` en production.

## Scripts utiles
- `server/package.json`: `dev`, `start`, `prisma:generate`, `prisma:migrate`, `prisma:studio`
- `client/package.json`: `dev`, `build`, `preview`

Bonne exploration de S1VAULT !
