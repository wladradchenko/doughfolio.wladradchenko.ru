export function generateRandomNumbers(n: number, maxTotal: number): number[] {
  const min = 100;
  const max = 500;
  const result: number[] = [];
  let sum = 0;

  // Ensure n is positive and maxTotal is sensible
  if (n <= 0 || maxTotal <= 0) return result;

  for (let i = 0; i < n; i++) {
    // Calculate max value for this position
    const remaining = maxTotal - sum;
    const remainingSlots = n - i;
    
    // If this is the last number, use all remaining to ensure we hit maxTotal
    if (i === n - 1) {
      const lastNumber = Math.max(min, Math.min(max, remaining));
      result.push(lastNumber);
      sum += lastNumber;
      break;
    }
    
    const maxValueForThisPosition = Math.min(max, remaining - (remainingSlots - 1) * min);
    const randomNumber = Math.floor(Math.random() * (maxValueForThisPosition - min + 1)) + min;

    if (isNaN(randomNumber)) {
      console.error('Generated NaN value in random number generation');
      return [];  // Вернем пустой массив, если возникла ошибка
    }
    
    result.push(randomNumber);
    sum += randomNumber;
  }

  // Adjust the last number to make sure the sum equals maxTotal (or very close)
  const difference = maxTotal - sum;
  if (difference !== 0 && result.length > 0) {
    result[result.length - 1] = Math.max(min, result[result.length - 1] + difference);
  }

  return result;
}
