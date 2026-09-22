/**
 * Пометка «пришёл с панели управления».
 *
 * Живёт в sessionStorage, то есть на время вкладки: художница открывает
 * галерею из админки, смотрит сайт как посетитель и возвращается назад
 * по кнопке. Не в адресе страницы намеренно — иначе `?from=admin`
 * оставался бы в ссылке, которой она делится, и тянулся бы за каждым
 * фильтром галереи.
 *
 * Не через `document.referrer`: переход по ссылке внутри Next — мягкий,
 * документ не перезагружается, и referrer остаётся от самой первой
 * страницы.
 */
const KEY = "admin-return";

/** Событие для тех, кто показывает полосу возврата: sessionStorage сам
 * о себе не сообщает, а `storage` срабатывает только в соседних вкладках. */
const CHANGE_EVENT = "admin-return-change";

function notify(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Запомнить, что на публичный сайт вышли из админки. */
export function rememberAdminReturn(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // Приватный режим или запрет хранилища: полосы возврата не будет,
    // и это нестрашно — админка открывается по адресу /admin.
  }
  notify();
}

/** Забыть — после возврата в админку или отказа от полосы. */
export function forgetAdminReturn(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // См. выше: хранилище может быть недоступно.
  }
  notify();
}

/** Читает пометку. Возвращает null на сервере, где хранилища нет. */
export function readAdminReturn(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Подписка для useSyncExternalStore. */
export function subscribeAdminReturn(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
