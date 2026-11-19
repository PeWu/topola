/**
 * Turns a token of a style scheme, or the name of a text role, into a class
 * name: every character but letters, digits, `_` and `-` is dropped, and a
 * result that no class selector can start with (a digit, or `-` followed by a
 * digit or by nothing) gets a `_` in front.
 *
 * The chart builds the classes of marked elements and of links with this
 * function. CSS written for such tokens (`StyleScheme.palette`, the rules of
 * a node plug-in) has to build its selectors with it too, so that the two
 * agree.
 */
export function toClassToken(token: string): string {
  const clean = token.replace(/[^a-zA-Z0-9_-]/g, '');
  return /^(\d|-\d|-$)/.test(clean) ? `_${clean}` : clean;
}
