declare module "@jsonresume/schema" {
  export interface ValidationReport {
    [key: string]: unknown;
  }

  export interface JsonResumeSchema {
    validate(
      resume: unknown,
      callback?: (error: Error | null, report?: ValidationReport) => void,
      errorCallback?: (error: Error) => void,
    ): void;

    schema: Record<string, unknown>;
    jobSchema?: Record<string, unknown>;
  }

  const resumeSchema: JsonResumeSchema;

  export default resumeSchema;
}
