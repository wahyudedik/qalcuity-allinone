function Error({ statusCode }: { statusCode?: number }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#666' }}>
                    {statusCode || 'Kesalahan'}
                </h1>
                <p style={{ color: '#888', marginTop: '1rem' }}>
                    {statusCode === 404
                        ? 'Halaman tidak ditemukan.'
                        : 'Terjadi kesalahan di server.'}
                </p>
                <a href="/" style={{ marginTop: '1.5rem', display: 'inline-block', color: '#2563eb', textDecoration: 'underline' }}>
                    Kembali ke Beranda
                </a>
            </div>
        </div>
    )
}

Error.getInitialProps = ({ res, err }: { res: any; err: any }) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404
    return { statusCode }
}

export default Error
