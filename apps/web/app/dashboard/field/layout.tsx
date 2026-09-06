import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Field Service | Qalcuity',
    description: 'Manajemen pekerjaan lapangan dan checklist teknisi',
};

export default function FieldLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
