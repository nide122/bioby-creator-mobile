/** 展示用 minor units → 字符串（不接支付网关，仅占位 UI） */
export function formatMinorUnits(amountCents: number, currency: 'USD' | 'CNY'): string {
  const major = amountCents / 100;
  if (currency === 'CNY') {
    return `¥${major.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
