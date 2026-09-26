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

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new HttpError(0, "Network error. Check your connection and try again.");
  }
  if (response.status === 404) throw new NotFoundError();
  if (!response.ok) throw new HttpError(response.status, `Request failed (${response.status}).`);
  return (await response.json()) as T;
}
