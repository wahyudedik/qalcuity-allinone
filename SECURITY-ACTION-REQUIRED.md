# ⚠️ SECURITY ACTION REQUIRED — 24 September 2026

## Critical Finding
`.env.production` file containing ALL production secrets was found committed to git repository.

## Affected Secrets (ALL need rotation)
- DATABASE_URL (PostgreSQL password)
- REDIS_URL (Redis password)  
- NEXTAUTH_SECRET
- JWT_SECRET
- GOOGLE_CLIENT_SECRET
- SMTP_PASS (Email password)
- SMTP_ENCRYPTION_KEY
- CRON_SECRET
- MIDTRANS_SERVER_KEY
- XENDIT_SECRET_KEY

## Required Actions (Manual)

### 1. Rotate ALL Secrets (IMMEDIATE)
- [ ] PostgreSQL: Generate new password, update on server
- [ ] Redis: Generate new password, update on server
- [ ] NextAuth: Generate new secret (`openssl rand -base64 32`)
- [ ] JWT: Generate new secret (`openssl rand -base64 32`)
- [ ] Google OAuth: Regenerate client secret in Google Console
- [ ] SMTP: Generate new app password
- [ ] SMTP_ENCRYPTION_KEY: Generate new key (`openssl rand -hex 32`)
- [ ] Cron: Generate new secret (`openssl rand -base64 32`)
- [ ] Midtrans: Regenerate server key in Midtrans dashboard
- [ ] Xendit: Regenerate secret key in Xendit dashboard

### 2. Update VPS .env
- [ ] Update all secrets in `/www/wwwroot/qalcuity/.env`
- [ ] Restart application via aaPanel

### 3. Remove from Git History
```bash
# Using BFG Repo-Cleaner (recommended)
bfg --delete-files .env.production
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### 4. Verify
- [ ] Confirm .env.production is in .gitignore
- [ ] Confirm .env.production.example exists
- [ ] Confirm .env.production is NOT in git history
- [ ] Test application with new secrets

## Timeline
- **Secrets rotation**: Within 24 hours
- **Git history cleanup**: Within 48 hours
- **Verification**: Within 72 hours
