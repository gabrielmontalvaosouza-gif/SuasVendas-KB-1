/**
 * Computes a SHA-256 hash using the standard Web Crypto API.
 */
export async function calculateSHA256(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes canonical hash for an article content payload to detect changes.
 */
export async function calculateArticleContentHash(content: {
  symptom: string;
  root_cause: string;
  resolution_steps_markdown: string;
  quick_reply_snippet?: string;
  workaround_notes?: string;
  erp_parameters?: string;
}): Promise<string> {
  const canonicalString = JSON.stringify({
    symptom: content.symptom.trim(),
    root_cause: content.root_cause.trim(),
    resolution_steps_markdown: content.resolution_steps_markdown.trim(),
    quick_reply_snippet: (content.quick_reply_snippet || '').trim(),
    workaround_notes: (content.workaround_notes || '').trim(),
    erp_parameters: (content.erp_parameters || '').trim(),
  });
  return calculateSHA256(canonicalString);
}

/**
 * Generates standard UUIDv4 (compatible with UUIDv7 structure).
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
