export function calculatePercentage(
  numbers: number[],
  total: number,
): number[] {
  const percentageArray: number[] = [];

  if (total === 0) {
    console.error('Total is zero, cannot calculate percentages');
    return numbers.map(() => 0);  // Возвращаем массив с нулями, если total = 0
  }

  numbers.forEach(number => {
    const percentage = Math.round((number / total) * 100);

    percentageArray.push(percentage);
  });

  return percentageArray;
}
