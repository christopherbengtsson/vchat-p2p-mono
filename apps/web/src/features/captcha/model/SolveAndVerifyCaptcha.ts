export type SolveAndVerifyCaptcha =
  | {
      success: false;
      errorMessage: string;
    }
  | { success: true };
