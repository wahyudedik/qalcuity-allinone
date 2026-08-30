export const emailTemplates = {
  invoice: {
    subject: 'Invoice {{invoiceNumber}} dari {{companyName}}',
    body: `
      <h2>Invoice {{invoiceNumber}}</h2>
      <p>Yth. {{customerName}},</p>
      <p>Bersama ini kami kirimkan invoice dengan detail sebagai berikut:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Invoice Number</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{invoiceNumber}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Tanggal</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Jatuh Tempo</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{dueDate}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #2563eb;">{{total}}</td>
        </tr>
      </table>
      <p>Silakan lakukan pembayaran sebelum tanggal jatuh tempo.</p>
      <p>Terima kasih.</p>
      <p>Hormat kami,<br/>{{companyName}}</p>
    `,
  },
  paymentReminder: {
    subject: 'Reminder Pembayaran Invoice {{invoiceNumber}}',
    body: `
      <h2>Reminder Pembayaran</h2>
      <p>Yth. {{customerName}},</p>
      <p>Invoice <strong>{{invoiceNumber}}</strong> dengan total <strong>{{total}}</strong> telah melewati jatuh tempo pada tanggal <strong>{{dueDate}}</strong>.</p>
      <p>Mohon segera melakukan pembayaran untuk menghindari keterlambatan lebih lanjut.</p>
      <p>Jika Anda sudah melakukan pembayaran, mohon abaikan email ini.</p>
      <p>Terima kasih.</p>
      <p>Hormat kami,<br/>{{companyName}}</p>
    `,
  },
  quotation: {
    subject: 'Penawaran {{quotationNumber}} dari {{companyName}}',
    body: `
      <h2>Penawaran Harga</h2>
      <p>Yth. {{customerName}},</p>
      <p>Bersama ini kami kirimkan penawaran harga dengan detail sebagai berikut:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Quotation Number</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{quotationNumber}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Berlaku Hingga</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{validUntil}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #2563eb;">{{total}}</td>
        </tr>
      </table>
      <p>Silakan hubungi kami jika ada pertanyaan mengenai penawaran ini.</p>
      <p>Terima kasih.</p>
      <p>Hormat kami,<br/>{{companyName}}</p>
    `,
  },
  paymentConfirmation: {
    subject: 'Konfirmasi Pembayaran {{invoiceNumber}} - Lunas',
    body: `
      <h2>Pembayaran Diterima</h2>
      <p>Yth. {{customerName}},</p>
      <p>Kami mengkonfirmasi bahwa pembayaran untuk invoice <strong>{{invoiceNumber}}</strong> telah diterima dengan detail:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Invoice Number</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{invoiceNumber}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Jumlah Dibayar</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #16a34a;">{{total}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Status</td>
          <td style="padding: 8px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">LUNAS</td>
        </tr>
      </table>
      <p>Terima kasih atas pembayaran Anda.</p>
      <p>Hormat kami,<br/>{{companyName}}</p>
    `,
  },
  welcome: {
    subject: 'Selamat Datang di {{companyName}}',
    body: `
      <h2>Selamat Datang!</h2>
      <p>Yth. {{customerName}},</p>
      <p>Terima kasih telah bergabung dengan {{companyName}}.</p>
      <p>Jika ada pertanyaan, jangan ragu untuk menghubungi kami.</p>
      <p>Hormat kami,<br/>{{companyName}}</p>
    `,
  },
  billingPaymentReceived: {
    subject: 'Pembayaran Langganan Baru - {{tenantName}}',
    body: `
      <h2>Pembayaran Langganan Baru</h2>
      <p>Yth. Tim Qalcuity,</p>
      <p>Seorang tenant telah melakukan pembayaran langganan. Berikut detailnya:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Tenant</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{tenantName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{tenantEmail}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Paket</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{planName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Jumlah</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #2563eb;">{{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Bank Pengirim</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{bankName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Rekening Pengirim</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{accountNumber}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Nama Pengirim</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{accountName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Tanggal</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{paymentDate}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Bukti Transfer</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{proofLink}}</td>
        </tr>
      </table>
      <p>Silakan verifikasi pembayaran ini di dashboard Billing Management.</p>
      <p>Hormat kami,<br/>Qalcuity System</p>
    `,
  },
};

export type EmailTemplateKey = keyof typeof emailTemplates;

/**
 * Mendapatkan template email berdasarkan key
 */
export function getEmailTemplate(key: EmailTemplateKey) {
  return emailTemplates[key] || null;
}

/**
 * Mendapatkan semua available template keys
 */
export function getAvailableTemplates(): EmailTemplateKey[] {
  return Object.keys(emailTemplates) as EmailTemplateKey[];
}
