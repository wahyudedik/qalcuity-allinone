/**
 * Verifikasi READ-ONLY data Community seed — RT 02 Melati (Subtask H + Fase 2 Subtask L).
 *
 * Jalankan: npx tsx scripts/verify-community-seed.ts  (dari packages/db)
 *
 * Membuktikan (plans/community-mvp-implementation.md §7.4 +
 * plans/community-phase2-implementation.md §8.2):
 *  (a) Tenant rt02-melati ada & terisolasi dari qalcuity-demo
 *  (b) 4 custom roles (isSystem=false) dengan permission matrix persis §4.2
 *      + 4 users ter-link roleId (system role MEMBER)
 *  (c) 30 members (27 ACTIVE, 2 INACTIVE, 1 MOVED); NIK/NKK terenkripsi
 *      (format base64:iv:tag:cipher — BUKAN plaintext 16 digit)
 *  (d) 3 dues types; bills periode 2026-08/09/10 unik per
 *      [member, duesType, period]; status PAID/PARTIAL/UNPAID/VOID konsisten
 *      dengan amountPaid (PAID = lunas, PARTIAL di antaranya, UNPAID/VOID = 0)
 *  (e) Payments konsisten: Σ pembayaran per bill === bill.amountPaid
 *  (f) Cash transactions mix: 12 total (INCOME 4 + EXPENSE 8); APPROVED ≥ 4,
 *      PENDING ≥ 1, REJECTED ≥ 1;
 *      SoD: creator ≠ approver; APPROVED wajib approvedBy, REJECTED wajib reason
 *  (g) Surat (Fase 2): 5 surat (ISSUED 3 / DRAFT 1 / REVOKED 1); nomor
 *      SRT/<PNG|DOM|SKT|KTR>/<YYYY>-<seq3> unique; verifyToken 32-hex unique;
 *      DRAFT letterNumber null; REVOKED punya revokeReason; bodySnapshot
 *      terisi IFF ISSUED/REVOKED
 *  (h) Kegiatan (Fase 2): 3 kegiatan (DONE 1 / PLANNED 1 / CANCELLED 1);
 *      eventNumber KGT/<YYYY>-<seq3> unique; CANCELLED tanpa publishedAt
 *  (i) Realisasi (Fase 2): Σ APPROVED tx eventId=KGT/2026-001 = 480000; semua
 *      tx ber-eventId APPROVED; cash tx lama (10 baris Fase 1) eventId NULL
 *  (j) Isolasi: tidak ada surat/kegiatan di tenant selain rt02-melati —
 *      khususnya qalcuity-demo bersih
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Format enkripsi encrypt(): base64(iv):base64(authTag):base64(encrypted). */
const ENCRYPTED_FORMAT = /^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/;

const EXPECTED_ROLE_MATRIX: Record<string, string[]> = {
    KETUA: ["community:view", "community:manage", "community:finance", "community:approve"],
    BENDAHARA: ["community:view", "community:finance"],
    SEKRETARIS: ["community:view", "community:manage"],
    WARGA: ["community:portal"],
};

const EXPECTED_USER_ROLES: Record<string, string> = {
    "ketua@rt02-melati.test": "KETUA",
    "bendahara@rt02-melati.test": "BENDAHARA",
    "sekretaris@rt02-melati.test": "SEKRETARIS",
    "warga@rt02-melati.test": "WARGA",
};

