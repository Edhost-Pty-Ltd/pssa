import { api } from "../lib/api";
import type { Channel, MemberDocument } from "./member";

// Verification documents and trading channels (docs/api-contract.md 6.3).
// Files are private: they are only ever opened through /api/member/documents/:id/file.

export type DocumentType = "id_document" | "proof_of_residence" | "bank_evidence" | "business_registration" | "channel_evidence";

/** Accepted by the backend: PDF, JPG, PNG or WebP, up to 8 MB. */
export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const ACCEPT_ATTRIBUTE = ".pdf,.jpg,.jpeg,.png,.webp";
export const MAX_FILE_MB = 8;

export function uploadDocument(type: DocumentType, file: File) {
  const form = new FormData();
  form.append("type", type);
  form.append("file", file);
  return api<{ document: MemberDocument }>("/member/documents", { form });
}

export const deleteDocument = (id: string) => api<{ ok: true }>(`/member/documents/${id}`, { method: "DELETE" });

/** Opens in a new tab; the session cookie goes with it, so only the owner can see the file. */
export const documentFileUrl = (id: string) => `/api/member/documents/${id}/file`;

export function addChannel(platform: string, value: string) {
  const isUrl = /^https?:\/\//i.test(value);
  return api<{ channel: Channel }>("/member/channels", { body: { platform, ...(isUrl ? { url: value } : { handle: value }) } });
}

export const confirmChannel = (id: string, code: string) => api<{ channel: Channel }>(`/member/channels/${id}/confirm`, { body: { code } });
