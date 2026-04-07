import ReactMarkdown from 'react-markdown';
import SanitizedHtml from '@/common/ui/SanitizedHtml';

type SectionHeaderProps = {
  title: string;
  text: string;
  textHtml?: string;
};

const SectionHeader = ({ title, text, textHtml }: SectionHeaderProps) => {
  const components = {
    a: ({ ...props }) => (
      <a {...props} target='_blank' rel='noopener noreferrer' />
    ),
  };

  return (
    <div className='layout text-white text-center sectionPy max-w-4xl m-auto'>
      <h1 className='uppercase '>{title}</h1>
      {textHtml?.trim() ? (
        <div className='font-mono font-light markdown text-base lg:text-xl text-center'>
          <SanitizedHtml html={textHtml} />
        </div>
      ) : (
        <h4 className='font-mono font-light markdown '>
          <ReactMarkdown components={components}>{text}</ReactMarkdown>
        </h4>
      )}
    </div>
  );
};

export default SectionHeader;