async function main() {
    let failures = 0;
    const check = (label: string, ok: boolean, detail = ""): void => {
        console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
        if (!ok) failures += 1;
    };

    // ══════════════════════════════════════════════════════════
    // (a) Tenant
    // ══════════════════════════════════════════════════════════
    console.log("── Tenant ──");
    const tenant = await prisma.tenant.findUnique({ where: { slug: "rt02-melati" } });
    if (!tenant) throw new Error("Tenant rt02-melati tidak ditemukan — jalankan seed dulu (SEED_DEMO=true npx prisma db seed)");
    const tenantId = tenant.id;
    console.log(`Tenant: ${tenant.name} (${tenantId})\n`);

    // ══════════════════════════════════════════════════════════
    // (b) Roles + Users
    // ══════════════════════════════════════════════════════════
    console.log("── Roles & Users ──");
    const roles = await prisma.role.findMany({
        where: { tenantId },
        select: { id: true, name: true, isSystem: true, permissions: true },
    });
    check("4 custom roles (KETUA, BENDAHARA, SEKRETARIS, WARGA)",
        roles.length === 4, roles.map((r) => r.name).join(", "));
    for (const role of roles) {
        check(`Role ${role.name} isSystem=false`, role.isSystem === false);
        const expected = EXPECTED_ROLE_MATRIX[role.name];
        if (!expected) {
            check(`Role ${role.name} dikenal`, false, "role tak terduga");
            continue;
        }
        const actual = Array.isArray(role.permissions) ? [...(role.permissions as string[])].sort() : [];
        const want = [...expected].sort();
        check(`Permission ${role.name} = [${want.join(", ")}]`,
            JSON.stringify(actual) === JSON.stringify(want),
            `[${actual.join(", ")}]`);
    }

    const users = await prisma.user.findMany({
        where: { tenantId },
        select: { id: true, email: true, role: true, roleId: true, customRole: { select: { name: true } } },
    });
    check("4 users @rt02-melati.test", users.length === 4, users.map((u) => u.email).join(", "));
    for (const [email, roleName] of Object.entries(EXPECTED_USER_ROLES)) {
        const user = users.find((u) => u.email === email);
        check(`User ${email} -> role ${roleName}`,
            user != null && user.roleId != null && user.customRole?.name === roleName,
            user ? `systemRole=${user.role}, customRole=${user.customRole?.name ?? "-"}` : "tidak ada");
    }

    // ══════════════════════════════════════════════════════════
    // (c) Members + enkripsi NIK
    // ══════════════════════════════════════════════════════════
    console.log("\n── Members ──");
    const members = await prisma.communityMember.findMany({
        where: { tenantId },
        select: {
            id: true, code: true, status: true,
            nikEncrypted: true, nomorKkEncrypted: true, userId: true,
        },
        orderBy: { code: "asc" },
    });
    check("30 members (W-001..W-030)", members.length === 30, `${members.length}`);
    const statusCounts = new Map<string, number>();
    for (const m of members) statusCounts.set(m.status, (statusCounts.get(m.status) ?? 0) + 1);
    check("Distribusi 27 ACTIVE / 2 INACTIVE / 1 MOVED",
        statusCounts.get("ACTIVE") === 27 && statusCounts.get("INACTIVE") === 2 && statusCounts.get("MOVED") === 1,
        [...statusCounts.entries()].map(([s, c]) => `${s}:${c}`).join(", "));

    const plaintextNik = members.filter((m) => m.nikEncrypted != null && /^\d{16}$/.test(m.nikEncrypted));
    check("NIK tidak ada yang plaintext 16-digit", plaintextNik.length === 0,
        plaintextNik.map((m) => m.code).join(", "));
    const badFormat = members.filter((m) => m.nikEncrypted != null && !ENCRYPTED_FORMAT.test(m.nikEncrypted));
    check("Semua NIK terenkripsi (format base64:tag:cipher)", badFormat.length === 0,
        badFormat.map((m) => m.code).join(", "));
    const badKk = members.filter((m) => m.nomorKkEncrypted != null && !ENCRYPTED_FORMAT.test(m.nomorKkEncrypted));
    check("Semua Nomor KK terenkripsi", badKk.length === 0, badKk.map((m) => m.code).join(", "));
    const linkedPortal = members.filter((m) => m.userId != null);
    check("≥ 1 member ter-link akun portal (userId)", linkedPortal.length >= 1,
        linkedPortal.map((m) => m.code).join(", "));

    // ══════════════════════════════════════════════════════════
    // (d) Dues types + bills
    // ══════════════════════════════════════════════════════════
    console.log("\n── Dues Types & Bills ──");
    const duesTypes = await prisma.communityDuesType.findMany({
        where: { tenantId },
        select: { id: true, code: true, amount: true, frequency: true },
    });
    check("3 dues types (IURAN-BULANAN, IURAN-KEBERSIHAN, KAS-SOSIAL)",
        duesTypes.length === 3, duesTypes.map((d) => d.code).join(", "));
    const bulanan = duesTypes.find((d) => d.code === "IURAN-BULANAN");
    check("IURAN-BULANAN amount 150000 MONTHLY",
        bulanan != null && bulanan.amount.toNumber() === 150000 && bulanan.frequency === "MONTHLY",
        bulanan ? `${bulanan.amount.toNumber()} ${bulanan.frequency}` : "tidak ada");

    const bills = await prisma.communityDuesBill.findMany({
        where: { tenantId },
        select: {
            id: true, billNumber: true, period: true, status: true,
            amountDue: true, amountPaid: true, memberId: true, duesTypeId: true,
            payments: { select: { id: true, amount: true } },
        },
    });
    check("Bills > 0", bills.length > 0, `${bills.length} bills`);

    // Unik per [member, duesType, period]
    const dupKeys = new Map<string, number>();
    for (const b of bills) {
        const key = `${b.memberId}|${b.duesTypeId}|${b.period}`;
        dupKeys.set(key, (dupKeys.get(key) ?? 0) + 1);
    }
    const dups = [...dupKeys.entries()].filter(([, n]) => n > 1);
    check("Bill unik per [member, duesType, period]", dups.length === 0,
        dups.length > 0 ? `${dups.length} kunci duplikat` : "tanpa duplikat");

    // Format nomor tagihan TAG/<periode>/<kodeWarga>-<kodeIuran>
    const badNumber = bills.filter((b) => !b.billNumber.startsWith(`TAG/${b.period}/`));
    check("Format billNumber TAG/<periode>/...", badNumber.length === 0,
        badNumber.slice(0, 3).map((b) => b.billNumber).join(", "));

    // Status presence + konsistensi amountPaid
    const billStatusCounts = new Map<string, number>();
    for (const b of bills) billStatusCounts.set(b.status, (billStatusCounts.get(b.status) ?? 0) + 1);
    check("Status mix PAID + PARTIAL + UNPAID + VOID hadir",
        billStatusCounts.has("PAID") && billStatusCounts.has("PARTIAL") &&
        billStatusCounts.has("UNPAID") && billStatusCounts.has("VOID"),
        [...billStatusCounts.entries()].map(([s, c]) => `${s}:${c}`).join(", "));

    const inconsistent = bills.filter((b) => {
        const due = b.amountDue.toNumber();
        const paid = b.amountPaid.toNumber();
        if (paid > due) return true;
        if (b.status === "PAID") return paid !== due;
        if (b.status === "PARTIAL") return !(paid > 0 && paid < due);
        if (b.status === "UNPAID" || b.status === "VOID") return paid !== 0;
        return true; // status tak dikenal
    });
    check("amountPaid konsisten dengan status (PAID lunas / PARTIAL di antara / UNPAID=0 / VOID=0)",
        inconsistent.length === 0,
        inconsistent.slice(0, 3).map((b) => `${b.billNumber}:${b.status}:${b.amountPaid.toNumber()}`).join(", "));

    // Periode hadir
    const periods = new Set(bills.map((b) => b.period));
    check("Periode 2026-08, 2026-09, 2026-10 hadir",
        periods.has("2026-08") && periods.has("2026-09") && periods.has("2026-10"),
        [...periods].sort().join(", "));

    // ══════════════════════════════════════════════════════════
    // (e) Payments konsisten
    // ══════════════════════════════════════════════════════════
    console.log("\n── Payments ──");
    check("Payments > 0", bills.reduce((s, b) => s + b.payments.length, 0) > 0,
        `${bills.reduce((s, b) => s + b.payments.length, 0)} payments`);

    const payInconsistent = bills.filter((b) => {
        const sum = b.payments.reduce((s, p) => s + p.amount.toNumber(), 0);
        return Math.abs(sum - b.amountPaid.toNumber()) > 0.001;
    });
    check("Σ pembayaran per bill === amountPaid", payInconsistent.length === 0,
        payInconsistent.slice(0, 3).map((b) => b.billNumber).join(", "));

    // Tagihan PAID/PARTIAL wajib punya ≥ 1 payment
    const missingPay = bills.filter(
        (b) => (b.status === "PAID" || b.status === "PARTIAL") && b.payments.length === 0
    );
    check("Setiap PAID/PARTIAL punya ≥ 1 payment", missingPay.length === 0,
        missingPay.slice(0, 3).map((b) => b.billNumber).join(", "));

    // Format pembayaran BYR/<YYYYMMDD>-<seq>
    const payments = await prisma.communityDuesPayment.findMany({
        where: { tenantId },
        select: { paymentNumber: true },
    });
    const badPayNumber = payments.filter((p) => !/^BYR\/\d{8}-\d{3}$/.test(p.paymentNumber));
    check("Format paymentNumber BYR/<YYYYMMDD>-<seq>", badPayNumber.length === 0,
        badPayNumber.slice(0, 3).map((p) => p.paymentNumber).join(", "));

    // ══════════════════════════════════════════════════════════
    // (f) Cash transactions — mix status + SoD
    // ══════════════════════════════════════════════════════════
    console.log("\n── Cash Transactions ──");
    const cashTxs = await prisma.communityCashTransaction.findMany({
        where: { tenantId },
        select: {
            txNumber: true, type: true, status: true, amount: true,
            approvedBy: true, rejectedBy: true, rejectReason: true, createdBy: true,
            eventId: true,
        },
    });
    check("12 cash transactions (10 Fase 1 + 2 realisasi kegiatan)", cashTxs.length === 12, `${cashTxs.length}`);
    const cashStatusCounts = new Map<string, number>();
    for (const t of cashTxs) cashStatusCounts.set(t.status, (cashStatusCounts.get(t.status) ?? 0) + 1);
    check("Cash mix: APPROVED ≥ 4, PENDING ≥ 1, REJECTED ≥ 1",
        (cashStatusCounts.get("APPROVED") ?? 0) >= 4 &&
        (cashStatusCounts.get("PENDING") ?? 0) >= 1 &&
        (cashStatusCounts.get("REJECTED") ?? 0) >= 1,
        [...cashStatusCounts.entries()].map(([s, c]) => `${s}:${c}`).join(", "));
    const incomeCount = cashTxs.filter((t) => t.type === "INCOME").length;
    const expenseCount = cashTxs.filter((t) => t.type === "EXPENSE").length;
    check("Cash mix INCOME 4 + EXPENSE 8", incomeCount === 4 && expenseCount === 8,
        `INCOME:${incomeCount}, EXPENSE:${expenseCount}`);

    const approvedNoBy = cashTxs.filter((t) => t.status === "APPROVED" && t.approvedBy == null);
    check("Setiap APPROVED punya approvedBy", approvedNoBy.length === 0,
        approvedNoBy.map((t) => t.txNumber).join(", "));
    const rejectedNoReason = cashTxs.filter((t) => t.status === "REJECTED" && (t.rejectedBy == null || t.rejectReason == null));
    check("Setiap REJECTED punya rejectedBy + rejectReason", rejectedNoReason.length === 0,
        rejectedNoReason.map((t) => t.txNumber).join(", "));
    const sodViolations = cashTxs.filter(
        (t) => t.status === "APPROVED" && t.createdBy != null && t.createdBy === t.approvedBy
    );
    check("SoD: creator ≠ approver pada APPROVED", sodViolations.length === 0,
        sodViolations.map((t) => t.txNumber).join(", "));
    const badTxNumber = cashTxs.filter((t) => !/^KAS\/\d{8}-\d{3}$/.test(t.txNumber));
    check("Format txNumber KAS/<YYYYMMDD>-<seq>", badTxNumber.length === 0,
        badTxNumber.slice(0, 3).map((t) => t.txNumber).join(", "));

    // ══════════════════════════════════════════════════════════
    // (g) Surat Pengantar (Fase 2) — §8.2 items 1 & 2
    // ══════════════════════════════════════════════════════════
    console.log("\n── Surat Pengantar (Fase 2) ──");
    const letters = await prisma.communityLetter.findMany({
        where: { tenantId },
        select: {
            id: true, letterNumber: true, letterType: true, status: true,
            verifyToken: true, bodySnapshot: true, revokeReason: true,
        },
        orderBy: { createdAt: "asc" },
    });
    check("5 surat", letters.length === 5, `${letters.length}`);
    const letterStatusCounts = new Map<string, number>();
    for (const l of letters) letterStatusCounts.set(l.status, (letterStatusCounts.get(l.status) ?? 0) + 1);
    check("Mix surat: ISSUED 3 / DRAFT 1 / REVOKED 1",
        letterStatusCounts.get("ISSUED") === 3 && letterStatusCounts.get("DRAFT") === 1 &&
        letterStatusCounts.get("REVOKED") === 1,
        [...letterStatusCounts.entries()].map(([s, c]) => `${s}:${c}`).join(", "));

    const draftLetters = letters.filter((l) => l.status === "DRAFT");
    const revokedLetters = letters.filter((l) => l.status === "REVOKED");

    // Nomor surat SRT/<PNG|DOM|SKT|KTR>/<YYYY>-<seq3> — hanya setelah terbit
    const LETTER_NUMBER = /^SRT\/(PNG|DOM|SKT|KTR)\/\d{4}-\d{3}$/;
    const badLetterNumber = letters.filter(
        (l) => l.status !== "DRAFT" && (l.letterNumber == null || !LETTER_NUMBER.test(l.letterNumber))
    );
    check("ISSUED/REVOKED punya letterNumber format SRT/<PNG|DOM|SKT|KTR>/<YYYY>-<seq3>",
        badLetterNumber.length === 0,
        badLetterNumber.map((l) => `${l.status}:${l.letterNumber ?? "null"}`).join(", "));
    const letterNumbers = letters.filter((l) => l.letterNumber != null).map((l) => l.letterNumber as string);
    check("letterNumber unique", new Set(letterNumbers).size === letterNumbers.length,
        `${letterNumbers.length} nomor`);
    const draftWithNumber = draftLetters.filter((l) => l.letterNumber != null);
    check("DRAFT punya letterNumber null", draftWithNumber.length === 0,
        draftWithNumber.map((l) => l.letterNumber).join(", "));

    // verifyToken 32-hex (dibuat saat ISSUE) — unique (kolom @unique global)
    const TOKEN_32HEX = /^[0-9a-f]{32}$/;
    const badToken = letters.filter(
        (l) => l.status !== "DRAFT" && (l.verifyToken == null || !TOKEN_32HEX.test(l.verifyToken))
    );
    check("ISSUED/REVOKED punya verifyToken 32-hex", badToken.length === 0,
        badToken.map((l) => `${l.status}:${l.verifyToken ?? "null"}`).join(", "));
    const tokens = letters.filter((l) => l.verifyToken != null).map((l) => l.verifyToken as string);
    check("verifyToken unique (global)", new Set(tokens).size === tokens.length,
        `${tokens.length} token`);
    const draftWithToken = draftLetters.filter((l) => l.verifyToken != null);
    check("DRAFT tanpa verifyToken (dibuat saat ISSUE)", draftWithToken.length === 0,
        draftWithToken.map((l) => l.id).join(", "));

    const revokedNoReason = revokedLetters.filter(
        (l) => l.revokeReason == null || l.revokeReason.trim() === ""
    );
    check("REVOKED punya revokeReason", revokedNoReason.length === 0,
        revokedNoReason.map((l) => l.letterNumber ?? l.id).join(", "));

    // Invarian: bodySnapshot terisi IFF ISSUED/REVOKED (DRAFT -> null)
    const badSnapshot = letters.filter((l) => (l.status === "DRAFT") !== (l.bodySnapshot == null));
    check("bodySnapshot terisi IFF ISSUED/REVOKED (DRAFT -> null)", badSnapshot.length === 0,
        badSnapshot.map((l) => `${l.status}:${l.letterNumber ?? "null"}`).join(", "));

    // Isolasi: tidak ada surat di tenant selain rt02-melati
    const foreignLetters = await prisma.communityLetter.count({ where: { tenantId: { not: tenantId } } });
    check("Isolasi: 0 surat di tenant selain rt02-melati", foreignLetters === 0, `${foreignLetters}`);

    // ══════════════════════════════════════════════════════════
    // (h) Kegiatan (Fase 2) — §8.2 item 3
    // ══════════════════════════════════════════════════════════
    console.log("\n── Kegiatan (Fase 2) ──");
    const events = await prisma.communityEvent.findMany({
        where: { tenantId },
        select: {
            id: true, eventNumber: true, status: true,
            publishedAt: true, announcementId: true,
        },
        orderBy: { eventNumber: "asc" },
    });
    check("3 kegiatan", events.length === 3, `${events.length}`);
    const eventStatusCounts = new Map<string, number>();
    for (const e of events) eventStatusCounts.set(e.status, (eventStatusCounts.get(e.status) ?? 0) + 1);
    check("Mix kegiatan: DONE 1 / PLANNED 1 / CANCELLED 1",
        eventStatusCounts.get("DONE") === 1 && eventStatusCounts.get("PLANNED") === 1 &&
        eventStatusCounts.get("CANCELLED") === 1,
        [...eventStatusCounts.entries()].map(([s, c]) => `${s}:${c}`).join(", "));
    const badEventNumber = events.filter((e) => !/^KGT\/\d{4}-\d{3}$/.test(e.eventNumber));
    check("Format eventNumber KGT/<YYYY>-<seq3>", badEventNumber.length === 0,
        badEventNumber.map((e) => e.eventNumber).join(", "));
    check("eventNumber unique", new Set(events.map((e) => e.eventNumber)).size === events.length);
    const cancelledPublished = events.filter((e) => e.status === "CANCELLED" && e.publishedAt != null);
    check("CANCELLED tanpa publishedAt", cancelledPublished.length === 0,
        cancelledPublished.map((e) => e.eventNumber).join(", "));

    // Isolasi: tidak ada kegiatan di tenant selain rt02-melati
    const foreignEvents = await prisma.communityEvent.count({ where: { tenantId: { not: tenantId } } });
    check("Isolasi: 0 kegiatan di tenant selain rt02-melati", foreignEvents === 0, `${foreignEvents}`);

    // ══════════════════════════════════════════════════════════
    // (i) Realisasi anggaran kegiatan (Fase 2) — §8.2 items 4 & 7
    // ══════════════════════════════════════════════════════════
    console.log("\n── Realisasi Anggaran (Fase 2) ──");
    // Reverse-relation aman: cash tx lama (Fase 1) semuanya eventId NULL
    const withEvent = cashTxs.filter((t) => t.eventId != null);
    const withoutEvent = cashTxs.filter((t) => t.eventId == null);
    check("Tepat 2 cash tx ber-eventId (realisasi kegiatan)", withEvent.length === 2, `${withEvent.length}`);
    check("Cash tx lama (10 baris Fase 1) eventId NULL — tanpa backfill salah sasaran",
        withoutEvent.length === 10, `${withoutEvent.length} baris eventId NULL`);
    check("Tx ber-eventId semuanya APPROVED (tanpa PENDING/REJECTED)",
        withEvent.every((t) => t.status === "APPROVED"),
        withEvent.map((t) => `${t.txNumber}:${t.status}`).join(", "));

    const kgt001 = events.find((e) => e.eventNumber === "KGT/2026-001");
    check("Event KGT/2026-001 ada", kgt001 != null);
    if (kgt001) {
        const linkedTxs = withEvent.filter((t) => t.eventId === kgt001.id);
        const realisasi = linkedTxs
            .filter((t) => t.status === "APPROVED")
            .reduce((s, t) => s + t.amount.toNumber(), 0);
        check("Realisasi KGT/2026-001 (APPROVED) = 480000", realisasi === 480000,
            `Rp ${realisasi} (dari ${linkedTxs.length} tx)`);
        check("Tx ter-link KGT/2026-001 EXPENSE (realisasi biaya)",
            linkedTxs.every((t) => t.type === "EXPENSE"),
            linkedTxs.map((t) => `${t.txNumber}:${t.type}`).join(", "));
    }

    // ══════════════════════════════════════════════════════════
    // (j) Pengumuman + isolasi tenant
    // ══════════════════════════════════════════════════════════
    console.log("\n── Announcements & Isolasi ──");
    const announcements = await prisma.communityAnnouncement.count({ where: { tenantId } });
    check("2 announcements", announcements === 2, `${announcements}`);

    const demoTenant = await prisma.tenant.findUnique({
        where: { slug: "qalcuity-demo" },
        select: { id: true },
    });
    if (demoTenant) {
        const leaked = await prisma.communityMember.count({ where: { tenantId: demoTenant.id } });
        check("Isolasi: qalcuity-demo punya 0 community members", leaked === 0, `${leaked}`);
        const leakedLetters = await prisma.communityLetter.count({ where: { tenantId: demoTenant.id } });
        check("Isolasi: qalcuity-demo punya 0 surat", leakedLetters === 0, `${leakedLetters}`);
        const leakedEvents = await prisma.communityEvent.count({ where: { tenantId: demoTenant.id } });
        check("Isolasi: qalcuity-demo punya 0 kegiatan", leakedEvents === 0, `${leakedEvents}`);
        const leakedEventTx = await prisma.communityCashTransaction.count({
            where: { tenantId: demoTenant.id, eventId: { not: null } },
        });
        check("Isolasi: qalcuity-demo punya 0 kas ber-eventId", leakedEventTx === 0, `${leakedEventTx}`);
    } else {
        check("Tenant qalcuity-demo ditemukan (cek isolasi)", false, "tidak ada — DB belum ter-seed core?");
    }

    // ── Ringkasan ──
    console.log(`\n${failures === 0 ? "🎉 SEMUA VERIFIKASI COMMUNITY LOLOS" : `⚠️  ${failures} pemeriksaan GAGAL`}`);
    process.exitCode = failures === 0 ? 0 : 1;
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
