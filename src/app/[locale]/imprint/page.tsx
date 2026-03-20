import type { PageTypes } from "@/types/ResponsesInterface";
import { Metadata } from "next";
import { createMetadata } from "@/utils/metadata";
import { fetchPageBySlug } from "@/lib/pages";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page: PageTypes = await fetchPageBySlug("imprint", locale);
  return createMetadata({
    title: page.title,
    description: page.description,
  });
}

export default async function ImprintPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page: PageTypes = await fetchPageBySlug("imprint", locale);

  if (!page) {
    notFound();
  }

  console.log("Imprint page content:", page);
  return (
    <div className="bg-dark-blue min-h-screen">
      <div className="layout sectionPy">
        <h1 className="text-white">{page.title}</h1>
        <div className="prose prose-lg mt-8 text-white">
          <ReactMarkdown>{page.description}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
