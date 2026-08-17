import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const auth = await requireAuth();
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.trim().length < 2) {
            return NextResponse.json({ success: true, data: [] });
        }

        const searchTerm = query.trim();
        const limit = 3; // Per module

        const [invoices, deals, leads, contacts, products, employees] = await Promise.all([
            // Search Invoices
            prisma.invoice.findMany({
                where: {
                    tenantId: auth.tenantId,
                    OR: [
                        { invoiceNumber: { contains: searchTerm } },
                        { contact: { name: { contains: searchTerm } } },
                    ],
                },
                include: { contact: { select: { name: true } } },
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            // Search Deals
            prisma.deal.findMany({
                where: {
                    tenantId: auth.tenantId,
                    OR: [
                        { title: { contains: searchTerm } },
                        { contact: { name: { contains: searchTerm } } },
                        { lead: { company: { contains: searchTerm } } },
                    ],
                },
                include: { contact: { select: { name: true } } },
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            // Search Leads
            prisma.lead.findMany({
                where: {
                    tenantId: auth.tenantId,
                    OR: [
                        { name: { contains: searchTerm } },
                        { company: { contains: searchTerm } },
                        { email: { contains: searchTerm } },
                    ],
                },
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            // Search Contacts
            prisma.contact.findMany({
                where: {
                    tenantId: auth.tenantId,
                    isActive: true,
                    OR: [
                        { name: { contains: searchTerm } },
                        { email: { contains: searchTerm } },
                        { company: { contains: searchTerm } },
                        { phone: { contains: searchTerm } },
                    ],
                },
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            // Search Products
            prisma.product.findMany({
                where: {
                    tenantId: auth.tenantId,
                    OR: [
                        { name: { contains: searchTerm } },
                        { sku: { contains: searchTerm } },
                    ],
                },
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            // Search Employees
            prisma.employee.findMany({
                where: {
                    tenantId: auth.tenantId,
                    status: "ACTIVE",
                    OR: [
                        { name: { contains: searchTerm } },
                        { email: { contains: searchTerm } },
                        { position: { contains: searchTerm } },
                        { department: { contains: searchTerm } },
                    ],
                },
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        type SearchResult = {
            id: string;
            title: string;
            subtitle: string;
            type: string;
            href: string;
            icon: string;
        };

        const results: SearchResult[] = [];

        invoices.forEach((inv) => {
            results.push({
                id: inv.id,
                title: inv.invoiceNumber,
                subtitle: `${inv.contact?.name || 'Customer'} - Rp ${(inv.total || 0).toLocaleString('id-ID')}`,
                type: 'Invoice',
                href: `/dashboard/finance/invoices/${inv.id}`,
                icon: 'receipt',
            });
        });

        deals.forEach((deal) => {
            results.push({
                id: deal.id,
                title: deal.title,
                subtitle: `${deal.contact?.name || 'Contact'} - Rp ${(deal.value || 0).toLocaleString('id-ID')}`,
                type: 'Deal',
                href: `/dashboard/crm/deals/${deal.id}`,
                icon: 'trending-up',
            });
        });

        leads.forEach((lead) => {
            results.push({
                id: lead.id,
                title: lead.name,
                subtitle: lead.company || lead.email || 'Lead',
                type: 'Lead',
                href: `/dashboard/crm/leads/${lead.id}`,
                icon: 'target',
            });
        });

        contacts.forEach((contact) => {
            results.push({
                id: contact.id,
                title: contact.name,
                subtitle: contact.company || contact.email || 'Contact',
                type: 'Contact',
                href: `/dashboard/crm/contacts/${contact.id}`,
                icon: 'users',
            });
        });

        products.forEach((product) => {
            results.push({
                id: product.id,
                title: product.name,
                subtitle: `${product.sku} - Stock: ${product.stock}`,
                type: 'Product',
                href: `/dashboard/inventory/products/${product.id}`,
                icon: 'package',
            });
        });

        employees.forEach((emp) => {
            results.push({
                id: emp.id,
                title: emp.name,
                subtitle: emp.position || emp.email || 'Employee',
                type: 'Employee',
                href: `/dashboard/hr/employees/${emp.id}`,
                icon: 'user-check',
            });
        });

        return NextResponse.json({ success: true, data: results });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: true, data: [] });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
