import type { ObjDoc, VisualBuilderElementBase } from "../../api/visualBuilder";

type Constructor<T> = new (...args: any[]) => T;

interface ShapeRegistryEntry<T extends VisualBuilderElementBase> {
  constructor: Constructor<T>;
  schema: ObjDoc;
}

const visualElemRegistry = new Map<string, ShapeRegistryEntry<VisualBuilderElementBase>>();

export function registerVisualElement<T extends VisualBuilderElementBase>(
  kind: string,
  constructor: Constructor<T>,
  schema: ObjDoc
) {
  visualElemRegistry.set(kind, {constructor, schema});
}

export function getConstructor(type: string): Constructor<VisualBuilderElementBase> | null{
  return visualElemRegistry.get(type)?.constructor ?? null;
}

/**
 * Hydrate a single raw JSON element into a typed TypeScript instance.
 * Always backfills _elemId from the raw _elem_id so that every element —
 * including types that don't extend BasicShape (Label, Line, Array) —
 * gets a stable React key regardless of its position in the registry.
 */
export function hydrateElement(el: any): VisualBuilderElementBase {
  const ctor = visualElemRegistry.get(el.type)?.constructor;
  const instance: VisualBuilderElementBase = ctor ? new ctor(el) : (el as VisualBuilderElementBase);
  if (instance._elemId == null && el._elem_id != null) {
    instance._elemId = el._elem_id;
  }
  return instance;
}

export function getAllSchemas(): ObjDoc[] {
  return Array.from(visualElemRegistry.values()).map(entry => entry.schema);
}