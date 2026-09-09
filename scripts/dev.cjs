// Adapt supervised preview flags while preserving the normal Next.js dev command.
const { spawn } = require('node:child_process');
const args = process.argv.slice(2).filter(arg => arg !== '--strictPort').map(arg => arg === '--host' ? '--hostname' : arg);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...args], { stdio: 'inherit', env: process.env });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
