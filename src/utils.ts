export type Direction = -1 | 0 | 1;
export interface Vec2 {x: number; y: number;}


export function nonEmpty<T>(array: T[]): boolean {
  return !!(array && array.length);
}

export function last<T>(array: T[]): T {
  return array[array.length - 1];
}

export function flatten<T>(arrays: T[][]): T[] {
  return [].concat.apply([], arrays);
}

export function zip<A, B>(a: A[], b: B[]): Array<[A, B]> {
  return a.map((e, i) => [e, b[i]] as [A, B]);
}

export function points2pathd(points: Vec2[]): string {
  let result = `M ${points[0].x} ${points[0].y} L`;
  for (const s of points.slice(1)) {
    result += ` ${s.x} ${s.y}`;
  }
  return result;
}
