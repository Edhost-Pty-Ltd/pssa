// South African ID number check
export function isValidSaIdNumber(id: string) {
  if (!/^\d{13}$/.test(id)) return false;
  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  const validDate = [1900, 2000].some((century) => {
    const d = new Date(Date.UTC(century + yy, mm - 1, dd));
    return d.getUTCFullYear() === century + yy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd;
  });
  if (!validDate) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = Number(id[12 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
