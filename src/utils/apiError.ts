import axios from "axios";

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (Array.isArray(data)) {
      // ASP.NET Identity validation errors: [{ description: "..." }, ...]
      const msgs = data.map((e: { description?: string }) => e.description ?? "").filter(Boolean);
      return msgs.length > 0 ? msgs.join(" ") : err.message || "An error occurred.";
    }
    if (typeof data === "string" && data.trim()) return data;
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.error === "string") return data.error;
    return err.message || "An error occurred.";
  }
  if (err instanceof Error) return err.message;
  return "An error occurred.";
}
