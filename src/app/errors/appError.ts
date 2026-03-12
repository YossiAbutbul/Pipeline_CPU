export type AppErrorSource = "program" | "registers" | "memory" | "runtime";

export type AppError = {
  source: AppErrorSource;
  message: string;
};

export function toAppError(
  error: unknown,
  source: AppErrorSource,
  fallbackMessage = "Something went wrong",
): AppError {
  if (error instanceof Error) {
    const message = error.message.trim();
    return {
      source,
      message: message || fallbackMessage,
    };
  }

  if (typeof error === "string") {
    const message = error.trim();
    return {
      source,
      message: message || fallbackMessage,
    };
  }

  return {
    source,
    message: fallbackMessage,
  };
}

export function notifyAppError(
  notify: (message: string) => void,
  error: unknown,
  source: AppErrorSource,
  fallbackMessage?: string,
) {
  const appError = toAppError(error, source, fallbackMessage);
  notify(appError.message);
  return appError;
}
