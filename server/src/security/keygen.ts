import { generateKeyPairSync } from 'node:crypto';

/**
 * Development key generation: `npm run keygen` in server/.
 * Production keys are generated inside the HSM and never exist as a PEM.
 */
const { privateKey, publicKey } = generateKeyPairSync('ed25519');

const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

console.log('# Add to server/.env (development only - never commit this)\n');
console.log(`ED25519_PRIVATE_KEY_PEM="${privatePem.replace(/\n/g, '\\n')}"\n`);
console.log('# Publish this to the barrier estate and to /v1/.well-known/ticket-keys\n');
console.log(publicPem);
