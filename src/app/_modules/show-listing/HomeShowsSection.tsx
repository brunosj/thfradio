import SectionHeader from "@/common/layout/section/SectionHeader";
import type { PictureType } from "@/types/ResponsesInterface";
import Button from "@/common/ui/UIButton";
import { useTranslations } from "next-intl";
interface ShowsProps {
  title: string;
  pictures: PictureType[];
  text: string;
  textHtml?: string;
}

const HomeShowSection = ({ title, text, textHtml }: ShowsProps) => {
  const t = useTranslations();

  return (
    <section className="bg-orange-500 sectionPb" id="shows">
      <SectionHeader title={title} text={text} textHtml={textHtml} />
      {/* <div className="layout">
        <ImageGallery items={pictures} />
      </div> */}
      <div className="flex justify-center">
        <Button path="/shows" color="white-blue">
          {t("allShows")}
        </Button>
      </div>
    </section>
  );
};

export default HomeShowSection;
