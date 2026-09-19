# Debug Report: update.sh PostgreSQL Check Failure

> **Date:** 2026-09-19
> **Status:** Investigation Complete — Awaiting Approval
> **Severity:** Medium (blocks deployment, but PostgreSQL is actually running)

---

## 1. Problem Summary

`update.sh` gagal di preflight check dengan error:
```
[2026-09-19 10:06:48] ⚠️  PostgreSQL tidak running. Mencoba start...
[2026-09-19 10:06:50] ❌ PostgreSQL gagal di-start! Jalankan: systemctl start postgresql
```

Script exit dengan code 1, memblokir seluruh proses update.

---

## 2. Affected Code

### Location: [`update.sh`](update.sh:117-126) — Lines 117-126

```bash
# Check PostgreSQL running
if ! systemctl is-active --quiet postgresql 2>/dev/null; then
    print_warning "PostgreSQL tidak running. Mencoba start..."
    systemctl start postgresql 2>/dev/null || true
    sleep 2
    if ! systemctl is-active --quiet postgresql 2>/dev/null; then
        print_error "PostgreSQL gagal di-start! Jalankan: systemctl start postgresql"
        exit 1  # ← FATAL: Script stops here
    fi
fi
```

### Detection Mechanism

| Component | Detail |
|-----------|--------|
| **Command** | `systemctl is-active --quiet postgresql` |
| **Service name checked** | `postgresql` (hardcoded) |
| **Error behavior** | **Fatal** — `exit 1` (script stops completely) |
| **Retry** | Attempts `systemctl start postgresql` once, waits 2 seconds |

---

## 3. Root Cause Analysis

### 5 Possible Sources of the Problem

| # | Hypothesis | Likelihood | Reasoning |
|---|-----------|------------|-----------|
| 1 | **aaPanel PostgreSQL tidak punya systemd unit** | ⭐⭐⭐ HIGH | aaPanel install PostgreSQL via App Store ke `/www/server/pgsql/` — path custom, bukan system package. Kemungkinan besar tidak mendaftarkan systemd unit. |
| 2 | **Service name berbeda** | ⭐⭐ MEDIUM | aaPanel mungkin register service dengan nama berbeda (e.g., `postgresql-16`, `pgsql`, `postgresql-aa`) |
| 3 | **PostgreSQL berjalan tapi tidak via systemd** | ⭐⭐⭐ HIGH | PostgreSQL bisa jalan sebagai standalone process yang di-manage oleh aaPanel's internal process manager, bukan systemd |
| 4 | **systemctl tidak available di VPS** | ⭐ LOW | VPS menggunakan Ubuntu, systemctl seharusnya tersedia |
| 5 | **PostgreSQL memang tidak running** | ⭐ VERY LOW | App berfungsi sebelumnya, yang berarti PostgreSQL pasti accessible |

### Distilled to 1-2 Most Likely Sources

**Root Cause: aaPanel mengelola PostgreSQL secara terpisah dari systemd.**

aaPanel menginstall PostgreSQL ke path custom (`/www/server/pgsql/bin`) dan mengelolanya melalui internal process manager-nya sendiri. Dua kemungkinan terjadi:

1. **PostgreSQL berjalan sebagai standalone process** — tidak terdaftar sebagai systemd service sama sekali. `systemctl is-active postgresql` selalu return `inactive` meskipun PostgreSQL berjalan dan accessible.

2. **Service name berbeda** — aaPanel mungkin mendaftarkan service dengan nama selain `postgresql` (e.g., `postgresql-16`, `pgsql`).

### Bukti Pendukung

- [`deploy.sh`](deploy.sh:26-27) menggunakan `PG_BIN="/www/server/pgsql/bin"` — path custom aaPanel, bukan `/usr/bin/` atau `/usr/lib/postgresql/`
- App berfungsi sebelum update — PostgreSQL **pasti accessible** via TCP/IP (`localhost:5432`)
- Prisma connect ke PostgreSQL via `DATABASE_URL` di [`apps/web/.env`](apps/web/.env) — connection string, bukan systemd
- Error message menyarankan `systemctl start postgresql` — tetapi aaPanel tidak menggunakan systemd untuk PostgreSQL

---

## 4. Impact Analysis

| Aspect | Impact |
|--------|--------|
| **Deployment** | 🔴 **BLOCKED** — update.sh tidak bisa lanjut ke langkah berikutnya |
| **App functionality** | 🟢 **NO IMPACT** — App berjalan normal, PostgreSQL accessible |
| **Database** | 🟢 **NO IMPACT** — Prisma tidak bergantung pada systemd |
| **Recovery** | Manual — harus edit script atau bypass preflight check |

