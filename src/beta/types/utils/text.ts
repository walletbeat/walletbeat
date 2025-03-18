// Text manipulation utility functions.

/**
 * Slugify a camelCaseString into a-slug-like-this.
 */
export function slugifyCamelCase(camelCaseString: string): string {
  return camelCaseString
    .replaceAll('_', '-')
    .replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

/**
 * Return the prefix to use before a list item in a comma-separated list.
 * For example, ["a", "b", "c", "d"] would be written as "a, b, c and d".
 * @param index The index of the element being rendered.
 * @param listSize The total size of the list.
 * @returns The prefix to use before the element.
 */
export function commaListPrefix(index: number, listSize: number): '' | ', ' | ' and ' {
  if (index === 0) {
    return '';
  }
  return index < listSize - 1 ? ', ' : ' and ';
}

/**
 * Format a list of strings into a comma-separated list.
 * Null values, undefined values, and empty strings are ignored.
 */
export function commaListFormat(items: Array<string | null | undefined>): string {
  const filtered = items.filter(item => typeof item === 'string' && item !== '');
  return filtered.map((item, i) => `${commaListPrefix(i, filtered.length)}${item}`).join('');
}

/**
 * Trim longest shared whitespace prefix in all non-whitespace-only lines.
 *
 * Useful to make Markdown text properly indented in source code, yet
 * rendered correctly when passed to the Markdown renderer which assumes
 * no indentation in its input.
 */
export function trimWhitespacePrefix(str: string): string {
  const lines = str.split('\n');
  let longestCommonPrefix: string | null = null;
  for (const line of lines) {
    if (line.trim() === '') {
      continue; // Ignore whitespace-only lines.
    }
    const whitespacePrefixReg = /^\s+/.exec(line);
    if (whitespacePrefixReg === null) {
      return str; // No common whitespace prefix. Short circuit.
    }
    let whitespacePrefix = whitespacePrefixReg[0];
    if (longestCommonPrefix === null) {
      // First non-whitespace-only line.
      // Set the common prefix to the current one.
      longestCommonPrefix = whitespacePrefix;
      continue;
    }
    if (whitespacePrefix.length > longestCommonPrefix.length) {
      // Trim to match length of common prefix.
      whitespacePrefix = whitespacePrefix.substring(0, longestCommonPrefix.length);
    } else if (whitespacePrefix.length < longestCommonPrefix.length) {
      // Trim to match length of current line prefix.
      longestCommonPrefix = longestCommonPrefix.substring(0, whitespacePrefix.length);
    }
    if (whitespacePrefix !== longestCommonPrefix) {
      return str; // No common whitespace prefix. Short circuit.
    }
  }
  if (longestCommonPrefix === null || longestCommonPrefix === '') {
    return str;
  }
  return lines
    .map(line =>
      line.startsWith(longestCommonPrefix) ? line.substring(longestCommonPrefix.length) : line
    )
    .join('\n');
}
