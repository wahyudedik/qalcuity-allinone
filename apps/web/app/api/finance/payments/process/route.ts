import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getPaymentProvider } from '@/lib/payment/provider';

// ============================================================
// Payment Gateway Process API
// Menggunakan Payment Provider abstraction layer.
// Mendukung Midtrans, Xendit, dan Mock (development).
// ============================================================

interface PaymentProcessRequest {
  invoiceId: string;
  amount: number;
  method: string;
  provider?: 'midtrans' | 'xendit';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

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

    // Auth check (require ADMIN or SUPERADMIN)
    const { userId, tenantId } = await requireMutateAuth();
    const body: PaymentProcessRequest = await request.json();

    // Validasi input
    if (!body.invoiceId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID wajib diisi' },
        { status: 400 }
      );
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Jumlah pembayaran harus lebih dari 0' },
        { status: 400 }
      );
    }

    if (!body.method) {
      return NextResponse.json(
        { success: false, error: 'Metode pembayaran wajib dipilih' },
        { status: 400 }
      );
    }

    // Verify invoice exists and belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: { id: body.invoiceId, tenantId },
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
    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAmount = Number(invoice.total) - Number(totalPaid);

    if (body.amount > remainingAmount) {
      return NextResponse.json(
        { success: false, error: `Jumlah pembayaran melebihi sisa tagihan. Sisa: ${remainingAmount}` },
        { status: 400 }
      );
    }

    // Determine provider from request or env
    const providerName = body.provider || process.env.PAYMENT_PROVIDER || 'mock';

    // Create order ID
    const orderId = `ORD-${invoice.invoiceNumber}-${Date.now()}`;

    // Use Payment Provider abstraction
    const paymentProvider = getPaymentProvider();
    const customerName = body.customerName || invoice.contact?.name || 'Customer';
    const customerEmail = body.customerEmail || invoice.contact?.email || '';
    const customerPhone = body.customerPhone || invoice.contact?.phone || undefined;

    const gatewayResult = await paymentProvider.createPayment({
      orderId,
      amount: body.amount,
      currency: 'IDR',
      customerName,
      customerEmail,
      customerPhone,
      items: [
        {
          name: `Payment for ${invoice.invoiceNumber}`,
          price: body.amount,
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
        amount: body.amount,
        paymentDate: new Date(),
        method: body.method.toUpperCase().replace('-', '_'),
        status: 'PENDING',
        type: 'INCOME',
        reference: gatewayResult.paymentUrl || gatewayResult.paymentToken || '',
        notes: `Payment via ${providerName} - ${body.method} | OrderID: ${orderId}`,
        invoiceId: body.invoiceId,
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
        amount: body.amount,
        method: body.method,
        provider: providerName,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
