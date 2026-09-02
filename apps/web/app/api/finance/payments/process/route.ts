import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getPaymentProvider } from '@/lib/payment/provider';
import { processPaymentSchema, formatZodError } from '@/lib/validation-schemas';

// ============================================================
// Payment Gateway Process API
// Menggunakan Payment Provider abstraction layer.
// Mendukung Midtrans, Xendit, dan Mock (development).
// ============================================================

export async function POST(request: Request) {
  try {
    // Rate limit check
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:payments:process:${ip}`, 10, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      );
    }

    // Auth check (permission-based with role fallback)
    const auth = await requirePermissionForRoute(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId, tenantId } = auth;
    const body = await request.json();

    // Validasi input dengan Zod schema
    const validation = processPaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, ...formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Verify invoice exists and belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: { id: validatedData.invoiceId, tenantId },
      include: {
        contact: { select: { name: true, email: true, phone: true } },
        payments: { where: { status: 'COMPLETED' } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice tidak ditemukan' },
        { status: 404 }
      );
    }

    // Calculate remaining amount
    const totalPaid = invoice.payments.reduce((sum: any, p: any) => sum + Number(p.amount), 0);
    const remainingAmount = Number(invoice.total) - Number(totalPaid);

    if (validatedData.amount > remainingAmount) {
      return NextResponse.json(
        { success: false, error: `Jumlah pembayaran melebihi sisa tagihan. Sisa: ${remainingAmount}` },
        { status: 400 }
      );
    }

    // Determine provider from request or env
    const providerName = validatedData.provider || process.env.PAYMENT_PROVIDER || 'mock';

    // Create order ID
    const orderId = `ORD-${invoice.invoiceNumber}-${Date.now()}`;

    // Use Payment Provider abstraction
    const paymentProvider = getPaymentProvider();
    const customerName = validatedData.customerName || invoice.contact?.name || 'Customer';
    const customerEmail = validatedData.customerEmail || invoice.contact?.email || '';
    const customerPhone = validatedData.customerPhone || invoice.contact?.phone || undefined;

    const gatewayResult = await paymentProvider.createPayment({
      orderId,
      amount: validatedData.amount,
      currency: 'IDR',
      customerName,
      customerEmail,
      customerPhone,
      items: [
        {
          name: `Payment for ${invoice.invoiceNumber}`,
          price: validatedData.amount,
          quantity: 1,
        },
      ],
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/finance/invoices/${invoice.id}`,
    });

    if (!gatewayResult.success) {
      return NextResponse.json(
        { success: false, error: gatewayResult.error || 'Gagal memproses pembayaran ke gateway' },
        { status: 500 }
      );
    }

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        paymentNumber: gatewayResult.paymentToken || `PAY-${Date.now()}`,
        amount: validatedData.amount,
        paymentDate: new Date(),
        method: validatedData.method.toUpperCase().replace('-', '_'),
        status: 'PENDING',
        type: 'INCOME',
        reference: gatewayResult.paymentUrl || gatewayResult.paymentToken || '',
        notes: `Payment via ${providerName} - ${validatedData.method} | OrderID: ${orderId}`,
        invoiceId: validatedData.invoiceId,
        tenantId,
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            total: true,
            contact: { select: { name: true } },
          },
        },
      },
    });

    // Audit trail
    void logAudit({
      userId,
      tenantId,
      action: 'CREATE',
      entity: 'Payment',
      entityId: payment.id,
      newValues: {
        ...payment as unknown as Record<string, unknown>,
        gateway: providerName,
        orderId,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        orderId,
        status: 'PENDING',
        paymentUrl: gatewayResult.paymentUrl,
        paymentToken: gatewayResult.paymentToken,
        amount: validatedData.amount,
        method: validatedData.method,
        provider: providerName,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
