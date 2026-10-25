import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificarAccesoIA } from '../workers/captura-ia/src/accesos.js';

const env = { UIDS_PERMITIDOS: 'permanente', FIREBASE_PROJECT_ID: 'proyecto' };
const ahora = Date.parse('2026-10-25T12:00:00Z');
const documento = (hasta) => ({ ok: true, status: 200, json: async () => ({ fields: { hasta: { timestampValue: hasta } } }) });

// Firestore simulado: cada uid responde distinto y se cuenta cuántas veces se leyó.
const lecturas = {};
globalThis.fetch = async (url, { headers }) => {
  const uid = decodeURIComponent(url.split('/').pop());
  lecturas[uid] = (lecturas[uid] || 0) + 1;
  assert.equal(headers.Authorization, 'Bearer token', 'lee con el token del propio usuario');
  if (uid === 'prueba') return documento('2026-11-25T05:59:59Z');
  if (uid === 'vencido') return documento('2026-10-01T05:59:59Z');
  if (uid === 'caido') return { ok: false, status: 503 };
  return { ok: false, status: 404 };
};

const verificar = (uid, extra = {}) => verificarAccesoIA({ sesion: { uid, superadmin: false, ...extra }, token: 'token', env, ahora });

test('permanentes y super admins pasan sin leer Firestore', async () => {
  assert.equal((await verificar('permanente')).permitido, true);
  assert.equal((await verificar('jefa', { superadmin: true })).permitido, true);
  assert.equal(lecturas.permanente, undefined);
  assert.equal(lecturas.jefa, undefined);
});

test('una prueba vigente pasa y se guarda en caché', async () => {
  assert.equal((await verificar('prueba')).permitido, true);
  await verificar('prueba');
  assert.equal(lecturas.prueba, 1);
});

test('vencido, sin documento o con Firestore caído no pasan', async () => {
  assert.deepEqual(await verificar('vencido'), { permitido: false, hasta: Date.parse('2026-10-01T05:59:59Z'), motivo: 'vencido' });
  assert.deepEqual(await verificar('nadie'), { permitido: false, motivo: 'sin_acceso' });
  assert.deepEqual(await verificar('caido'), { permitido: false, motivo: 'error' });
  await verificar('caido');
  assert.equal(lecturas.caido, 2, 'un error no se guarda en caché');
});
