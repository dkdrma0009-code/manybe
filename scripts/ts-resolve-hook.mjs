// 테스트 전용: web/lib 의 확장자 없는 상대 import("./adAvailability")를 Node에서 .ts 로 찾게 한다.
// 사용: node --experimental-strip-types --import ./scripts/ts-resolve-hook.mjs --test ...
// (Next/tsc 빌드 설정은 건드리지 않는다)
import { register } from 'node:module';

const hook = `
export async function resolve(specifier, context, next) {
  if (/^\\.\\.?\\//.test(specifier) && !/\\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL?.endsWith('.ts')) {
    try { return await next(specifier + '.ts', context); } catch {}
  }
  return next(specifier, context);
}`;

register('data:text/javascript,' + encodeURIComponent(hook));
