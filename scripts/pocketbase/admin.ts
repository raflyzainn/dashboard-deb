import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { adminClient, loadInstance } from './runtime';
async function main() {
  if (!process.stdin.isTTY) throw new Error('Run in an interactive terminal.');
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const email = (await prompt.question('Email admin: ')).trim().toLowerCase();
  const name = (await prompt.question('Nama admin: ')).trim(); prompt.close();
  process.stdout.write('Password admin (input tersembunyi): ');
  const hidden = createInterface({ input: process.stdin, output: new Writable({ write(_chunk, _enc, next) { next(); } }), terminal: true });
  const password = await hidden.question(''); hidden.close(); process.stdout.write('\n');
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) throw new Error('Input admin tidak valid.');
  const pb = await adminClient(await loadInstance());
  await pb.collection('users').create({ name, email, role: 'admin', active: true, verified: true, simulated: false, password, passwordConfirm: password });
  console.log('Admin aplikasi dibuat. Password tidak dicatat.');
}
main().catch(() => { console.error('Provisioning gagal. Periksa input atau email yang sudah digunakan.'); process.exitCode = 1; });
