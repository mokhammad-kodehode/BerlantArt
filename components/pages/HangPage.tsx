import { FittingRoom } from "@/components/gallery/FittingRoom";
import { Header } from "@/components/layout/Header";
import { clientEnv } from "@/lib/env";

/**
 * «Повесить у себя» из меню (заказчик, 23.10.2026): та же примерочная, что
 * открывается со страницы работы, только картина ещё не выбрана — на стене
 * пустое место, в панели список работ.
 *
 * Страница не ходит в базу: список берёт браузер из общего файла
 * /api/artwork-thumbs, выбор живёт в адресе (`?work=…&frame=…`). Поэтому
 * она собирается один раз и отдаётся готовой, без пересборки после правок
 * в админке — обновляется сам список.
 *
 * Шапка сайта — обычная, как у остальных разделов: это пункт меню, и путь
 * дальше должен быть под рукой. Подвала нет, как и у примерочной работы, —
 * его прячет CSS по классу `.fit` (globals.css, .site-footer).
 */
export function HangPage() {
  return (
    <>
      <Header />
      <main>
        <FittingRoom
          entry="hang"
          work={null}
          siteUrl={clientEnv.NEXT_PUBLIC_SITE_URL}
          whatsappPhone={clientEnv.NEXT_PUBLIC_WHATSAPP_PHONE}
        />
      </main>
    </>
  );
}
