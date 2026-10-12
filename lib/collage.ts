/**
 * Раскладка коллажа работ: на сколько столбцов и строк встаёт каждая плитка.
 *
 * Живёт отдельно от разметки, потому что это единственное место на странице,
 * где есть настоящая логика, и сломать её можно незаметно: неверные размахи
 * оставляют в стене чёрную дыру, а увидишь её только тем числом работ,
 * с которым не проверял. Поэтому у функции есть тест (lib/collage.test.ts).
 *
 * Два правила, из которых всё остальное следует:
 *
 * 1. Сумма занятых клеток делится на число столбцов — тогда последняя строка
 *    полная и дыр в стене нет ни при каком числе работ.
 * 2. Плитки держатся близко к квадрату. Плитка проверена глазами: холст
 *    335×597 в ячейке 4:1 превращался в горизонтальную полоску, по которой
 *    работу не узнать. Ориентацию холста мы заранее не знаем — ширины
 *    и высоты в базе нет, — поэтому ячейки делаются такими, чтобы обрезка
 *    была терпимой для любого холста.
 */

/** Сколько столбцов и строк занимает одна плитка. */
type Span = { cols: number; rows: number };

/** Плитка коллажа: классы сетки и реальная ширина отрисовки для `sizes`. */
export type CollageTile = {
  className: string;
  sizes: string;
};

const MOBILE_COLUMNS = 2;
const DESKTOP_COLUMNS = 4;

/**
 * Блок из пяти плиток, заполняющий 4 столбца × 2 строки без остатка: крупная
 * работа слева и четыре поменьше справа. Все ячейки близки к квадрату, а
 * разница в размере как раз и делает стену коллажем, а не ровной сеткой.
 */
