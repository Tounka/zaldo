import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import {
    construirEscrituraConsumo,
    costoUSD,
    leerUso,
    mesActual,
    registrarConsumo,
} from '../workers/captura-ia/src/consumo.js';

const usoOpenAI = {
    usage: {
        prompt_tokens: 3000,
        prompt_tokens_details: { cached_tokens: 1000 },
        completion_tokens: 500,
        completion_tokens_details: { reasoning_tokens: 400 },
    },
};

test('lee los tokens del usage de OpenAI', () => {
    assert.deepEqual(leerUso(usoOpenAI), { tokensEntrada: 3000, tokensCache: 1000, tokensSalida: 500, tokensRazonamiento: 400 });
    assert.equal(leerUso({}), null);
});

test('el costo separa la entrada en caché y sin tarifas es 0', () => {
    const uso = leerUso(usoOpenAI);
    const env = { PRECIO_ENTRADA_USD_MTOK: '2', PRECIO_CACHE_USD_MTOK: '0.5', PRECIO_SALIDA_USD_MTOK: '8' };
    // 2000 × 2 + 1000 × 0.5 + 500 × 8 = 8500 por millón
    assert.equal(costoUSD(uso, env), 0.0085);
    assert.equal(costoUSD(uso, {}), 0);
    // Sin tarifa de caché, la caché cobra como entrada normal.
    assert.equal(costoUSD(uso, { PRECIO_ENTRADA_USD_MTOK: '2' }), 0.006);
});

test('el mes es el de la Ciudad de México', () => {
    // 1 de noviembre 03:00 UTC sigue siendo 31 de octubre en México.
    assert.equal(mesActual(new Date('2026-11-01T03:00:00Z')), '2026-10');
});

test('la escritura suma con incrementos atómicos en el documento del mes', () => {
    const escritura = construirEscrituraConsumo({
        projectId: 'p', uid: 'u1', ruta: 'captura', uso: leerUso(usoOpenAI), costo: 0.0085, mes: '2026-10',
    });
    assert.equal(escritura.update.name, 'projects/p/databases/(default)/documents/consumoIA/u1_2026-10');
    assert.deepEqual(escritura.updateMask.fieldPaths, ['uid', 'mes']);
    const porCampo = Object.fromEntries(escritura.updateTransforms.map((t) => [t.fieldPath, t.increment || t.setToServerValue]));
    assert.deepEqual(porCampo['llamadas.captura'], { integerValue: '1' });
    assert.deepEqual(porCampo.tokensEntrada, { integerValue: '3000' });
    assert.deepEqual(porCampo.costoUSD, { doubleValue: 0.0085 });
    assert.equal(porCampo.actualizado, 'REQUEST_TIME');
});

test('registra en Firestore con la cuenta de servicio y nunca lanza', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const env = {
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
            client_email: 'consumo@p.iam.gserviceaccount.com',
            private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
        }),
    };
    const llamadas = [];
    const fetchOriginal = globalThis.fetch;
    const logOriginal = console.log;
    const errorOriginal = console.error;
    const errores = [];
    console.log = () => {};
    console.error = (linea) => errores.push(linea);
    globalThis.fetch = async (url, opciones) => {
        llamadas.push({ url, opciones });
        if (url.includes('oauth2')) return { ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
        return { ok: llamadas.length < 3, status: 503, json: async () => ({}) };
    };

    try {
        await registrarConsumo({ env, uid: 'u1', ruta: 'reporte', uso: leerUso(usoOpenAI) });
        assert.equal(llamadas.length, 2);
        assert.match(String(llamadas[0].opciones.body), /grant_type=urn/);
        assert.match(llamadas[1].url, /documents:commit$/);
        assert.equal(llamadas[1].opciones.headers.Authorization, 'Bearer tok');
        assert.match(llamadas[1].opciones.body, /llamadas\.reporte/);

        // Segunda llamada: reutiliza el token y, si Firestore falla, solo lo registra.
        await registrarConsumo({ env, uid: 'u1', ruta: 'reporte', uso: leerUso(usoOpenAI) });
        assert.equal(llamadas.length, 3);
        assert.match(errores[0], /consumo_error/);
    } finally {
        globalThis.fetch = fetchOriginal;
        console.log = logOriginal;
        console.error = errorOriginal;
    }
});

test('sin cuenta de servicio solo queda en el log', async () => {
    const fetchOriginal = globalThis.fetch;
    const logOriginal = console.log;
    const lineas = [];
    globalThis.fetch = async () => assert.fail('no debe llamar a la red');
    console.log = (linea) => lineas.push(linea);
    try {
        await registrarConsumo({ env: {}, uid: 'u1', ruta: 'captura', uso: leerUso(usoOpenAI) });
        assert.match(lineas[0], /"evento":"consumo"/);
    } finally {
        globalThis.fetch = fetchOriginal;
        console.log = logOriginal;
    }
});
