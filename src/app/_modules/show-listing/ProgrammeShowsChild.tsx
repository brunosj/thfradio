import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import type { ShowTypes } from "@/types/ResponsesInterface";
import { CMS_URL } from "@/utils/constants";

interface ProgrammeShowsProps {
  item: ShowTypes;
}

const ProgrammeShowsChild = React.forwardRef<
  HTMLDivElement,
  ProgrammeShowsProps
>(function ShowListingChild({ item }, ref) {
  const t = useTranslations();
  const hasPicture = item.image;
  const showContentClass = hasPicture
    ? "pr-3 pl-4 lg:pl-12 space-y-2"
    : "pl-[5rem] lg:pl-[11rem] pr-3 space-y-2";

  // Construct full image URL from backend
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    // If path already includes http/https, return as is
    if (imagePath.startsWith("http")) return imagePath;
    // If path starts with /, it already includes /uploads/
    if (imagePath.startsWith("/")) return `${CMS_URL}${imagePath}`;
    // Otherwise, it's just a filename - add /uploads/ prefix
    return `${CMS_URL}/uploads/${imagePath}`;
  };

  const imageUrl = getImageUrl(item.image);

  return (
    <div key={item.id} ref={ref}>
      <Link
        className="group flex items-center flex-row border rounded-xl border-blue-600 bg-white hover:bg-thf-blue-500 hover:text-white font-mono duration-200 h-20 lg:h-32 relative"
        href={`/shows/${item.slug}`}
      >
        {imageUrl && (
          <div className="group relative flex h-full justify-around imageHover">
            <div className="relative w-16 lg:w-32">
              <Image
                quality={50}
                src={imageUrl}
                fill
                sizes="(max-width: 768px) 64px, 128px"
                className="object-cover rounded-l-xl"
                alt={item.title}
              />
            </div>
          </div>
        )}
        <div className={showContentClass}>
          <h4>{item.title}</h4>
          {item.teaserSentence && (
            <p className="hidden lg:block">{item.teaserSentence}</p>
          )}
        </div>
        {item.activeShow && (
          <div
            className="absolute -top-2 right-2 bg-thf-blue-500 rounded-xl text-white py-1 px-2 text-xs lg:text-sm
        "
          >
            <p>{t("ongoing")}</p>
          </div>
        )}
      </Link>
    </div>
  );
});

export default ProgrammeShowsChild;
