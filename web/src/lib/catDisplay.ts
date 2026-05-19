// Maps real category names (from Firestore) to display mark + tint.
// Falls back gracefully for custom categories.

interface CatDisplay {
  mark: string;
  tint: string;
}

const MAP: Record<string, CatDisplay> = {
  // Expense
  '餐饮':   { mark: '食', tint: '#F0DDC2' },
  '交通':   { mark: '交', tint: '#CFDDE9' },
  '购物':   { mark: '購', tint: '#E5E0D6' },
  '娱乐':   { mark: '娯', tint: '#F1D5D0' },
  '水电网': { mark: '電', tint: '#E3D9EA' },
  '医疗':   { mark: '医', tint: '#D9E6E3' },
  '日用品': { mark: '日', tint: '#E6E1CF' },
  '房租':   { mark: '住', tint: '#E8D7CC' },
  '保险':   { mark: '险', tint: '#DDDAEA' },
  '其他支出':{ mark: '他', tint: '#E5E0D6' },
  // Income
  '工资':   { mark: '給', tint: '#CFE0D0' },
  '奖金':   { mark: '賞', tint: '#E9DAB4' },
  '副业':   { mark: '副', tint: '#D4DDE6' },
  '其他收入':{ mark: '他', tint: '#E5E0D6' },
};

export function catDisplay(name: string): CatDisplay {
  return MAP[name] ?? { mark: name.slice(0, 1), tint: '#E5E0D6' };
}
