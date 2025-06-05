import { useEffect, useState } from 'react'
import { LuChevronUp } from 'react-icons/lu'

export function ReturnToTop(): React.JSX.Element {
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		const toggleVisibility = (): void => {
			if (window.scrollY > window.innerHeight) {
				setVisible(true)
			} else {
				setVisible(false)
			}
		}

		window.addEventListener('scroll', toggleVisibility)

		return () => {
			window.removeEventListener('scroll', toggleVisibility)
		}
	}, [])

	const scrollToTop = (): void => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		})
		setVisible(false)
	}

	if (!visible) {
		return <></>
	}

	return (
		<div className="fixed bottom-5 right-5 z-50">
			<button
				type="button"
				onClick={scrollToTop}
				className="inline-flex items-center rounded-md bg-backgroundSecondary border border-accent p-2 text-accent shadow-sm hover:bg-backgroundSecondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
			>
				<LuChevronUp className="h-5 w-5" aria-hidden="true" />
			</button>
		</div>
	)
}
