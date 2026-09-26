export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

/** The session is missing or revoked; the UI sends the user to sign in. */
export class UnauthorizedError extends HttpError {
  constructor(message = "Please sign in.") {
    super(401, message);
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new HttpError(0, "Network error. Check your connection and try again.");
  }
  if (response.ok) return (await response.json()) as T;

  // Server errors carry a user-facing { error } message.
  const message = await response
    .json()
    .then((b: { error?: string }) => b.error)
    .catch(() => undefined);
  if (response.status === 401) throw new UnauthorizedError(message);
  if (response.status === 404) throw new NotFoundError(message);
  throw new HttpError(response.status, message ?? `Request failed (${response.status}).`);
}

export function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return request<T>(url, { signal });
}

export function sendJson<T>(method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
