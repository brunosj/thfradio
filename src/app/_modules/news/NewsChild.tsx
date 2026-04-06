import React from "react";
import type { NewsType } from "@/types/ResponsesInterface";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { CMS_URL } from "@/utils/constants";
import { formatDate } from "@/utils/formatDate";

interface NewsProps {
  item: NewsType;
}

const NewsChild: React.FC<NewsProps> = ({ item }) => {
  const formattedDate = formatDate(item.date);

  // Construct full image URL from backend
  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/")) return `${CMS_URL}${imagePath}`;
    return `${CMS_URL}/uploads/${imagePath}`;
  };

  if (!item.image) {
    return (
      <div className=" text-white rounded-xl" id={item.slug}>
        <div className="relative pt-6 bg-thf-blue-500">
          <div className="absolute top-0 left-0 h-8 w-1/3 lg:w-1/4 bg-orange-500 text-white text-sm flex justify-center rounded-br-xl items-center">
            <p>{formattedDate}</p>
          </div>
          <div className="space-y-6 p-6">
            <h2>{item.title}</h2>
            <div className="markdown">
              <ReactMarkdown>{item.text}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className=" text-white rounded-xl" id={item.slug}>
      <div className="relative w-full h-48 lg:h-72 aspect-video">
        <Image
          quality={50}
          src={getImageUrl(item.image) || ""}
          fill
          sizes="(max-width: 768px) 100vw, 672px"
          className="object-contain object-center rounded-t-xl aspect-video p-4"
          alt={item.title}
        />
      </div>
      <div className="relative pt-6 bg-thf-blue-500">
        <div className="absolute top-0 left-0 h-8 w-1/3 lg:w-1/4 bg-orange-500 text-white text-sm flex justify-center rounded-br-xl items-center">
          <p>{formattedDate}</p>
        </div>
        <div className="space-y-6 p-6">
          <h2>{item.title}</h2>
          <div className="markdown">
            <ReactMarkdown>{item.text}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsChild;
