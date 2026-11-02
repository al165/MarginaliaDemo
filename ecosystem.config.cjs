module.exports = {
    apps: [{
        name: 'marginalia',
        script: 'index.js',
        autorestart: true,
        watch: false,
        env_production: {
            NODE_ENV: 'production',
            PORT: 3040,
        }
    }]
}
