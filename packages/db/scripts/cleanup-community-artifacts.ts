/**
 * Cleanup script (Session 72 final verification + Session 74 Fase 3): bersihkan
 * artifact eksperimen/smoke di DB lokal sehingga state kembali ke seed-baseline.
 *
 * Yang dihapus/dikembalikan (targeted, BUKAN reset DB):
 *  1. CommunityDuesPayment yatim: payment pada bill ber-status UNPAID & amountPaid=0.
 *     Pola ini tidak mungkin dihasilkan API pay (atomic $transaction selalu update bill)
 *     maupun seed (rng deterministik, payment hanya untuk plan PAID/PARTIAL).
 *  2. CommunityCashTransaction dengan description prefix 'Smoke test' (artefak smoke matrix).
 *  3. CommunityLetter dengan purpose prefix 'Smoke test surat' (artefak smoke Fase 2).
 *  4. CommunityEvent dengan title prefix 'Smoke test kegiatan' + kas transaksi & peserta
 *     yang ter-link ke kegiatan smoke tersebut (artefak smoke Fase 2 & 3; FK RESTRICT
 *     menuntut peserta dihapus sebelum kegiatan).
 *  5. CommunityEventParticipant di luar baseline seed 8 baris (artefak smoke Fase 3 /
 *     eksperimen portal) + status baris baseline yang ter-flip dikembalikan ke seed.
 *
 * Idempoten: aman dijalankan berulang.
 */
import { prisma } from '../src';

