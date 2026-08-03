import { NextResponse } from 'next/server';

export async function GET() {
    // Mock data - akan diganti dengan aggregasi dari database
    const stats = {
        revenue: {
            current: 45750000,
            previous: 40667000,
            change: 12.5,
            currency: 'IDR',
        },
        orders: {
            current: 156,
            previous: 144,
            change: 8.3,
        },
        customers: {
            current: 89,
            previous: 85,
            change: 4.7,
        },
        products: {
            current: 128,
            previous: 125,
            change: 2.4,
        },
        recentActivities: [
            {
                id: '1',
                icon: '💰',
                title: 'Invoice #INV-001 paid',
                description: 'PT Maju Jaya membayar invoice',
                amount: 'Rp 15.500.000',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                moduleId: 'finance',
            },
            {
                id: '2',
                icon: '📦',
                title: 'New stock arrived',
                description: '50 unit Widget A diterima',
                amount: '50 unit',
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                moduleId: 'inventory',
            },
            {
                id: '3',
                icon: '👥',
                title: 'New employee onboarded',
                description: 'Ahmad Rizky bergabung sebagai Software Engineer',
                amount: 'Ahmad Rizky',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                moduleId: 'hr',
            },
            {
                id: '4',
                icon: '📈',
                title: 'Deal closed',
                description: 'PT ABC Technology menandatangani kontrak',
                amount: 'Rp 25.000.000',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                moduleId: 'crm',
            },
            {
                id: '5',
                icon: '💳',
                title: 'Payment received',
                description: 'CV Berkah melakukan pembayaran',
                amount: 'Rp 12.500.000',
                timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
                moduleId: 'finance',
            },
        ],
        alerts: [
            {
                id: '1',
                type: 'warning',
                title: 'Stock Low',
                message: 'Component B hanya tersisa 8 unit (minimum 20)',
                moduleId: 'inventory',
            },
            {
                id: '2',
                type: 'danger',
                title: 'Invoice Overdue',
                message: 'Invoice INV-2026-003 sudah overdue 4 hari',
                moduleId: 'finance',
            },
            {
                id: '3',
                type: 'info',
                title: 'Leave Request',
                message: 'Siti Rahayu mengajukan cuti sakit untuk 4 Agustus',
                moduleId: 'hr',
            },
        ],
    };

    return NextResponse.json({
        success: true,
        data: stats,
    });
}
