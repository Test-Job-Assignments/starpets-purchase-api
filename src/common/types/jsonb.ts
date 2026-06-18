// TypeORM's QueryDeepPartialEntity mapped type only accepts index-signature
// columns whose value type is `any`, not `unknown`.
export type JsonB = Record<string, any>;
