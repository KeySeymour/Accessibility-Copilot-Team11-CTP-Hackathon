// lib/scan/url-guard.ts
//
// SSRF guard for POST /api/scans. The endpoint takes a URL from an anonymous
// caller and fetches it server-side, so without this it is a request proxy into
// whatever the server can reach — cloud metadata endpoints (169.254.169.254),
// internal admin panels, databases on localhost.
//
// Two layers:
//   1. Reject non-http(s) schemes and obviously-internal hostnames.
//   2. Resolve DNS and reject if ANY resolved address is private/loopback/
//      link-local. Checking every address matters: a hostname can resolve to
//      both a public and a private IP.
//
// KNOWN LIMIT: this is a check-then-use, so a DNS-rebinding attacker can return
// a public IP here and a private one when Playwright connects moments later.
// Closing that properly needs egress control the app layer can't provide — a
// network policy, a proxy allowlist, or running the browser in a sandboxed
// network namespace. Do that before this is internet-facing.

import dns from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

export class UnsafeUrlError extends Error {}

/** IPv4 ranges that must never be fetched, as [firstOctet, predicate] checks. */
function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;

  const [a, b] = p;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + broadcast

  return false;
}

/**
 * Expands an IPv6 address to its 16 bytes, or null if it isn't parseable.
 *
 * Parsing to bytes rather than matching the string form is deliberate: the
 * WHATWG URL parser rewrites `::ffff:127.0.0.1` as `::ffff:7f00:1`, so a
 * regex looking for the dotted-quad form silently lets loopback through.
 */
function parseIPv6(ip: string): Uint8Array | null {
  const addr = ip.toLowerCase().split("%")[0]; // strip any zone index
  const halves = addr.split("::");
  if (halves.length > 2) return null;

  const parseGroups = (segment: string): number[] | null => {
    if (segment === "") return [];
    const out: number[] = [];
    const chunks = segment.split(":");

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];

      // A trailing dotted-quad occupies the last two groups.
      if (chunk.includes(".")) {
        if (i !== chunks.length - 1) return null;
        const octets = chunk.split(".").map(Number);
        if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
        out.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
        continue;
      }

      if (!/^[0-9a-f]{1,4}$/.test(chunk)) return null;
      out.push(Number.parseInt(chunk, 16));
    }

    return out;
  };

  const head = parseGroups(halves[0]);
  const tail = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (head === null || tail === null) return null;

  let groups: number[];
  if (halves.length === 2) {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    groups = [...head, ...new Array<number>(fill).fill(0), ...tail];
  } else {
    groups = head;
  }

  if (groups.length !== 8) return null;

  const bytes = new Uint8Array(16);
  groups.forEach((g, i) => {
    bytes[i * 2] = g >> 8;
    bytes[i * 2 + 1] = g & 0xff;
  });

  return bytes;
}

function isPrivateIPv6(ip: string): boolean {
  const b = parseIPv6(ip);
  if (!b) return true; // unparseable — refuse rather than guess

  const v4 = (o: Uint8Array) => `${o[12]}.${o[13]}.${o[14]}.${o[15]}`;
  const first10Zero = b.subarray(0, 10).every((x) => x === 0);

  if (first10Zero) {
    // ::ffff:0:0/96 — IPv4-mapped. Unwrap and judge the embedded v4 address.
    if (b[10] === 0xff && b[11] === 0xff) return isPrivateIPv4(v4(b));
    // ::/96 — unspecified, loopback (::1), and deprecated IPv4-compatible.
    if (b[10] === 0 && b[11] === 0) return true;
  }

  // 64:ff9b::/96 NAT64 — can also wrap a private IPv4 destination.
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b) return isPrivateIPv4(v4(b));

  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique-local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (b[0] === 0xff) return true; // multicast

  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // not a parseable IP — refuse rather than guess
}

/**
 * Validates a user-supplied scan target.
 * @returns the normalized URL string.
 * @throws {UnsafeUrlError} with a plain-language message safe to show the user.
 */
export async function assertScannableUrl(raw: unknown): Promise<string> {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new UnsafeUrlError("Enter a website address to scan.");
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid web address.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https addresses can be scanned.");
  }

  // URL.hostname keeps the brackets on IPv6 literals ("[::1]"), which would
  // fail net.isIP() and fall through to a DNS lookup that can't resolve it.
  // Strip them so IPv6 literals are checked as addresses. Also drop a trailing
  // dot, since "localhost." is the same host as "localhost".
  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new UnsafeUrlError("That address points at this machine, so it can't be scanned.");
  }

  // A literal IP skips DNS entirely.
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new UnsafeUrlError("That address is on a private network, so it can't be scanned.");
    }
    return url.toString();
  }

  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError("We couldn't find that website. Check the address and try again.");
  }

  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new UnsafeUrlError("That address resolves to a private network, so it can't be scanned.");
  }

  return url.toString();
}
