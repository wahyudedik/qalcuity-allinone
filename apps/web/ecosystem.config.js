module.exports = {
    apps: [{
        name: 'qalcuity-web',
        cwd: './',
        // Use direct Node.js entry point (NOT node_modules/.bin/next which is a shell wrapper on Linux)
        script: 'node_modules/next/dist/bin/next',
        args: 'start -p 3000',
        env: {
            NODE_ENV: 'production',
            PORT: 3000,
            PRISMA_QUERY_ENGINE_TYPE: 'library',
            NEXTAUTH_URL: 'https://qalcuity.com',
            NEXTAUTH_SECRET: '3522d3dba1ab5934eb53c5b52a3e9b6afb2af46427f6408bd1a233670a4c3e36',
            NEXT_PUBLIC_APP_URL: 'https://qalcuity.com',
        },
        instances: 1, // Gunakan 1 untuk VPS 2GB RAM, max untuk VPS 4GB+
        exec_mode: 'fork', // Gunakan 'fork' untuk 1 instance, 'cluster' untuk multi-instance
        autorestart: true,
        watch: false,
        kill_timeout: 10000, // Tunggu 10s untuk process lama release port sebelum start baru
        listen_timeout: 15000, // Tunggu 15s untuk app start sebelum PM2 mark sebagai ready
        max_memory_restart: '1G',
        max_restarts: 10,
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        error_file: './logs/error.log',
        out_file: './logs/out.log',
        merge_logs: true,
    }],
};
