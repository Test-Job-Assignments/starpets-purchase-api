export type Result<T = unknown> = T & {
  ok: boolean;
};

export type OkResult<T = unknown> = T & {
  ok: true;
};

export type ErrorResult<T = unknown> = T & {
  ok: false;
};

export function ok<T extends object>(data: T): OkResult<T> {
  return { ...data, ok: true };
}

export function error<T extends object>(data: T): ErrorResult<T> {
  return { ...data, ok: false };
}
