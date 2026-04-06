import { Metadata } from "next";
import { createMetadata } from "@/utils/metadata";
import { fetchPageBySlug } from "@/lib/pages";
import { metadataFromPage } from "@/lib/metadataPlainText";
import { notFound } from "next/navigation";
import CmsPageBody from "@/common/ui/CmsPageBody";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await fetchPageBySlug("privacy", locale);
  return createMetadata(metadataFromPage(page));
}

export default async function PrivacyPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page = await fetchPageBySlug("privacy", locale);

  if (!page) {
    notFound();
  }

  return (
    <div className="bg-dark-blue min-h-screen">
      <div className="layout sectionPy">
        <h1 className="text-white">{page.title}</h1>
        <CmsPageBody page={page} />
      </div>
    </div>
  );
}
