// ═══════════════════════════════════════════════════════════════════
// CRYPTO — Chiffrement côté client des sauvegardes (backend Sycomore)
// ═══════════════════════════════════════════════════════════════════
// Aucune dépendance React ni externe. WebCrypto uniquement.
//
// Contrainte fondatrice : le serveur Sycomore ne doit jamais recevoir de
// donnée nominative élève. Les sauvegardes CHECK en contiennent (noms,
// commentaires, perles) — elles ne partent donc que chiffrées, la clé
// n'existant que dans le navigateur.
//
// Enveloppe produite (sérialisable JSON, stockée telle quelle côté serveur) :
//   { v, alg, kdf, iter, salt, iv, data }
// `iter` est porté par l'enveloppe : une sauvegarde ancienne reste
// déchiffrable même si la constante ci-dessous augmente plus tard.
// ═══════════════════════════════════════════════════════════════════

const PBKDF2_ITERATIONS = 300000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

// Résolution paresseuse (dans les fonctions, jamais au chargement du module) :
// permet aux tests d'injecter globalThis.crypto avant le premier appel.
function subtleCrypto() {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (!c || !c.subtle) {
    throw new Error("WebCrypto indisponible dans ce navigateur");
  }
  return c;
}

// ─── Base64 ↔ octets ─────────────────────────────────────────────

export function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64ToBytes(str) {
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ─── Dérivation de clé ───────────────────────────────────────────

export async function deriveKey(passphrase, salt, iterations) {
  const c = subtleCrypto();
  const baseKey = await c.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return c.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations || PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─── Chiffrement / déchiffrement ─────────────────────────────────

export async function encryptSnapshot(obj, passphrase) {
  if (!passphrase) throw new Error("Phrase secrète manquante");
  const c = subtleCrypto();
  const salt = c.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = c.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = await c.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plaintext);
  return {
    v: 1,
    alg: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iter: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipher)),
  };
}

export async function decryptSnapshot(envelope, passphrase) {
  if (!passphrase) throw new Error("Phrase secrète manquante");
  if (!isEnvelope(envelope)) throw new Error("Sauvegarde illisible (enveloppe invalide)");
  const c = subtleCrypto();
  const key = await deriveKey(passphrase, base64ToBytes(envelope.salt), envelope.iter);
  let plain;
  try {
    plain = await c.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
      key,
      base64ToBytes(envelope.data)
    );
  } catch (_e) {
    // AES-GCM échoue de la même façon sur mauvaise clé et sur données altérées :
    // impossible de distinguer les deux cas, le message le dit.
    throw new Error("Phrase secrète incorrecte ou sauvegarde corrompue");
  }
  return JSON.parse(new TextDecoder().decode(plain));
}

// ─── Garde-fou ───────────────────────────────────────────────────

export function isEnvelope(x) {
  return !!x
    && typeof x === "object"
    && x.alg === "AES-256-GCM"
    && typeof x.salt === "string"
    && typeof x.iv === "string"
    && typeof x.data === "string";
}
