/**
 * Debug helper (Session 72 final verification): cek konsistensi Σ payments vs amountPaid
 * pada bill-bill yang dilaporkan verify-community-seed.
 */
import { prisma } from '../src';

async function main() {
    const bills = await prisma.communityDuesBill.findMany({
        where: { billNumber: { startsWith: 'TAG/' } },
        include: { payments: { orderBy: { paidAt: 'asc' } } },
    });

    const inconsistent: string[] = [];
    for (const b of bills) {
        const sum = b.payments.reduce((acc, p) => acc + p.amount.toNumber(), 0);
        if (Math.abs(sum - b.amountPaid.toNumber()) > 0.001) {
            inconsistent.push(b.billNumber);
            console.log(`\n❌ ${b.billNumber}`);
            console.log(`   status=${b.status} amountDue=${b.amountDue.toNumber()} amountPaid=${b.amountPaid.toNumber()} Σpayments=${sum} count=${b.payments.length}`);
            for (const p of b.payments) {
                console.log(`   - ${p.paymentNumber} amount=${p.amount.toNumber()} method=${p.method} paidAt=${p.paidAt?.toISOString().slice(0, 16)}`);
            }
        }
    }
    console.log(`\nTotal bills: ${bills.length}, inconsistent: ${inconsistent.length}`);
    if (inconsistent.length) console.log(inconsistent.join('\n'));
    await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
