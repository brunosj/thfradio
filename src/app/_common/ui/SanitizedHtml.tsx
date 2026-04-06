import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";

type Props = {
  html: string;
  className?: string;
};

export default function SanitizedHtml({ html, className }: Props) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(html) }}
    />
  );
}
