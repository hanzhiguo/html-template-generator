let toastElement = null;

export function showToast(message, isError = false) {
  if (toastElement) toastElement.remove();
  toastElement = document.createElement('div');
  toastElement.className = 'toast' + (isError ? ' error' : '');
  toastElement.textContent = message;
  document.body.appendChild(toastElement);
  setTimeout(() => {
    if (toastElement) { toastElement.remove(); toastElement = null; }
  }, 3000);
}
