module.exports = {
  apps: [
    {
      name: 'health-portal-api',
      cwd: './server',
      script: 'dist/index.js',
      instances: 2, // 2 vCPUs on GoDaddy Gen 4 VPS
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
