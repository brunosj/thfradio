import LatestArchiveSection from '@/modules/archive/LatestArchiveSection';
import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
type Params = Promise<{ locale: string }>;

// Revalidate this page every 12 hours (same as API cache)
export const revalidate = 43200;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const isGerman = locale === 'de';
  return createMetadata({
    title: isGerman ? 'Archiv | THF Radio' : 'Archive | THF Radio',
    description: isGerman
      ? 'Durchsuche das THF Radio Archiv.'
      : 'Browse the THF Radio archive.',
  });
}
export default async function LatestPage({ params }: { params: Params }) {
  const { locale } = await params;
  const isGerman = locale === 'de';

  return (
    <main className='min-h-[80lvh]'>
      <div className='bg-thf-blue-500 relative pt-6 lg:pt-10'>
        <div className='layout sectionPy'>
          <h1 className='text-white text-center'>
            {isGerman ? 'Archiv' : 'Archive'}
          </h1>
        </div>
      </div>
      <LatestArchiveSection
        title=''
        text={
          isGerman
            ? 'Stoebere in unserem Archiv vergangener Shows.'
            : 'Browse our archive of past shows.'
        }
        backgroundColor='bg-dark-blue'
      />
    </main>
  );
}
