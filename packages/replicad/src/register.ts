import { getOC } from "./oclib";
import { OpenCascadeInstance } from "replicad-opencascadejs";

interface Deletable {
  delete: () => void;
}
const deletetableRegistry = new FinalizationRegistry((heldValue: Deletable) => {
  console.log("deleting wrapped");
  heldValue.delete();
});

export class WrappingObj<Type extends Deletable> {
  protected oc: OpenCascadeInstance;
  private _wrapped: Type | null;

  constructor(wrapped: Type) {
    this.oc = getOC();
    if (!this.oc) console.log("wrapping", this.oc);

    if (wrapped) {
      deletetableRegistry.register(this, wrapped, wrapped);
    }
    this._wrapped = wrapped;
  }

  get wrapped(): Type {
    if (this._wrapped === null) throw new Error("This object has been deleted");
    return this._wrapped;
  }

  set wrapped(newWrapped: Type) {
    if (this._wrapped) {
      deletetableRegistry.unregister(this._wrapped);
      this._wrapped.delete();
    }

    deletetableRegistry.register(this, newWrapped, newWrapped);
    this._wrapped = newWrapped;
  }

  delete() {
    deletetableRegistry.unregister(this.wrapped);
    this.wrapped?.delete();
    this._wrapped = null;
  }
}

export const GCWithScope = () => {
  function gcWithScope<Type extends Deletable>(value: Type): Type {
    deletetableRegistry.register(gcWithScope, value);
    return value;
  }

  return gcWithScope;
};

export const localGC = (
  debug?: boolean
): [
  <T extends Deletable>(v: T) => T,
  () => void,
  Set<Deletable> | undefined
] => {
  const cleaner = new Set<Deletable>();

  return [
    <T extends Deletable>(v: T): T => {
      cleaner.add(v);
      return v;
    },

    () => {
      [...cleaner.values()].forEach((d) => d.delete());
      cleaner.clear();
    },
    debug ? cleaner : undefined,
  ];
};
