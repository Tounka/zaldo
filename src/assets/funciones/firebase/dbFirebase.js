// Importación de módulos específicos de Firebase
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
} from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar los servicios de Firebase que necesitas
const auth = getAuth(app);

/*
 * Caché local persistente: Firestore encola las escrituras cuando no hay red y
 * las sincroniza sola al volver la señal, así un gasto capturado en un sótano
 * no se pierde. `persistentMultipleTabManager` evita que dos pestañas peleen
 * por la misma caché.
 *
 * Si el navegador no lo permite (modo privado, almacenamiento bloqueado), se
 * cae al Firestore normal en memoria: la app sigue funcionando, solo sin cola
 * offline.
 */
let db;

try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
        }),
    });
} catch (error) {
    console.warn('Sin caché offline de Firestore, se usa la instancia normal.', error);
    db = getFirestore(app);
}

export { auth, db };



