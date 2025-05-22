// Convert attribute ID to kebab-case for URLs
export function toKebabCase(str: string): string {
	// Handle camelCase
	const fromCamel = str.replace(/([a-z])([A-Z])/g, '$1-$2');
	// Handle snake_case
	const fromSnake = fromCamel.replace(/_/g, '-');
	// Convert to lowercase
	return fromSnake.toLowerCase();
}
