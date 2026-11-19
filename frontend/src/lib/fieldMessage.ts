// The backend sends some field errors as the end of a sentence ("is required", "is incorrect").
// This turns them into a full sentence for the screen: fieldMessage("First name", "is required")
// → "First name is required." Messages that are already full sentences are kept.
export function fieldMessage(subject: string, message: string) {
  const text = /^[a-z]/.test(message) ? `${subject} ${message}` : message;
  return text.endsWith(".") ? text : `${text}.`;
}
