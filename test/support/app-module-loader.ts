import type { AppModule as AppModuleType } from '@/app.module';
import type { HttpExceptionFilter as HttpExceptionFilterType } from '@/common/http-exception.filter';

export interface AppDependencies {
  AppModule: typeof AppModuleType;
  HttpExceptionFilter: typeof HttpExceptionFilterType;
}

// AppModule (via src/database/datasource.ts) reads DB_HOST/RABBITMQ_CONNECTION/etc.
// from process.env at *import* time, not through a runtime-injected config factory.
// A static top-level `import` would be evaluated before the test containers start
// and set those env vars, so AppModule must be require()'d lazily, after that.
export function loadAppDependencies(): AppDependencies {
  const { AppModule } =
    require('@/app.module') as typeof import('@/app.module');
  const { HttpExceptionFilter } =
    require('@/common/http-exception.filter') as typeof import('@/common/http-exception.filter');

  return { AppModule, HttpExceptionFilter };
}
