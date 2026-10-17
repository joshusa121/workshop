export function formatWon(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}${Math.abs(Math.round(n)).toLocaleString("ko-KR")}원`;
}

export function formatMan(n: number): string {
  if (Math.abs(n) < 10_000) return formatWon(n);
  if (Math.abs(n) >= 100_000_000) {
    const eok = Math.round((n / 100_000_000) * 10) / 10;
    return `${eok.toLocaleString("ko-KR")}억 원`;
  }
  const man = Math.round((n / 10_000) * 10) / 10;
  return `${man.toLocaleString("ko-KR")}만 원`;
}
