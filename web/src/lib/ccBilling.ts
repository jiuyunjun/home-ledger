// Credit-card billing cycle helpers. Pure JS, no Firestore deps.

export interface CCSettleInfo {
  settleDate: string; // YYYY-MM-DD
  settleMonth: string; // YYYY-MM
  daysUntil: number; // signed; negative means overdue
  closed: boolean; // current billing period closed?
}

// Given a CC's billingDay (statement close day) and settlementDay (pay-by day),
// return when the next payment is due relative to today.
export function nextCCSettlement(billingDay: number, settlementDay: number): CCSettleInfo | null {
  if (!settlementDay) return null;
  const bd = billingDay || 31;
  const sd = settlementDay;
  const d = new Date();
  const td = d.getDate();
  let sy = d.getFullYear();
  let sm = d.getMonth() + 1;
  if (td <= bd) {
    sm++; if (sm > 12) { sm = 1; sy++; }
  } else if (sd < td) {
    sm++; if (sm > 12) { sm = 1; sy++; }
  }
  // Clamp settlement day to that month's length so day 31 doesn't overflow.
  const lastDay = new Date(sy, sm, 0).getDate();
  const day = Math.min(sd, lastDay);
  const settleDate = `${sy}-${String(sm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const settleMonth = `${sy}-${String(sm).padStart(2, '0')}`;
  const target = new Date(sy, sm - 1, day);
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysUntil = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  return { settleDate, settleMonth, daysUntil, closed: td > bd };
}
