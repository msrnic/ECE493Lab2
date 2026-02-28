export function renderViewState(bannerElement, state) {
  if (!bannerElement) {
    return;
  }

  const status = state?.status ?? 'idle';
  const message = state?.message ?? '';

  bannerElement.dataset.state = status;
  bannerElement.textContent = message;
}
