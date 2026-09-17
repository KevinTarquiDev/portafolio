declare module "@jsonresume/schema" {
  export interface JsonResumeSchema {
    /** Validación síncrona: `errors` es null cuando `valid` es true. */
    validate(
      resume: unknown,
      callback: (errors: unknown, valid: boolean) => void,
    ): void;
    schema: Record<string, unknown>;
    jobSchema?: Record<string, unknown>;
  }
  const resumeSchema: JsonResumeSchema;
  export default resumeSchema;
}
