export function fieldMessage(subject: string, message: string) {
  const text = /^[a-z]/.test(message) ? `${subject} ${message}` : message;
  return text.endsWith(".") ? text : `${text}.`;
}
