import { useEffect } from 'react';

/**
 * Component to manage navigation state between page transitions
 * This helps prevent the entire UI from being recreated on navigation
 */
export function NavigationStateManager(): null {
	useEffect(() => {
		// Function to handle beforeunload event
		const handleBeforeUnload = (): void => {
			// Save scroll position
			if (window.scrollY > 0) {
				sessionStorage.setItem('scrollPosition', window.scrollY.toString());
			}
		};

		// Function for astro:page-load event
		const handlePageLoad = (): void => {
			// Restore scroll position if saved
			const scrollPosition = sessionStorage.getItem('scrollPosition');

			if (scrollPosition !== null && scrollPosition !== '') {
				window.scrollTo({
					top: parseInt(scrollPosition, 10),
					behavior: 'instant',
				});
				sessionStorage.removeItem('scrollPosition');
			}

			// Clean up any possible leaks from previous navigation
			document.body.style.overflow = '';
		};

		// Add event listeners
		window.addEventListener('beforeunload', handleBeforeUnload);
		document.addEventListener('astro:page-load', handlePageLoad);

		// Cleanup on unmount
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			document.removeEventListener('astro:page-load', handlePageLoad);
		};
	}, []);

	return null;
}
