export function safeNext(next: string | null, fallback = "/member") {
  if (!next || !next.startsWith("/member") || next.startsWith("//") || next.startsWith("/member/sign-in")) return fallback;
  return next;
}
