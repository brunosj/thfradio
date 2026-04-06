import ReactMarkdown from 'react-markdown';
import Button from '@/common/ui/UIButton';
import SanitizedHtml from '@/common/ui/SanitizedHtml';
import type { AboutSection } from '@/types/ResponsesInterface';

type AboutSectionProps = AboutSection & {
  className?: string;
  /** When set, rendered as sanitized HTML instead of markdown `description`. */
  descriptionHtml?: string;
  /** Rich text links column (CMS); if set, shown in the right column instead of legacy `links`. */
  linksHtml?: string;
};

const AboutSection = ({
  title,
  description,
  descriptionHtml,
  button,
  links,
  linksHtml,
  acceptApplications,
  className,
}: AboutSectionProps) => {
  return (
    <section
      className={`layout bg-dark-blue sectionPb space-y-12 ${className}`}
    >
      <h1 className='text-white font-semibold'>{title}</h1>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-x-12 '>
        <div className='space-y-12'>
          <div className='text-white markdown'>
            {descriptionHtml?.trim() ? (
              <SanitizedHtml html={descriptionHtml} />
            ) : (
              <ReactMarkdown>{description ?? ''}</ReactMarkdown>
            )}
          </div>
          {acceptApplications && button && (
            <div className='flex space-x-6 pb-12'>
              {button.map((button, i) => (
                <Button
                  path={button.path}
                  key={i}
                  color={button.color ?? 'white-orange'}
                  ariaLabel={`Navigate to ${button.text}`}
                >
                  {button.text}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div>
          {linksHtml?.trim() ? (
            <div className='text-white markdown space-y-6'>
              <SanitizedHtml html={linksHtml} />
            </div>
          ) : links?.data && links.data.length > 0 ? (
            <div className='grid grid-cols-1 lg:grid-cols-2 w-full lg:w-2/3 m-auto space-y-12 lg:space-y-0'>
              {links.data.map((link, i) => (
                <div key={i} className='text-white markdown space-y-6'>
                  <h3 className=''>{link.title}</h3>
                  <ReactMarkdown>{link.links}</ReactMarkdown>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
