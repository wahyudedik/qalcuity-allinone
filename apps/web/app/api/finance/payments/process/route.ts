import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ============================================================
// Payment Gateway Process API
// Placeholder untuk integrasi Midtrans/Xendit
// Di production, ini akan melakukan integrasi langsung dengan
// API Midtrans atau Xendit
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

interface PaymentGatewayResponse {
  success: boolean;
  paymentId: string;
  status: string;
  vaNumber?: string;
  redirectUrl?: string;
  qrCode?: string;
  expiryTime?: string;
  error?: string;
}

/**
 * Generate mock payment response dari payment gateway
 * Di production, ini akan diganti dengan panggilan API Midtrans/Xendit
 */
function generateMockGatewayResponse(
  provider: string,
  method: string,
  amount: number,
  invoiceId: string
): PaymentGatewayResponse {
  const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Simulate different payment method responses
  const methodUpper = method.toUpperCase();

  if (methodUpper.includes('VA') || methodUpper.includes('BANK_TRANSFER')) {
    // Virtual Account response
    const bankCode = methodUpper.includes('BCA') ? '014'
      : methodUpper.includes('MANDIRI') ? '008'
      : methodUpper.includes('BNI') ? '009'
      : methodUpper.includes('BRI') ? '012'
      : '014';

    return {
      success: true,
      paymentId,
      status: 'PENDING',
      vaNumber: `${bankCode}${Math.random().toString().substring(2, 14)}`,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  if (methodUpper.includes('CREDIT_CARD') || methodUpper.includes('CARD')) {
    // Credit Card response
    return {
      success: true,
      paymentId,
      status: 'PENDING',
      redirectUrl: `https://${provider === 'midtrans' ? 'app.sandbox.midtrans.com' : 'checkout.xendit.co'}/payment/${paymentId}`,
    };
  }

  if (methodUpper.includes('QRIS') || methodUpper.includes('QR')) {
    // QRIS response
    return {
      success: true,
      paymentId,
      status: 'PENDING',
      qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  if (methodUpper.includes('EWALLET') || methodUpper.includes('GOPAY') ||
      methodUpper.includes('OVO') || methodUpper.includes('DANA') ||
      methodUpper.includes('SHOPEEPAY')) {
    // E-Wallet response
    return {
      success: true,
      paymentId,
      status: 'PENDING',
      redirectUrl: `https://${provider === 'midtrans' ? 'app.sandbox.midtrans.com' : 'checkout.xendit.co'}/ewallet/${paymentId}`,
    };
  }

  // Default response
  return {
    success: true,
    paymentId,
    status: 'PENDING',
    redirectUrl: `https://${provider === 'midtrans' ? 'app.sandbox.midtrans.com' : 'checkout.xendit.co'}/payment/${paymentId}`,
  };
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:payments:process:${ip}`, 10, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      );
    }

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
        contact: { select: { name: true, email: true } },
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
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = invoice.total - totalPaid;

    if (body.amount > remainingAmount) {
      return NextResponse.json(
        { success: false, error: `Jumlah pembayaran melebihi sisa tagihan. Sisa: ${remainingAmount}` },
        { status: 400 }
      );
    }

    const provider = body.provider || 'midtrans';

    // TODO: Replace with actual Midtrans/Xendit API call
    // Contoh integrasi Midtrans:
    //
    // const midtrans = new MidtransClient({
    //   serverKey: process.env.MIDTRANS_SERVER_KEY,
    //   clientKey: process.env.MIDTRANS_CLIENT_KEY,
    //   isProduction: process.env.MIDTRANS_ENVIRONMENT === 'production',
    // });
    //
    // const transaction = await midtrans.createTransaction({
    //   transaction_details: {
    //     order_id: paymentId,
    //     gross_amount: body.amount,
    //   },
    //   customer_details: {
    //     first_name: body.customerName,
    //     email: body.customerEmail,
    //     phone: body.customerPhone,
    //   },
    //   payment_type: mapMethodToMidtransType(body.method),
    // });

    // Generate mock gateway response
    const gatewayResponse = generateMockGatewayResponse(provider, body.method, body.amount, body.invoiceId);

    if (!gatewayResponse.success) {
      return NextResponse.json(
        { success: false, error: gatewayResponse.error || 'Gagal memproses pembayaran ke gateway' },
        { status: 500 }
      );
    }

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        paymentNumber: gatewayResponse.paymentId,
        amount: body.amount,
        paymentDate: new Date(),
        method: body.method.toUpperCase().replace('-', '_'),
        status: 'PENDING',
        type: 'INCOME',
        reference: gatewayResponse.vaNumber || gatewayResponse.redirectUrl || '',
        notes: `Payment via ${provider} - ${body.method}`,
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

    void logAudit({
      userId,
      tenantId,
      action: 'CREATE',
      entity: 'Payment',
      entityId: payment.id,
      newValues: {
        ...payment as unknown as Record<string, unknown>,
        gateway: provider,
        gatewayPaymentId: gatewayResponse.paymentId,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        gatewayPaymentId: gatewayResponse.paymentId,
        status: gatewayResponse.status,
        vaNumber: gatewayResponse.vaNumber,
        redirectUrl: gatewayResponse.redirectUrl,
        qrCode: gatewayResponse.qrCode,
        expiryTime: gatewayResponse.expiryTime,
        amount: body.amount,
        method: body.method,
        provider,
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
