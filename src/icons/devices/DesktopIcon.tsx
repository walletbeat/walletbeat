import type { FC, SVGProps } from 'react';

export const DesktopIcon: FC<SVGProps<SVGSVGElement>> = props => (
	<svg
		width='24'
		height='24'
		viewBox='0 0 24 24'
		fill='none'
		xmlns='http://www.w3.org/2000/svg'
		{...props}
	>
		<path
			d='M18 3.75H2C0.9 3.75 0 4.65 0 5.75V16.75C0 17.85 0.9 18.75 2 18.75H5L4 19.75V21.75H16V19.75L15 18.75H18C19.1 18.75 20 17.85 20 16.75V5.75C20 4.65 19.1 3.75 18 3.75ZM18 16.75H2V5.75H18V16.75Z'
			fill='currentColor'
		/>
	</svg>
);
