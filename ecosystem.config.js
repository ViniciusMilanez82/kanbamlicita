/* eslint-disable @typescript-eslint/no-require-imports -- arquivo CommonJS consumido pelo PM2 */
const path = require('path')

/** Sempre executa a partir da raiz do projeto (importante para .env e next start). */
const root = __dirname

module.exports = {
  apps: [
    {
      name: 'kanbamlicita',
      cwd: root,
      script: path.join(root, 'node_modules/.bin/next'),
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
