"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const codigo = params.get("codigo");
    const target = codigo
      ? `/sala/entrar?codigo=${encodeURIComponent(codigo)}`
      : "/sala/entrar";
    router.replace(target);
  }, [params, router]);

  return null;
}

export default function OficinaEntrarRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectInner />
    </Suspense>
  );
}
