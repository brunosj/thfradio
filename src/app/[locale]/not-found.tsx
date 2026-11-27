"use client";

import { useTranslations } from "next-intl";
import Button from "@/common/ui/UIButton";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="bg-dark-blue min-h-screen flex items-center justify-center">
      <div className="layout text-center ">
        <h1 className="text-6xl font-bold mb-4 text-white">404</h1>
        <h2 className="text-2xl mb-6 text-white">{t("title")}</h2>
        <p className="mb-6 text-white/80">{t("description")}</p>
        <div className=" flex justify-center">
          <Button path="/" color="white-orange">
            {t("backHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}