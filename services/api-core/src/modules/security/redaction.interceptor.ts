/**
 * RedactionInterceptor — global (APP_INTERCEPTOR) enforcement of "credentials never leave
 * the process" (ADR-022 M2):
 *   1. every response body is deep-stripped of password/token/cipher/secret/... fields;
 *   2. one sanitized access log line per request (query + body scrubbed).
 * It is a NET belt over the per-module mappers: a handler that forgets to strip a field can
 * still not leak it.
 */
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { redactForLog, redactSecretText, stripSensitive } from './secret-redaction';

@Injectable()
export class RedactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpAccess');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest?.();
    if (req) {
      const method = req.method ?? '?';
      const url = (req.originalUrl || req.url || '?').split('?')[0];
      const query = redactForLog(req.query ?? {});
      const body = redactForLog(req.body ?? {});
      this.logger.log(`${method} ${url} query=${JSON.stringify(query)} body=${JSON.stringify(body)}`);
    }

    return next.handle().pipe(
      map((data) => {
        const cleaned = stripSensitive(data);
        // Defense-in-depth for string bodies (rare: health checks, error strings).
        if (typeof cleaned === 'string') return redactSecretText(cleaned);
        return cleaned;
      })
    );
  }
}
