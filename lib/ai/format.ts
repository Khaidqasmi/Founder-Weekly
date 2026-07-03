/**
 * Safety net in case the model ignores the "no markdown" instruction in the
 * system prompt — strips bold/heading/bullet markdown syntax so the chat
 * widget always renders plain professional text.
 */
export function sanitizeAIAnswer(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[ \t]*[-*•][ \t]+/gm, '')
    .replace(/`{1,3}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
