// To parse this data:
//
//   import { toModelsQuicktype, ModelsQuicktype } from "./file";
//
//   const modelsQuicktype = toModelsQuicktype(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export type ModelsQuicktype = {
  object: string;
  data: Datum[];
};

export type Datum = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  name: string;
  description: string;
  context_window: number;
  max_tokens: number;
  pricing: Pricing;
};

export type Pricing = {
  input: string;
  output: string;
};

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export function toModelsQuicktype(json: string): ModelsQuicktype {
  return cast(JSON.parse(json), r('ModelsQuicktype'));
}

export function modelsQuicktypeToJson(value: ModelsQuicktype): string {
  return JSON.stringify(uncast(value, r('ModelsQuicktype')), null, 2);
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
  const prettyTyp = prettyTypeName(typ);
  const parentText = parent ? ` on ${parent}` : '';
  const keyText = key ? ` for key "${key}"` : '';
  throw new Error(
    `Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`,
  );
}

function prettyTypeName(typ: any): string {
  if (Array.isArray(typ)) {
    if (typ.length === 2 && typ[0] === undefined) {
      return `an optional ${prettyTypeName(typ[1])}`;
    } else {
      return `one of [${typ
        .map((a) => {
          return prettyTypeName(a);
        })
        .join(', ')}]`;
    }
  } else if (typeof typ === 'object' && typ.literal !== undefined) {
    return typ.literal;
  } else {
    return typeof typ;
  }
}

function jsonToJSProps(typ: any): any {
  if (typ.jsonToJS === undefined) {
    const map: any = {};
    for (const p of typ.props) {
      map[p.json] = { key: p.js, typ: p.typ };
    }
    typ.jsonToJS = map;
  }
  return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
  if (typ.jsToJSON === undefined) {
    const map: any = {};
    for (const p of typ.props) {
      map[p.js] = { key: p.json, typ: p.typ };
    }
    typ.jsToJSON = map;
  }
  return typ.jsToJSON;
}

function transformPrimitive(typ: string, val: any, key: any, parent: any): any {
  if (typeof typ === typeof val) {
    return val;
  }
  return invalidValue(typ, val, key, parent);
}

function transformUnion(
  typs: any[],
  val: any,
  getProps: any,
  key: any,
  parent: any,
): any {
  // val must validate against one typ in typs
  const l = typs.length;
  for (let i = 0; i < l; i++) {
    const typ = typs[i];
    try {
      return transform(val, typ, getProps);
    } catch (_) {}
  }
  return invalidValue(typs, val, key, parent);
}

function transformEnum(cases: string[], val: any, key: any, parent: any): any {
  if (cases.indexOf(val) !== -1) {
    return val;
  }
  return invalidValue(
    cases.map((a) => {
      return l(a);
    }),
    val,
    key,
    parent,
  );
}

function transformArray(
  typ: any,
  val: any,
  getProps: any,
  key: any,
  parent: any,
): any {
  // val must be an array with no invalid elements
  if (!Array.isArray(val)) {
    return invalidValue(l('array'), val, key, parent);
  }
  return val.map((el) => transform(el, typ, getProps));
}

function transformDate(val: any, key: any, parent: any): any {
  if (val === null) {
    return null;
  }
  const d = new Date(val);
  if (Number.isNaN(d.valueOf())) {
    return invalidValue(l('Date'), val, key, parent);
  }
  return d;
}

function transformObject(
  props: { [k: string]: any },
  additional: any,
  val: any,
  getProps: any,
  key: any,
  parent: any,
  ref: any,
): any {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) {
    return invalidValue(l(ref || 'object'), val, key, parent);
  }
  const result: any = {};
  Object.getOwnPropertyNames(props).forEach((key) => {
    const prop = props[key];
    const v = Object.hasOwn(val, key) ? val[key] : undefined;
    result[prop.key] = transform(v, prop.typ, getProps, key, ref);
  });
  Object.getOwnPropertyNames(val).forEach((key) => {
    if (!Object.hasOwn(props, key)) {
      result[key] = transform(val[key], additional, getProps, key, ref);
    }
  });
  return result;
}

function resolveTypeReference(typ: any): { resolvedType: any; ref: any } {
  let ref: any;
  while (typeof typ === 'object' && typ.ref !== undefined) {
    ref = typ.ref;
    typ = typeMap[typ.ref];
  }
  return { resolvedType: typ, ref };
}

function transformByType(
  val: any,
  typ: any,
  getProps: any,
  key: any,
  parent: any,
  ref: any,
): any {
  if (Array.isArray(typ)) {
    return transformEnum(typ, val, key, parent);
  }
  if (typeof typ === 'object') {
    if (Object.hasOwn(typ, 'unionMembers')) {
      return transformUnion(typ.unionMembers, val, getProps, key, parent);
    }
    if (Object.hasOwn(typ, 'arrayItems')) {
      return transformArray(typ.arrayItems, val, getProps, key, parent);
    }
    if (Object.hasOwn(typ, 'props')) {
      return transformObject(
        getProps(typ),
        typ.additional,
        val,
        getProps,
        key,
        parent,
        ref,
      );
    }
    return invalidValue(typ, val, key, parent);
  }
  // Numbers can be parsed by Date but shouldn't be.
  if (typ === Date && typeof val !== 'number') {
    return transformDate(val, key, parent);
  }
  return transformPrimitive(typ, val, key, parent);
}

function transform(
  val: any,
  typ: any,
  getProps: any,
  key: any = '',
  parent: any = '',
): any {
  if (typ === 'any') {
    return val;
  }
  if (typ === null) {
    if (val === null) {
      return val;
    }
    return invalidValue(typ, val, key, parent);
  }
  if (typ === false) {
    return invalidValue(typ, val, key, parent);
  }

  const { resolvedType, ref } = resolveTypeReference(typ);
  return transformByType(val, resolvedType, getProps, key, parent, ref);
}

function cast<T>(val: any, typ: any): T {
  return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
  return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
  return { literal: typ };
}

function a(typ: any) {
  return { arrayItems: typ };
}

function _u(...typs: any[]) {
  return { unionMembers: typs };
}

function o(props: any[], additional: any) {
  return { props, additional };
}

function _m(additional: any) {
  return { props: [], additional };
}

function r(name: string) {
  return { ref: name };
}

const typeMap: any = {
  ModelsQuicktype: o(
    [
      { json: 'object', js: 'object', typ: '' },
      { json: 'data', js: 'data', typ: a(r('Datum')) },
    ],
    false,
  ),
  Datum: o(
    [
      { json: 'id', js: 'id', typ: '' },
      { json: 'object', js: 'object', typ: '' },
      { json: 'created', js: 'created', typ: 0 },
      { json: 'owned_by', js: 'owned_by', typ: '' },
      { json: 'name', js: 'name', typ: '' },
      { json: 'description', js: 'description', typ: '' },
      { json: 'context_window', js: 'context_window', typ: 0 },
      { json: 'max_tokens', js: 'max_tokens', typ: 0 },
      { json: 'pricing', js: 'pricing', typ: r('Pricing') },
    ],
    false,
  ),
  Pricing: o(
    [
      { json: 'input', js: 'input', typ: '' },
      { json: 'output', js: 'output', typ: '' },
    ],
    false,
  ),
};
