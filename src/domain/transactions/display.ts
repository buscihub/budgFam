// Normalized descriptions are UPPERCASE (§8.2): good for rules and dedup, loud
// on screen. This is only how they are shown ("CONAD PALERMO" -> "Conad
// Palermo"); the stored value is never changed. Words are split on spaces, so
// "AMZN MKTP IT*2X4" -> "Amzn Mktp It*2x4": imperfect for codes, harmless.
export function humanizeDescription(description: string): string {
  return description
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}
