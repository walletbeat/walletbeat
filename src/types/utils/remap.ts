/**
 * Remap the values of an object. Guarantees that the new object will have
 * the same keys.
 * @param obj The object to remap.
 * @param map The mapping function.
 * @returns The remapped object.
 */
export function remap<R1 extends Record<K, V1>, V2, K extends string | number | symbol, V1>(
	obj: R1,
	map: (k: K, v: V1) => V2,
): { [k in keyof R1]: V2 } {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- entries() widens to string/unknown; R1 extends Record<K, V1> so keys and values match at runtime.
	return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, map(k as K, v as V1)]))
}
