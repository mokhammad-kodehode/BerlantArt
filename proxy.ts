import { NextResponse, type NextRequest } from "next/server";

import { sessionCookieName, verifySessionToken } from "@/lib/auth";

/**
 * Оптимистичная проверка сессии перед входом в приложение.
 *
 * В Next 16 этот файл называется `proxy.ts`, а не `middleware.ts`:
 * старое имя объявлено устаревшим, и по умолчанию код работает
 * в Node.js-рантайме, а не в Edge.
 *
 * Документация Next прямо предупреждает, что одной такой проверки мало:
 * она не единственный рубеж, а первый. Настоящая защита — `requireAdmin()`
 * внутри самих страниц и Server Action'ов: она сработает, даже если новый
 * маршрут забудут вписать в `matcher` ниже.
 *
 * Похода в базу здесь нет и быть не должно — проверяется только подпись
 * куки, это несколько микросекунд.
 */
export function proxy(request: NextRequest): NextResponse {
  const token = request.cookies.get(sessionCookieName)?.value;
  const isAuthenticated = verifySessionToken(token);

  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  // Вошедшему на странице входа делать нечего: без этого кнопка «назад»
  // после логина возвращает на форму, и выглядит это как разлогинивание.
  if (isLoginPage) {
    return isAuthenticated
      ? NextResponse.redirect(new URL("/admin", request.url))
      : NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
