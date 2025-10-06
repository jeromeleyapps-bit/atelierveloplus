import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Accepts CSV body text with BOM.
// Supports two formats:
// 1) Header-based comma CSV with columns:
//    "Prénom,Nom,Email,Téléphone,Adresse,Complément adresse,Code postal,Ville,Pays,Adresse de livraison,Complément adresse de livraison,Code postal de livraison,Ville de livraison,Pays de livraison,Notes"
// 2) Headerless vendor-like semicolon format where fields are in many tokens; we use heuristics to extract lastname/firstname/email/address/zip/city/country and keep the rest as notes.
export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const text = await req.text();
  const raw = text.replace(/^\uFEFF/, ""); // strip BOM
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return NextResponse.json({ imported: 0 }, { status: 200 });

  // Detect delimiter by comparing counts in the first non-empty line
  const sniffLine = lines[0];
  const commaCount = (sniffLine.match(/,/g) || []).length;
  const semiCount = (sniffLine.match(/;/g) || []).length;
  const delim = semiCount > commaCount ? ';' : ',';

  // split preserving quoted segments
  function parseCSVLine(line: string, delimiter: ',' | ';'): string[] {
    const out: string[] = [];
    let buf = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { buf += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === delimiter && !inQ) {
        out.push(buf); buf = "";
      } else { buf += ch; }
    }
    out.push(buf);
    return out.map(s => s.trim());
  }

  // Check if we have the expected comma header variant
  const maybeHeader = parseCSVLine(lines[0], delim as any);
  const looksLikeExpectedHeader = delim === ',' && (
    maybeHeader[0]?.toLowerCase().includes('prénom') || maybeHeader[0]?.toLowerCase().includes('prenom'));

  let imported = 0;
  // Helper to upsert by email if available, else create
  async function upsertCustomer(data: { firstName?: string|null; lastName?: string|null; email?: string|null; phone?: string|null; address1?: string|null; address2?: string|null; zip?: string|null; city?: string|null; country?: string|null; shipAddress1?: string|null; shipAddress2?: string|null; shipZip?: string|null; shipCity?: string|null; shipCountry?: string|null; notes?: string|null; }) {
    const email = data.email || undefined;
    if (email) {
      const existing = await prisma.customer.findUnique({ where: { email } }).catch(() => null);
      if (existing) {
        await prisma.customer.update({ where: { email }, data: {
          firstName: data.firstName ?? existing.firstName,
          lastName: data.lastName ?? existing.lastName,
          phone: data.phone ?? existing.phone,
          address1: data.address1 ?? existing.address1,
          address2: data.address2 ?? existing.address2,
          zip: data.zip ?? existing.zip,
          city: data.city ?? existing.city,
          country: data.country ?? existing.country,
          shipAddress1: data.shipAddress1 ?? existing.shipAddress1,
          shipAddress2: data.shipAddress2 ?? existing.shipAddress2,
          shipZip: data.shipZip ?? existing.shipZip,
          shipCity: data.shipCity ?? existing.shipCity,
          shipCountry: data.shipCountry ?? existing.shipCountry,
          notes: data.notes ?? existing.notes,
        }});
        imported++; return;
      }
    }
    await prisma.customer.create({ data: {
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address1: data.address1 ?? null,
      address2: data.address2 ?? null,
      zip: data.zip ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      shipAddress1: data.shipAddress1 ?? null,
      shipAddress2: data.shipAddress2 ?? null,
      shipZip: data.shipZip ?? null,
      shipCity: data.shipCity ?? null,
      shipCountry: data.shipCountry ?? null,
      notes: data.notes ?? null,
    }});
    imported++;
  }

  if (looksLikeExpectedHeader) {
    // Remove header and process comma CSV with known positions
    const dataLines = lines.slice(1);
    for (const line of dataLines) {
      const cols = parseCSVLine(line, ',');
      const [firstName,lastName,email,phone,address1,address2,zip,city,country,shipAddress1,shipAddress2,shipZip,shipCity,shipCountry,notes] = cols;
      try {
        await upsertCustomer({ firstName, lastName, email, phone, address1, address2, zip, city, country, shipAddress1, shipAddress2, shipZip, shipCity, shipCountry, notes });
      } catch (e) {
        console.error('customer_import_line_error', e);
      }
    }
  } else {
    // Heuristic parser for semicolon vendor dump (no header)
    for (const line of lines) {
      const cols = parseCSVLine(line, delim as any);
      try {
        // Email: first token with '@'
        const email = cols.find((c) => /@/.test(c)) || undefined;
        // Last/First name: try positions 2 and 4 (observed), else empty
        const lastName = cols[2]?.trim() || undefined;
        const firstName = cols[4]?.trim() || undefined;
        // Zip: first 4-6 digits token
        const zipIdx = cols.findIndex((c) => /^\d{4,6}$/.test(c));
        const zip = zipIdx >= 0 ? cols[zipIdx] : undefined;
        const city = zipIdx >= 0 && cols[zipIdx+1] ? cols[zipIdx+1] : undefined;
        // Country
        const country = cols.find((c) => /^(FR|France)$/i.test(c)) || undefined;
        // Address: try token before zip or a sequence that looks like street before zip
        let address1: string | undefined;
        if (zipIdx > 0) {
          // join a few tokens before zip until we hit previous separators
          const chunk = cols.slice(Math.max(0, zipIdx-3), zipIdx).filter(Boolean).join(' ');
          address1 = chunk || undefined;
        }
        // Phone candidate: first token with >= 9 digits
        const phone = (cols.find((c) => (c.replace(/\D/g,'').length >= 9))) || undefined;
        // Notes: fallback to full original line if little extracted
        const notes = (!firstName && !lastName && !address1) ? line : undefined;

        await upsertCustomer({ firstName: firstName ?? null, lastName: lastName ?? null, email: email ?? null, phone: phone ?? null, address1: address1 ?? null, address2: null, zip: zip ?? null, city: city ?? null, country: (country as any) ?? null, shipAddress1: null, shipAddress2: null, shipZip: null, shipCity: null, shipCountry: null, notes: notes ?? null });
      } catch (e) {
        console.error('customer_import_line_error', e);
      }
    }
  }
  return NextResponse.json({ imported }, { status: 200 });
}
