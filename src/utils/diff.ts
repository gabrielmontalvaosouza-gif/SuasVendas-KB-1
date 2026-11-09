export interface DiffLine {
  type: 'equal' | 'add' | 'remove';
  text: string;
}

/**
 * Computes a simple line-based diff between two text strings
 */
export function computeLineDiff(original: string, updated: string): DiffLine[] {
  const origLines = original.split('\n');
  const upLines = updated.split('\n');

  const diff: DiffLine[] = [];
  const maxLines = Math.max(origLines.length, upLines.length);

  let i = 0;
  let j = 0;

  while (i < origLines.length || j < upLines.length) {
    if (i < origLines.length && j < upLines.length) {
      if (origLines[i] === upLines[j]) {
        diff.push({ type: 'equal', text: origLines[i] });
        i++;
        j++;
      } else {
        // Check if next lines match
        if (i + 1 < origLines.length && origLines[i + 1] === upLines[j]) {
          diff.push({ type: 'remove', text: origLines[i] });
          i++;
        } else if (j + 1 < upLines.length && origLines[i] === upLines[j + 1]) {
          diff.push({ type: 'add', text: upLines[j] });
          j++;
        } else {
          diff.push({ type: 'remove', text: origLines[i] });
          diff.push({ type: 'add', text: upLines[j] });
          i++;
          j++;
        }
      }
    } else if (i < origLines.length) {
      diff.push({ type: 'remove', text: origLines[i] });
      i++;
    } else if (j < upLines.length) {
      diff.push({ type: 'add', text: upLines[j] });
      j++;
    }
  }

  return diff;
}
