// Contact lists (mentor, koordinator, local hero) are stored as one text field per group,
// because the source spreadsheet keeps them that way. These helpers turn that text into
// name and phone rows for the form, and back into one canonical line per person.

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

export interface Contact {
  name: string;
  phone: string;
}

// Read our saved "(number)" format first, then legacy Indonesian free-text numbers.
const PHONE = /\((\+?\d(?:[ \t.-]*\d){6,})\)|(?:\+\s?62|62|0)(?:[\s\-.()]*\d){8,13}/g;
const EDGE = /^[\s()\/\\&,;:|*\-\u2022\u2013\u2014]+|[\s(\/\\&,;:|*\-\u2022\u2013\u2014]+$/g;

const cleanName = (value: string) => {
  let name = value.replace(EDGE, '').trim();
  // "A (0812) dan B (0813)" style joins
  name = name.replace(/^(?:dan|and)\s+/i, '').trim();
  return name;
};

/** Keeps a leading + and the digits only. */
export const cleanPhone = (value: string) => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
};

export function parseContacts(text: string | null | undefined): Contact[] {
  const source = String(text ?? '').replace(/\r/g, '');
  if (!source.trim() || /^[-\u2013\u2014]$/.test(source.trim())) return [];
  const contacts: Contact[] = [];
  const pushNames = (chunk: string) => {
    // Lines before the last one are people listed without a number.
    const lines = chunk.split('\n').map(cleanName).filter(Boolean);
    const last = lines.pop() ?? '';
    for (const line of lines) contacts.push({ name: line, phone: '' });
    return last;
  };
  let cursor = 0;
  for (const match of source.matchAll(PHONE)) {
    const name = pushNames(source.slice(cursor, match.index));
    contacts.push({ name, phone: cleanPhone(match[1] ?? match[0]) });
    cursor = match.index + match[0].length;
  }
  const rest = pushNames(source.slice(cursor));
  if (rest) contacts.push({ name: rest, phone: '' });
  return contacts;
}

/** One person per line: "Nama (nomor)". Empty rows are dropped. */
export function serializeContacts(contacts: Contact[]): string {
  return contacts
    .map((c) => ({ name: c.name.trim(), phone: cleanPhone(c.phone) }))
    .filter((c) => c.name || c.phone)
    .map((c) => (c.name && c.phone ? `${c.name} (${c.phone})` : c.name || c.phone))
    .join('\n');
}

/** Parse the whole input using country numbering metadata, without extracting digits from prose. */
export function parseContactPhone(value: string, country: CountryCode = 'ID') {
  const source = value.trim();
  if (!source || !/^\+?[\d\s().-]+$/.test(source)) return undefined;
  const clean = cleanPhone(source);
  return parsePhoneNumberFromString(country === 'ID' && clean.startsWith('62') ? `+${clean}` : source, { defaultCountry: country, extract: false });
}

export function normalizedPhone(value: string): string {
  // Legacy numbers without a country code or Indonesian prefix are ambiguous.
  if (!/^(?:\+|0|62|8)/.test(cleanPhone(value))) return '';
  const phone = parseContactPhone(value);
  return phone?.isValid() && !phone.ext ? phone.number : '';
}

/** Empty string when valid, otherwise the message to show under the row. */
export function contactError(contact: Contact): string {
  const name = contact.name.trim();
  if (!name && !contact.phone.trim()) return '';
  if (!name) return 'Isi nama.';
  if (name.length > 120) return 'Nama maksimal 120 karakter.';
  if (contact.phone.trim() && !normalizedPhone(contact.phone)) return 'Nomor WhatsApp tidak valid. Periksa kode negara dan nomornya.';
  return '';
}

/** "0812 3456 7890" style grouping for reading. */
export function formatPhone(phone: string): string {
  const clean = cleanPhone(phone);
  if (!clean) return '';
  if (!/^(?:\+62|62|0)/.test(clean)) return clean;
  const plus = clean.startsWith('+62');
  const local = plus ? clean.slice(3) : clean.startsWith('62') ? clean.slice(2) : clean.replace(/^0/, '');
  const groups = local.match(/^(\d{3})(\d{4})(\d*)$/);
  const body = groups ? [groups[1], groups[2], groups[3]].filter(Boolean).join(' ') : local;
  return plus || clean.startsWith('62') ? `+62 ${body}` : `0${body}`;
}

/** wa.me link, or empty when the number cannot be used. */
export function whatsappLink(phone: string): string {
  const international = normalizedPhone(phone);
  return international ? `https://wa.me/${international.slice(1)}` : '';
}
