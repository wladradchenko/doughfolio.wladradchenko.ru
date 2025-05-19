export const formatNumber = (value, { isCurrency = false, currency = 'USD', minimumFractionDigits = 0, maximumFractionDigits = 2 } = {}) => {
  if (value == null || isNaN(value)) return '∞';

  return value.toLocaleString(undefined, {
    style: isCurrency ? 'currency' : 'decimal',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  });
};

export const safeToFixed = (value, decimals = 2) => {
  if (isNaN(value) || value == null) {
    // Если значение не число или null, возвращаем строку с дефолтным значением
    return '0.00';
  }
  return value.toFixed(decimals);
}
