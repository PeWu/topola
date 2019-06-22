export class HierarchyFilter {
  indiParents = true;
  indiSiblings = true;
  spouseParents = true;
  spouseSiblings = true;
  children = true;

  static allAccepting(): HierarchyFilter {
    return new HierarchyFilter();
  }

  static allRejecting(): HierarchyFilter {
    return new HierarchyFilter().modify({
      indiParents: false,
      indiSiblings: false,
      spouseParents: false,
      spouseSiblings: false,
      children: false,
    });
  }

  constructor(overrides: HierarchyFilterOverrides = {}) {
    this.modify(overrides);
  }

  modify(overrides: HierarchyFilterOverrides): HierarchyFilter {
    Object.assign(this, overrides);
    return this;
  }
}

interface HierarchyFilterOverrides {
  indiParents?: boolean;
  indiSiblings?: boolean;
  spouseParents?: boolean;
  spouseSiblings?: boolean;
  children?: boolean;
}
