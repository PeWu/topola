import {Renderer, TreeNodeSelection} from '../src/api';

export class FakeRenderer implements Renderer {
  constructor() {}

  getPreferredIndiSize(id: string): [number, number] {
    return [10, 10];
  }

  getPreferredFamSize(id: string): [number, number] {
    return [0, 0];
  }

  render(selection: TreeNodeSelection): void {}
}
