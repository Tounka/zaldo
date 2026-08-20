#!/usr/bin/env node
/*
 * Configuración administrativa de Firebase Authentication para Zaldo.
 *
 * Hace, en un solo paso:
 *   1. Habilita el proveedor Correo/contraseña en el proyecto.
 *   2. Fuerza "una sola cuenta por correo" (vinculación automática de métodos).
 *   3. Asigna contraseña a las cuentas indicadas CONSERVANDO su uid,
 *      de modo que no se pierde absolutamente nada de su información.
 *
 * Requiere una clave de cuenta de servicio con permisos de administrador:
 *   Firebase Console -> Configuracion del proyecto -> Cuentas de servicio
 *   -> Generar nueva clave privada
 *
 * Uso:
 *   node scripts/configurarAuth.mjs --clave ./ruta/serviceAccount.json \
 *     --correos "uno@dominio.com,dos@dominio.com" --password "random22"
 *
 *   node scripts/configurarAuth.mjs --clave ./sa.json --solo-config
 *
 * La clave NUNCA se sube al repo: agrégala a .gitignore y bórrala o rótala
 * cuando termines.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const leerArgumentos = () => {
    const args = process.argv.slice(2);
    const valor = (nombre) => {
        const indice = args.indexOf(`--${nombre}`);
        return indice >= 0 ? args[indice + 1] : undefined;
    };

    return {
        clave: valor("clave") || process.env.GOOGLE_APPLICATION_CREDENTIALS,
        correos: (valor("correos") || "").split(",").map((c) => c.trim()).filter(Boolean),
        password: valor("password"),
        soloConfig: args.includes("--solo-config"),
        permitirCrear: args.includes("--crear"),
        sinConfig: args.includes("--sin-config"),
    };
};

/*
 * El proveedor de correo se habilita por la Identity Toolkit Admin API. El SDK
 * de administrador no expone esta configuración, pero su credencial sí sirve
 * para firmar la petición REST.
 */
const configurarProveedores = async (credencial, projectId) => {
    const { access_token: token } = await credencial.getAccessToken();

    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`
        + "?updateMask=signIn.email.enabled,signIn.email.passwordRequired,signIn.allowDuplicateEmails";

    const respuesta = await fetch(url, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            signIn: {
                email: { enabled: true, passwordRequired: true },
                // false = una sola cuenta por correo: Google y contraseña
                // conviven sobre el mismo uid en lugar de duplicar cuentas.
                allowDuplicateEmails: false,
            },
        }),
    });

    const cuerpo = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            `No se pudo actualizar la configuración (${respuesta.status}): `
            + (cuerpo?.error?.message || JSON.stringify(cuerpo)),
        );
    }

    return cuerpo;
};

/*
 * updateUser conserva el uid y todos los proveedores ya vinculados: solo agrega
 * o reemplaza la contraseña. Es la operación segura para una cuenta que ya
 * tiene información en Firestore.
 */
const asignarContrasena = async (auth, correo, password, permitirCrear) => {
    try {
        const usuario = await auth.getUserByEmail(correo);
        await auth.updateUser(usuario.uid, { password });
        const actualizado = await auth.getUserByEmail(correo);

        return {
            correo,
            uid: usuario.uid,
            accion: "contraseña asignada a la cuenta existente",
            proveedores: actualizado.providerData.map((p) => p.providerId),
            creada: false,
        };
    } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;

        /*
         * Crear una cuenta aqui generaria un uid nuevo y vacio: la app se veria
         * sin datos y parecerian borrados. Por eso hay que pedirlo a proposito.
         */
        if (!permitirCrear) {
            throw new Error(
                `No existe ninguna cuenta con el correo "${correo}" en Authentication. `
                + "Revisa que este bien escrito (dominio incluido). "
                + "Si de verdad quieres crear una cuenta nueva y vacia, repite con --crear.",
            );
        }

        const creado = await auth.createUser({ email: correo, password });
        return {
            correo,
            uid: creado.uid,
            accion: "CUENTA NUEVA creada (no existía en Authentication)",
            proveedores: creado.providerData.map((p) => p.providerId),
            creada: true,
        };
    }
};

const main = async () => {
    const { clave, correos, password, soloConfig, sinConfig, permitirCrear } = leerArgumentos();

    if (!clave) {
        console.error("Falta --clave con la ruta al JSON de la cuenta de servicio.");
        process.exit(1);
    }

    const serviceAccount = JSON.parse(readFileSync(resolve(clave), "utf8"));
    const projectId = serviceAccount.project_id;
    const app = initializeApp({ credential: cert(serviceAccount), projectId });
    const auth = getAuth(app);

    console.log(`Proyecto: ${projectId}`);
    console.log(`Cuenta de servicio: ${serviceAccount.client_email}\n`);

    if (!sinConfig) {
        console.log("1) Habilitando Correo/contraseña y vinculación por correo...");
        const config = await configurarProveedores(app.options.credential, projectId);
        console.log(`   correo habilitado: ${config?.signIn?.email?.enabled}`);
        console.log(`   correos duplicados permitidos: ${config?.signIn?.allowDuplicateEmails}\n`);
    }

    if (soloConfig) {
        console.log("Listo (--solo-config): no se tocó ninguna cuenta.");
        process.exit(0);
    }

    if (!correos.length || !password) {
        console.log("Sin --correos/--password: no se asignaron contraseñas.");
        process.exit(0);
    }

    if (password.length < 6) {
        console.error("La contraseña debe tener al menos 6 caracteres.");
        process.exit(1);
    }

    console.log("2) Asignando contraseñas (el uid y los datos se conservan)...");
    const resultados = [];

    for (const correo of correos) {
        try {
            const resultado = await asignarContrasena(auth, correo, password, permitirCrear);
            resultados.push(resultado);
            console.log(`   ${resultado.creada ? "!" : "OK"} ${correo}`);
            console.log(`      uid: ${resultado.uid}`);
            console.log(`      ${resultado.accion}`);
            console.log(`      proveedores: ${resultado.proveedores.join(", ") || "(ninguno)"}`);
        } catch (error) {
            console.error(`   ERROR ${correo}: ${error.code || ""} ${error.message}`);
            resultados.push({ correo, error: error.message });
        }
    }

    const creadas = resultados.filter((r) => r.creada);
    if (creadas.length) {
        console.log(
            `\nATENCION: ${creadas.length} cuenta(s) no existían y se crearon vacías.`
            + "\nSi esperabas que ya tuvieran información, revisa que el correo esté bien escrito"
            + "\nantes de usarlas; una cuenta nueva tiene un uid distinto y arranca sin datos.",
        );
    }

    console.log("\nListo. Prueba entrando en la app con correo y contraseña.");
    process.exit(0);
};

main().catch((error) => {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
});
