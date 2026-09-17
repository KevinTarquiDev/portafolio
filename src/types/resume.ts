/**
 * data/resume.json escribe los textos traducibles como pares `{ es, en }`
 * y el resto como valores planos. Resolved<T> describe el resultado de
 * sustituir cada par por el valor de un idioma.
 */
export type Resolved<T> = T extends { es: infer Value; en: unknown }
  ? Resolved<Value>
  : T extends readonly (infer Item)[]
    ? Resolved<Item>[]
    : T extends object
      ? { [Key in keyof T]: Resolved<T[Key]> }
      : T;

export type ResumeSource = typeof import("../../data/resume.json");

export type Resume = Resolved<ResumeSource>;
