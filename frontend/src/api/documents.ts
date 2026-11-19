import { api } from "../lib/api";
import type { Channel, MemberDocument } from "./member";

export type DocumentType = "id_document" | "proof_of_residence" | "bank_evidence" | "business_registration" | "channel_evidence";

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

export const documentFileUrl = (id: string) => `/api/member/documents/${id}/file`;

export function addChannel(platform: string, value: string) {
  const isUrl = /^https?:\/\//i.test(value);
  return api<{ channel: Channel }>("/member/channels", { body: { platform, ...(isUrl ? { url: value } : { handle: value }) } });
}

export const confirmChannel = (id: string, code: string) => api<{ channel: Channel }>(`/member/channels/${id}/confirm`, { body: { code } });
