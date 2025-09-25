module.exports = {
  apps: [
    {
      name: 'audit-platform',
      script: 'npm',
      args: 'start',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-app-error.log',
      out_file: './logs/pm2-app-out.log',
      log_file: './logs/pm2-app-combined.log',
      time: true
    },
    {
      name: 'audit-websocket',
      script: './ws-server.ts',
      interpreter: 'tsx',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        WEBSOCKET_PORT: 3001
      },
      error_file: './logs/pm2-ws-error.log',
      out_file: './logs/pm2-ws-out.log',
      log_file: './logs/pm2-ws-combined.log',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'YOUR_VM_IP',
      ref: 'origin/main',
      repo: 'YOUR_GITHUB_REPO_URL',
      path: process.cwd(),
      'post-deploy': 'npm install && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};