async function main() {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'rt02-melati' } });
    if (!tenant) throw new Error('Tenant rt02-melati tidak ditemukan');
    const tenantId = tenant.id;

    // 1. Hapus payment yatim (bill UNPAID + amountPaid=0 tapi punya payment)
    const orphanPayments = await prisma.communityDuesPayment.findMany({
        where: {
            tenantId,
            bill: { status: 'UNPAID', amountPaid: 0 },
        },
        select: { id: true, paymentNumber: true, amount: true },
    });
    if (orphanPayments.length) {
        await prisma.communityDuesPayment.deleteMany({
            where: { id: { in: orphanPayments.map((p) => p.id) } },
        });
    }
    console.log(`Orphan payments dihapus: ${orphanPayments.length}`);
    for (const p of orphanPayments) {
        console.log(`  - ${p.paymentNumber} amount=${p.amount.toNumber()}`);
    }

    // 2. Hapus cash transaction artefak smoke test
    const smokeTx = await prisma.communityCashTransaction.findMany({
        where: { tenantId, description: { startsWith: 'Smoke test' } },
        select: { id: true, txNumber: true, description: true, amount: true },
    });
    if (smokeTx.length) {
        await prisma.communityCashTransaction.deleteMany({
            where: { id: { in: smokeTx.map((t) => t.id) } },
        });
    }
    console.log(`\nSmoke cash transactions dihapus: ${smokeTx.length}`);
    for (const t of smokeTx) {
        console.log(`  - ${t.txNumber} amount=${t.amount.toNumber()} desc=${t.description}`);
    }

    // 3. Hapus surat artefak smoke test (purpose prefix 'Smoke test surat')
    const smokeLetters = await prisma.communityLetter.findMany({
        where: { tenantId, purpose: { startsWith: 'Smoke test surat' } },
        select: { id: true, letterNumber: true, status: true, purpose: true },
    });
    if (smokeLetters.length) {
        await prisma.communityLetter.deleteMany({
            where: { id: { in: smokeLetters.map((l) => l.id) } },
        });
    }
    console.log(`\nSmoke surat dihapus: ${smokeLetters.length}`);
    for (const l of smokeLetters) {
        console.log(`  - ${l.letterNumber ?? '(DRAFT)'} status=${l.status} purpose=${l.purpose}`);
    }

    // 4. Hapus kegiatan artefak smoke test (title prefix 'Smoke test kegiatan'
    //    ATAU 'Kerja Bakti Smoke Test' — judul aktual dari smoke script [16])
    //    + kas transaksi & peserta yang ter-link ke kegiatan smoke tersebut (agar
    //    count-exak verify tetap konsisten setelah cleanup; FK RESTRICT pada
    //    CommunityEventParticipant menuntut peserta dihapus lebih dulu).
    const smokeEvents = await prisma.communityEvent.findMany({
        where: {
            tenantId,
            OR: [
                { title: { startsWith: 'Smoke test kegiatan' } },
                { title: { startsWith: 'Kerja Bakti Smoke Test' } },
            ],
        },
        select: { id: true, eventNumber: true, title: true, status: true },
    });
    if (smokeEvents.length) {
        await prisma.communityEventParticipant.deleteMany({
            where: { tenantId, eventId: { in: smokeEvents.map((e) => e.id) } },
        });
        await prisma.communityCashTransaction.deleteMany({
            where: { tenantId, eventId: { in: smokeEvents.map((e) => e.id) } },
        });
        await prisma.communityEvent.deleteMany({
            where: { id: { in: smokeEvents.map((e) => e.id) } },
        });
    }
    console.log(`\nSmoke kegiatan dihapus: ${smokeEvents.length}`);
    for (const e of smokeEvents) {
        console.log(`  - ${e.eventNumber} status=${e.status} title=${e.title}`);
    }

    // 5. Peserta kegiatan di luar baseline seed 8 baris (artefak smoke Fase 3 /
    //    eksperimen portal register) dihapus; baris baseline yang statusnya
    //    ter-flip (mis. cancel via portal) dikembalikan ke nilai seed.
    const SEED_PARTICIPANTS: Array<{ eventNumber: string; memberCode: string; status: string }> = [
        { eventNumber: 'KGT/2026-001', memberCode: 'W-001', status: 'ATTENDED' },
        { eventNumber: 'KGT/2026-001', memberCode: 'W-002', status: 'REGISTERED' },
        { eventNumber: 'KGT/2026-001', memberCode: 'W-003', status: 'REGISTERED' },
        { eventNumber: 'KGT/2026-001', memberCode: 'W-004', status: 'CANCELLED' },
        { eventNumber: 'KGT/2026-001', memberCode: 'W-005', status: 'REGISTERED' },
        { eventNumber: 'KGT/2026-002', memberCode: 'W-001', status: 'REGISTERED' },
        { eventNumber: 'KGT/2026-002', memberCode: 'W-006', status: 'REGISTERED' },
        { eventNumber: 'KGT/2026-002', memberCode: 'W-007', status: 'REGISTERED' },
    ];
    const eventByNumber = new Map(
        (await prisma.communityEvent.findMany({ where: { tenantId }, select: { id: true, eventNumber: true } }))
            .map((e) => [e.eventNumber, e.id] as const),
    );
    const memberByCode = new Map(
        (await prisma.communityMember.findMany({ where: { tenantId }, select: { id: true, code: true } }))
            .map((m) => [m.code, m.id] as const),
    );
    /** `${eventId}|${memberId}` -> status seed yang diharapkan. */
    const baseline = new Map<string, string>();
    for (const s of SEED_PARTICIPANTS) {
        const eventId = eventByNumber.get(s.eventNumber);
        const memberId = memberByCode.get(s.memberCode);
        if (eventId && memberId) baseline.set(`${eventId}|${memberId}`, s.status);
    }
    const allParticipants = await prisma.communityEventParticipant.findMany({
        where: { tenantId },
        select: {
            id: true, eventId: true, memberId: true, status: true,
            event: { select: { eventNumber: true } },
            member: { select: { code: true } },
        },
    });
    const strays = allParticipants.filter((p) => !baseline.has(`${p.eventId}|${p.memberId}`));
    if (strays.length) {
        await prisma.communityEventParticipant.deleteMany({
            where: { id: { in: strays.map((p) => p.id) } },
        });
    }
    console.log(`\nSmoke peserta dihapus (di luar baseline seed): ${strays.length}`);
    for (const p of strays) {
        console.log(`  - ${p.event.eventNumber} ${p.member.code} status=${p.status}`);
    }
    const mismatches = allParticipants.filter(
        (p) => baseline.has(`${p.eventId}|${p.memberId}`) && baseline.get(`${p.eventId}|${p.memberId}`) !== p.status,
    );
    for (const p of mismatches) {
        const expected = baseline.get(`${p.eventId}|${p.memberId}`) ?? p.status;
        await prisma.communityEventParticipant.update({ where: { id: p.id }, data: { status: expected } });
    }
    console.log(`Status peserta baseline dikembalikan ke seed: ${mismatches.length}`);
    for (const p of mismatches) {
        console.log(`  - ${p.event.eventNumber} ${p.member.code}: ${p.status} -> ${baseline.get(`${p.eventId}|${p.memberId}`) ?? p.status}`);
    }

    await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