const DESKTOP_BLOCK: Span[] = [
  { cols: 2, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
];

/**
 * Тот же блок зеркально: крупная работа справа. Полные блоки чередуются —
 * крупная слева, крупная справа, — по просьбе заказчика: одинаковые блоки
 * подряд читались как повторяющийся узор, а не как стена картин.
 *
 * Порядок плиток здесь существенен: сетка расставляет их по очереди слева
 * направо, и только так две мелкие встают слева в первой строке, крупная —
 * справа на две строки, а оставшиеся две — под первыми двумя.
 */
const DESKTOP_BLOCK_MIRRORED: Span[] = [
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
  { cols: 2, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
];

/**
 * Блок из шести — на случай, когда работ на одну больше, чем полных
 * пятёрок: две крупные сверху, четыре поменьше снизу, ровно три строки.
 *
 * Нужен потому, что «пятёрка плюс одна» отдавала последней работе полосу
 * 4×2 во всю ширину: на шести работах под коллажем выходила пустая лента,
 * и это первым заметил заказчик. Здесь все шесть остаются квадратными.
 */
const DESKTOP_SIX: Span[] = [
  { cols: 2, rows: 2 },
  { cols: 2, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
];

/**
 * Остаток от неполного блока — всегда целым числом строк.
 *
 * Одна оставшаяся работа занимает 4×2, а не 4×1: при высоте в одну строку
 * получилась бы полоса 4.4:1, от картины в ней остаётся узкий поясок. Это
 * случай единственной работы во всей галерее; когда до неё есть полные
 * блоки, в дело вступает DESKTOP_SIX.
 */
const DESKTOP_TAILS: Record<number, Span[]> = {
  1: [{ cols: 4, rows: 2 }],
  2: [
    { cols: 2, rows: 2 },
    { cols: 2, rows: 2 },
  ],
  3: [
    { cols: 2, rows: 1 },
    { cols: 1, rows: 1 },
    { cols: 1, rows: 1 },
  ],
  4: [
    { cols: 2, rows: 2 },
    { cols: 1, rows: 1 },
    { cols: 1, rows: 1 },
    { cols: 2, rows: 1 },
  ],
};

/*
  Классы перечислены явными словарями, а не собираются строкой вида
  `col-span-${n}`: Tailwind ищет имена классов по исходникам буквально,
  и собранное на ходу имя в сборку не попадёт — стена молча развалится.
*/
const mobileColClass: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
};

const mobileRowClass: Record<number, string> = {
  1: "row-span-1",
  2: "row-span-2",
};

const desktopColClass: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  4: "md:col-span-4",
};

const desktopRowClass: Record<number, string> = {
  1: "md:row-span-1",
  2: "md:row-span-2",
};

/**
 * На телефоне коллажа нет — там два столбца ровных квадратов: плитка шириной
 * в четверть экрана на 375px ужалась бы до 88px, и разглядеть живопись
 * в ней было бы нельзя.
 *
 * Крупная работа (`isLarge`) занимает оба столбца и две строки — квадрат во
 * всю ширину. Если перед ней стоит одна мелкая, справа от мелкой осталась бы
 * пустая клетка; её закрывает следующая мелкая — сетка на телефоне идёт
 * с `grid-flow-row-dense` (components/gallery/ArtworkCollage.tsx). Поэтому
 * достаточно, чтобы мелких было чётное число: при нечётном последняя мелкая
 * тоже становится квадратом во всю ширину, а не оставляет дыру в конце.
 */
function mobileSpans(isLarge: readonly boolean[]): Span[] {
  const smallCount = isLarge.filter((large) => !large).length;
  const lastSmall = isLarge.lastIndexOf(false);

  return isLarge.map((large, index) => {
    const isLoneLast = smallCount % 2 === 1 && index === lastSmall;
    return large || isLoneLast ? { cols: 2, rows: 2 } : { cols: 1, rows: 1 };
  });
}

function desktopSpans(count: number): Span[] {
  const blockSize = DESKTOP_BLOCK.length;
  let blocks = Math.floor(count / blockSize);
  const rest = count % blockSize;

  // Одна лишняя работа при непустом коллаже: последняя пятёрка вместе с ней
  // раскладывается как шестёрка — иначе ей достаётся полоса во всю ширину.
  const sixAtEnd = rest === 1 && blocks > 0;
  if (sixAtEnd) blocks -= 1;

  const spans: Span[] = [];
  for (let i = 0; i < blocks; i += 1) {
    spans.push(...(i % 2 === 0 ? DESKTOP_BLOCK : DESKTOP_BLOCK_MIRRORED));
  }
  if (sixAtEnd) spans.push(...DESKTOP_SIX);
  else if (rest > 0) spans.push(...DESKTOP_TAILS[rest]);

  return spans;
}

const isHero = (span: Span): boolean => span.cols === 2 && span.rows === 2;

/**
 * Ставит крупные работы в крупные ячейки компьютерного коллажа.
 *
 * Сама сетка блоков не меняется — она проверена тестом на отсутствие дыр
 * при любом числе работ. Меняется только порядок: отмеченная работа
 * переезжает в ближайшую свободную крупную ячейку, не раньше предыдущей
 * отмеченной, чтобы отмеченные шли в своём порядке. Остальные работы
 * занимают оставшиеся места в исходном порядке.
 *
 * Крупных ячеек — одна на каждые пять работ. Отмеченных больше — лишние
 * остаются мелкими на компьютере (на телефоне они всё равно крупные);
 * об этом предупреждает подсказка у переключателя в админке.
 */
function arrange<T extends { isLarge: boolean }>(items: readonly T[], desktop: Span[]): T[] {
  const heroSlots = desktop.flatMap((span, index) => (isHero(span) ? [index] : []));
  const placed: (T | undefined)[] = Array.from({ length: items.length }, () => undefined);
  const rest: T[] = [];
  let lastSlot = -1;

  for (const [index, item] of items.entries()) {
    const free = heroSlots.filter((slot) => slot > lastSlot && placed[slot] === undefined);
    if (!item.isLarge || free.length === 0) {
      rest.push(item);
      continue;
    }

    const slot = free.reduce((best, candidate) =>
      Math.abs(candidate - index) < Math.abs(best - index) ? candidate : best,
    );
    placed[slot] = item;
    lastSlot = slot;
  }

  return placed.map((item) => item ?? rest.shift()).filter((item) => item !== undefined);
}

/**
 * Раскладка коллажа: порядок работ и плитка для каждой.
 *
 * Возвращает работы уже в том порядке, в каком их выводить: крупные могли
 * переехать в крупные ячейки (`arrange`). Порядок общий для телефона
 * и компьютера — разметка одна.
 *
 * `sizes` считается из размаха, а не пишется одним значением на всё: крупная
 * плитка занимает полэкрана, мелкая — четверть, и без этого браузер качал бы
 * для мелкой плитки файл вчетверо крупнее нужного.
 */
export function collageLayout<T extends { isLarge: boolean }>(
  items: readonly T[],
): (CollageTile & { item: T })[] {
  const desktop = desktopSpans(items.length);
  const ordered = arrange(items, desktop);
  const mobile = mobileSpans(ordered.map((item) => item.isLarge));

  return ordered.map((item, index) => {
    const mobileSpan = mobile[index];
    const desktopSpan = desktop[index];

    return {
      item,
      className: [
        mobileColClass[mobileSpan.cols],
        mobileRowClass[mobileSpan.rows],
        desktopColClass[desktopSpan.cols],
        desktopRowClass[desktopSpan.rows],
      ].join(" "),
      // Стена идёт во всю ширину окна, поэтому доля столбца — это доля vw.
      sizes: `(max-width: 767px) ${(100 / MOBILE_COLUMNS) * mobileSpan.cols}vw, ${(100 / DESKTOP_COLUMNS) * desktopSpan.cols}vw`,
    };
  });
}
