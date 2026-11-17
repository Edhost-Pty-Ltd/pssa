// Where to go after signing in. Only member-portal paths on this site are allowed,
// so a link like /member/sign-in?next=https://evil.example can't send people elsewhere.
export function safeNext(next: string | null, fallback = "/member") {
  if (!next || !next.startsWith("/member") || next.startsWith("//") || next.startsWith("/member/sign-in")) return fallback;
  return next;
}
