export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

export function isDatabaseConnectionError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  return (
    code === "P1001" ||
    code === "P2021" ||
    message.includes("P1001") ||
    message.includes("Can't reach database server") ||
    message.includes("PrismaClientInitializationError") ||
    message.includes("does not exist in the current database")
  );
}

export function isPrismaMissingTableError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  return code === "P2021" || message.includes("does not exist in the current database");
}
