export function generateRandomNumbers(n: number, maxTotal: number): number[] {
  const min = 100;
  const max = 500;
  const result: number[] = [];
  let sum = 0;

  // Ensure n is positive and maxTotal is sensible
  if (n <= 0 || maxTotal <= 0) return result;

  for (let i = 0; i < n; i++) {
    // Calculate max value for this position
    const maxValueForThisPosition = Math.min(max, maxTotal - sum - (n - i - 1) * min);
    const randomNumber = Math.floor(Math.random() * (maxValueForThisPosition - min + 1)) + min;

    if (isNaN(randomNumber)) {
      console.error('Generated NaN value in random number generation');
      return [];  // Вернем пустой массив, если возникла ошибка
    }
    
    result.push(randomNumber);
    sum += randomNumber;

    // Stop if the total sum is close to maxTotal
    if (sum >= maxTotal) break;
  }

  // Adjust the last number to make sure the sum does not exceed maxTotal
  if (sum > maxTotal) {
    const excess = sum - maxTotal;
    result[result.length - 1] -= excess;
  }

  return result;
}
