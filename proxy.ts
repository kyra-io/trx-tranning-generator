import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from "@/lib/i18n/locales";

function detectLanguage(header: string | null): Language {
  if (!header) {
    return DEFAULT_LANGUAGE;
  }

  const entries = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qualityParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qualityParam
        ? Number(qualityParam.split("=")[1])
        : 1;

      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .sort((left, right) => right.quality - left.quality);

  for (const { tag } of entries) {
    if (tag === "pt" || tag.startsWith("pt-")) {
      return "pt_pt";
    }

    if (tag === "en" || tag.startsWith("en-")) {
      return "en";
    }
  }

  return DEFAULT_LANGUAGE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLanguage = LANGUAGES.some(
    (language) =>
      pathname === `/${language}` || pathname.startsWith(`/${language}/`),
  );

  if (hasLanguage) {
    return NextResponse.next();
  }

  const language = detectLanguage(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${language}${pathname === "/" ? "" : pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
