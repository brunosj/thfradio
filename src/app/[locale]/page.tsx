import CalendarSchedule from '@/modules/timetable_v2/CalendarSchedule';
import HomeArchiveSection from '@/modules/archive/HomeArchiveSection';

export const revalidate = 300;

type Params = Promise<{ locale: string }>;

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params;
  const isGerman = locale === 'de';

  return (
    <>
      <CalendarSchedule />
      <HomeArchiveSection
        title={isGerman ? 'Aus dem Archiv' : 'From the archive'}
        text={
          isGerman
            ? 'Hoere vergangene THF Radio Shows nach.'
            : 'Listen back to recent THF Radio shows.'
        }
      />
    </>
  );
}
