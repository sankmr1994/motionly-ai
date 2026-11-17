import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

function parseEnvironment(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const environment = parseEnvironment(await readFile(".env.local", "utf8"));
const requiredKeys = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
];
const missingKeys = requiredKeys.filter((key) => !environment[key]);

if (missingKeys.length > 0) {
  throw new Error(`Missing R2 settings: ${missingKeys.join(", ")}`);
}

const endpoint = new URL(environment.R2_ENDPOINT);
if (!endpoint.hostname.startsWith(`${environment.R2_ACCOUNT_ID}.`)) {
  throw new Error("R2_ENDPOINT does not belong to R2_ACCOUNT_ID.");
}

const algorithm = "AWS4-HMAC-SHA256";
const region = "auto";
const service = "s3";
const now = new Date();
const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
const shortDate = amzDate.slice(0, 8);
const scope = `${shortDate}/${region}/${service}/aws4_request`;
const emptyHash = createHash("sha256").update("").digest("hex");
const path = `/${encodeURIComponent(environment.R2_BUCKET_NAME)}`;
const query = "list-type=2&max-keys=1";
const canonicalHeaders = `host:${endpoint.host}\nx-amz-content-sha256:${emptyHash}\nx-amz-date:${amzDate}\n`;
const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
const canonicalRequest = [
  "GET",
  path,
  query,
  canonicalHeaders,
  signedHeaders,
  emptyHash,
].join("\n");
const stringToSign = [
  algorithm,
  amzDate,
  scope,
  createHash("sha256").update(canonicalRequest).digest("hex"),
].join("\n");

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

const signingKey = hmac(
  hmac(
    hmac(hmac(`AWS4${environment.R2_SECRET_ACCESS_KEY}`, shortDate), region),
    service,
  ),
  "aws4_request",
);
const signature = createHmac("sha256", signingKey)
  .update(stringToSign)
  .digest("hex");

endpoint.pathname = path;
endpoint.search = query;
const response = await fetch(endpoint, {
  headers: {
    authorization: `${algorithm} Credential=${environment.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": emptyHash,
    "x-amz-date": amzDate,
  },
});

if (!response.ok) {
  throw new Error(`R2 connection failed with HTTP ${response.status}.`);
}

console.log(
  `R2 connection succeeded for bucket ${environment.R2_BUCKET_NAME}.`,
);
