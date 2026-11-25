// Safe text for commands users copy into a terminal. Upstream names and ids are
// untrusted: they are never placed in `#` comments (interactive zsh does not
// treat `#` as a comment by default) and are always single-quoted.

/** Control characters, line separators and bidi overrides that could alter a pasted command or terminal. */
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g;

export function sanitiseText(value: string): string {
  return value.replace(UNSAFE, " ").trim();
}

/** POSIX single quoting; works in bash and zsh for any sanitised text. */
export function shellQuote(value: string): string {
  return `'${sanitiseText(value).replace(/'/g, "'\\''")}'`;
}

/** A line that shows text but does nothing when run (`:` is the shell no-op). */
export function shellNote(value: string): string {
  return `: ${shellQuote(value)}`;
}

/** GitHub `owner/name`, the only repository form the site renders or copies. */
export const REPO_PATH = /^[\w.-]+\/[\w.-]+$/;
