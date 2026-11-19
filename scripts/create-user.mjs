// Create an account with a random temporary password. The user is forced to
// pick their own password on first sign-in.
//
//   DATABASE_URL=... node scripts/create-user.mjs someone@example.com
//
// Against Railway, use the Postgres service's public URL (DATABASE_PUBLIC_URL);
// the internal one isn't reachable from your machine. The account must also be
// on ALLOWED_EMAILS only if they'll ever sign up themselves — sign-in doesn't check it.

import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scrypt = promisify(scryptCb);

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("usage: node scripts/create-user.mjs <email>");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// Same format as hashPassword() in lib/auth.ts.
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

// Readable: no 0/O/1/l/I.
const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const bytes = randomBytes(14);
const tempPassword = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");

const client = new pg.Client({
  connectionString: url,
  ssl: /railway\.internal|localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
});
await client.connect();
try {
  const { rows } = await client.query(
    `INSERT INTO users (email, password_hash, must_change_password)
     VALUES ($1, $2, true)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, await hashPassword(tempPassword)]
  );
  if (rows.length === 0) {
    console.error(`An account for ${email} already exists; nothing changed.`);
    process.exit(1);
  }
  console.log(`Created ${email} (${rows[0].id})`);
  console.log(`Temporary password: ${tempPassword}`);
} finally {
  await client.end();
}
