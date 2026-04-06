import ReactMarkdown from "react-markdown";
import SanitizedHtml from "@/common/ui/SanitizedHtml";
import type { PageTypes } from "@/types/ResponsesInterface";

type Props = {
  page: PageTypes;
  proseClassName?: string;
};

export default function CmsPageBody({
  page,
  proseClassName = "prose prose-lg mt-8 text-white max-w-none",
}: Props) {
  const html = page.content?.trim();
  if (html) {
    return (
      <div className={proseClassName}>
        <SanitizedHtml html={html} />
      </div>
    );
  }
  return (
    <div className="prose prose-lg mt-8 text-white">
      <ReactMarkdown>{page.description ?? ""}</ReactMarkdown>
    </div>
  );
}
