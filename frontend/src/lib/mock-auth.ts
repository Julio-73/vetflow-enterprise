// DEVELOPMENT ONLY - JWT HS256 Token Generator (Client-Side)
// Used exclusively for local validation of RLS policies and RBAC security rules in VetFlow SaaS.

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  professional_license?: string;
  tenant_name: string;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    email: "carlos.admin@sanmartin.com",
    name: "Carlos Pérez",
    role: "TenantOwner",
    tenant_id: "a1111111-1111-4111-a111-111111111111",
    tenant_name: "Clínica Veterinaria San Martín"
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    email: "laura.gomez@sanmartin.com",
    name: "Dra. Laura Gómez",
    role: "Veterinario",
    tenant_id: "a1111111-1111-4111-a111-111111111111",
    professional_license: "MV-98765-MX",
    tenant_name: "Clínica Veterinaria San Martín"
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    email: "maria.recep@sanmartin.com",
    name: "María López",
    role: "Recepcionista",
    tenant_id: "a1111111-1111-4111-a111-111111111111",
    tenant_name: "Clínica Veterinaria San Martín"
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    email: "roberto.silva@delbosque.com",
    name: "Dr. Roberto Silva",
    role: "DirectorClinico",
    tenant_id: "b2222222-2222-4222-b222-222222222222",
    professional_license: "MV-12345-CO",
    tenant_name: "Clínica Veterinaria Del Bosque"
  }
];

// Helper to base64url encode strings/buffers
function base64UrlEncode(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export async function generateMockJWT(user: MockUser, secret: string = "your_jwt_signing_secret_min_32_characters_here_12345"): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours expiry
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataData = encoder.encode(signatureInput);

  // Import raw key into Web Crypto HMAC provider
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await window.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    dataData
  );

  // Convert ArrayBuffer signature to base64url
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBase64 = btoa(signatureArray.map(b => String.fromCharCode(b)).join(""));
  const signatureEncoded = signatureBase64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${signatureInput}.${signatureEncoded}`;
}
