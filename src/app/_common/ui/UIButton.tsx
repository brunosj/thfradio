'use client';

import { Link } from '@/i18n/routing';
import type { Button as ButtonProps } from '@/types/uiInterface';
import clsx from 'clsx';

const baseClass =
  'inline-flex font-mono rounded-xl text-sm shadow-sm border border-dark-blue px-4 py-2 cursor-pointer';

const Button = ({
  children,
  path,
  color,
  className,
  ariaLabel,
  onClick,
}: ButtonProps & {
  onClick?: (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => void;
}) => {
  const isExternal = path.slice(0, 4) === 'http';
  const isAnchor = path.startsWith('#');

  const classNames = clsx(baseClass, className, {
    'bg-white duration-300 hover:bg-orange-500 hover:text-white':
      color === 'white-orange',
    'bg-white duration-300 hover:bg-thf-blue-500 hover:text-white':
      color === 'white-blue',
    'bg-thf-blue-500 text-white duration-300 hover:bg-white hover:text-thf-blue-500':
      color === 'blue',
  });

  if (isExternal) {
    return (
      <a
        href={path}
        rel='noopener noreferrer'
        target='_blank'
        className={classNames}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  if (isAnchor) {
    return (
      <a href={path} className={classNames} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={path} className={classNames} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </Link>
  );
};

export default Button;