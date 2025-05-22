import type * as React from 'react';

export const MobileIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M16 1.75H8C6.34 1.75 5 3.09 5 4.75V20.75C5 22.41 6.34 23.75 8 23.75H16C17.66 23.75 19 22.41 19 20.75V4.75C19 3.09 17.66 1.75 16 1.75ZM14 21.75H10V20.75H14V21.75ZM17.25 18.75H6.75V4.75H17.25V18.75Z'
      fill='currentColor'
    />
  </svg>
);
