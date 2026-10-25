#!/usr/bin/env node
/*
 * Da o quita el rol de super admin a una cuenta de Zaldo.
 *
 * El rol vive como custom claim de Firebase Authentication (`superadmin: true`)
 * y NO en el perfil de Firestore: un claim solo se puede escribir con el Admin
 * SDK, así que ningún usuario puede dárselo desde la app aunque edite su perfil.
 * Las reglas de Firestore y el Worker de IA lo leen directo del ID token.
 *
 * Uso:
 *   npm run auth:superadmin -- --clave ./serviceAccount.json --correo persona@dominio.com
 *   npm run auth:superadmin -- --clave ./serviceAccount.json --correo persona@dominio.com --quitar
 *   npm run auth:superadmin -- --clave ./serviceAccount.json --listar
 *
 * El cambio se ve al renovar el token: la persona debe cerrar sesión y volver a
 * entrar (o esperar hasta una hora).
 *
 * La clave de la cuenta de servicio nunca se sube al repo (.gitignore la excluye).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const valor = (nombre) => {
    const indice = args.indexOf(`--${nombre}`);
    return indice >= 0 ? args[indice + 1] : undefined;
};

// En PowerShell, npm se come el `--` y toma --clave/--correo como config propia:
// llegan como posicionales (y como npm_config_*), así que se aceptan las tres formas.
const posicionales = args.filter((arg, i) => !arg.startsWith("--") && !args[i - 1]?.match(/^--(clave|correo)$/));
const clave = valor("clave") || process.env.npm_config_clave || posicionales.find((arg) => arg.endsWith(".json"))
    || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const correo = String(valor("correo") || process.env.npm_config_correo || posicionales.find((arg) => arg.includes("@")) || "")
    .trim().toLowerCase();
const quitar = args.includes("--quitar");
const listar = args.includes("--listar");

if (!clave) {
    console.error("Falta --clave con la ruta al JSON de la cuenta de servicio.");
    process.exit(1);
}
if (!listar && !correo) {
    console.error("Falta --correo (o usa --listar).");
    process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolve(clave), "utf8"));
initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const auth = getAuth();

if (listar) {
    // listUsers pagina de 1000 en 1000; para Zaldo una vuelta basta, pero se recorre completo.
    let pagina;
    const encontrados = [];
    do {
        pagina = await auth.listUsers(1000, pagina?.pageToken);
        pagina.users
            .filter((usuario) => usuario.customClaims?.superadmin === true)
            .forEach((usuario) => encontrados.push(`${usuario.email || "(sin correo)"}  ${usuario.uid}`));
    } while (pagina.pageToken);

    console.log(encontrados.length ? encontrados.join("\n") : "No hay super admins.");
    process.exit(0);
}

const usuario = await auth.getUserByEmail(correo).catch(() => null);
if (!usuario) {
    console.error(`No existe una cuenta con el correo ${correo}.`);
    process.exit(1);
}
if (!quitar && !usuario.emailVerified) {
    console.warn("Aviso: el correo de esta cuenta no está verificado.");
}

// Se conservan los demás claims que pudiera tener la cuenta.
const { superadmin: _anterior, ...otrosClaims } = usuario.customClaims || {};
await auth.setCustomUserClaims(usuario.uid, quitar ? otrosClaims : { ...otrosClaims, superadmin: true });

console.log(`${quitar ? "Se quitó" : "Se asignó"} super admin a ${correo} (${usuario.uid}).`);
console.log("La persona debe cerrar sesión y volver a entrar para que se aplique.");
