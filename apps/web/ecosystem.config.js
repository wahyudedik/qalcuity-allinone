module.exports = {
    apps: [{
        name: 'qalcuity-web',
        cwd: './',
        script: 'node_modules/.bin/next',
        args: 'start -p 3000',
        env: {
            NODE_ENV: 'production',
            PORT: 3000,
        },
        instances: 1, // Gunakan 1 untuk VPS 2GB RAM, max untuk VPS 4GB+
        exec_mode: 'fork', // Gunakan 'fork' untuk 1 instance, 'cluster' untuk multi-instance
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        max_restarts: 10,
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        error_file: './logs/error.log',
        out_file: './logs/out.log',
        merge_logs: true,
    }],
};
