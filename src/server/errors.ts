import "server-only";

/** Maps to 404. Also used for resources owned by someone else, so existence isn't revealed. */
export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
  }
}

/** Maps to 409: the request conflicts with current state (e.g. order already paid). */
export class ConflictError extends Error {}

/** Maps to 400: malformed input. */
export class BadRequestError extends Error {}
