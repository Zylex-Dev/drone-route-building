/**
 * Lucide (CDN UMD): элементы с атрибутом data-lucide заменяются на SVG.
 * Вызов пересканирует весь document (UMD Lucide ≥0.525; опции root в createIcons нет).
 */
function refreshLucideIcons() {
  if (typeof lucide === 'undefined' || typeof lucide.createIcons !== 'function') {
    return;
  }
  try {
    lucide.createIcons();
  } catch (e) {
    console.warn('Lucide createIcons failed', e);
  }
}