---

## 5. Recommended Fix

### Option A (RECOMMENDED): PostgreSQL Check → Warning (bukan Fatal)

Ubah PostgreSQL check dari fatal error menjadi **warning yang tidak memblokir**. Prisma migrate deploy akan gagal dengan sendirinya jika DB memang tidak accessible.

**Why this is best:**
- Prisma sudah punya error handling sendiri di [`update.sh`](update.sh:291-308)
- PostgreSQL accessibility sudah cukup di-check via Prisma connection
- Menghindari false negative karena perbedaan service management

**Code snippet:**

```bash
# Lines 117-126 — Replace entire block with:

    # Check PostgreSQL running (non-fatal — aaPanel may manage PostgreSQL outside systemd)
    if systemctl is-active --quiet postgresql 2>/dev/null; then
        print_success "PostgreSQL running (systemd)"
    elif command -v pg_isready &>/dev/null && pg_isready -h localhost -p 5432 -q 2>/dev/null; then
        print_success "PostgreSQL running (pg_isready)"
    elif [ -f "/www/server/pgsql/bin/pg_isready" ] && /www/server/pgsql/bin/pg_isready -h localhost -p 5432 -q 2>/dev/null; then
        print_success "PostgreSQL running (aaPanel pg_isready)"
    else
        print_warning "PostgreSQL tidak terdeteksi. Lanjutkan — Prisma akan cek koneksi DB."
        print_warning "Jika migration gagal, pastikan PostgreSQL running dan accessible di localhost:5432"
    fi
```

**Key changes:**
1. Cek 3 metode: systemd → pg_isready (system) → pg_isready (aaPanel path)
2. Jika semua gagal → **warning saja**, tidak `exit 1`
3. Biarkan Prisma migrate deploy yang handle DB connection check

### Option B: Fix Service Name (Jika tahu nama pasti)

Jika kamu bisa SSH ke VPS, jalankan `systemctl list-units --type=service | grep -i pg` untuk cek nama service. Lalu update check:

```bash
# Ganti "postgresql" dengan nama service yang benar
if ! systemctl is-active --quiet postgresql-16 2>/dev/null; then
```

**Risk:** Nama service bisa berbeda antar VPS. Tidak universal.

### Option C: Cek via Port (pg_isready)

```bash
    # Check PostgreSQL via port check (universally reliable)
    if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
        print_success "PostgreSQL running (port 5432 accessible)"
    elif [ -f "/www/server/pgsql/bin/pg_isready" ] && /www/server/pgsql/bin/pg_isready -h localhost -p 5432 -q 2>/dev/null; then
        print_success "PostgreSQL running (aaPanel, port 5432 accessible)"
    else
        print_warning "PostgreSQL port 5432 tidak accessible"
        print_info "Mencoba start via systemctl..."
        systemctl start postgresql 2>/dev/null || true
        sleep 2
        if ! pg_isready -h localhost -p 5432 -q 2>/dev/null; then
            print_error "PostgreSQL tidak accessible! Pastikan PostgreSQL running."
            print_error "Jalankan manual: systemctl start postgresql atau restart dari aaPanel"
            exit 1
        fi
    fi
```

**Risk:** Lebih strict dari Option A. Masih bisa gagal jika PostgreSQL port berbeda.

---

## 6. Recommendation

### Immediate Fix: Apply Option A

Option A paling aman karena:
- ✅ Tidak memblokir deployment jika PostgreSQL accessible
- ✅ Universally compatible dengan semua setup (systemd, aaPanel, custom)
- ✅ Biarkan Prisma yang handle DB connection check (sudah ada error handling)
- ✅ Tetap memberikan warning yang informatif
- ✅ Mengikuti prinsip "fail at the right layer" — DB connection check seharusnya di Prisma layer, bukan di preflight check

### Diagnostic Commands (untuk VPS)

Jalankan di VPS untuk memastikan root cause:

```bash
# Cek apakah PostgreSQL systemd service ada
systemctl list-units --type=service | grep -i pg

# Cek apakah PostgreSQL process berjalan
ps aux | grep postgres

# Cek apakah port 5432 accessible
pg_isready -h localhost -p 5432

# Cek aaPanel PostgreSQL binary
/www/server/pgsql/bin/pg_isready -h localhost -p 5432
```

---

## 7. Files to Modify

| File | Change |
|------|--------|
| [`update.sh`](update.sh:117-126) | Lines 117-126: Replace PostgreSQL check with non-fatal version |

---

**End of Debug Report**
