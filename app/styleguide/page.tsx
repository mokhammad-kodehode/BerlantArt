import type { Metadata } from "next";

import { Header } from "@/components/layout/Header";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Tag } from "@/components/ui/Tag";

/**
 * Витрина дизайн-системы: все токены и примитивы на одном экране.
 *
 * Служебная страница для сверки при вёрстке — не для посетителей. На этапе 8
 * закрывается от индексации и от прода.
 */
export const metadata: Metadata = {
  title: "Дизайн-система",
  robots: { index: false, follow: false },
};

const ramps = [
  {
    name: "neutral",
    steps: [
      ["100", "#f9f4ed"],
      ["200", "#eee7db"],
      ["300", "#dcd3c4"],
      ["400", "#c0b6a5"],
      ["500", "#a19786"],
      ["600", "#82796a"],
      ["700", "#645c50"],
      ["800", "#474238"],
      ["900", "#2e2b25"],
    ],
  },
  {
    name: "accent (сиена)",
    steps: [
      ["100", "#fff2eb"],
      ["200", "#ffe1d0"],
      ["300", "#ffc6a5"],
      ["400", "#f6a06b"],
      ["500", "#d67f48"],
      ["600", "#b2622d"],
      ["700", "#8c491a"],
      ["800", "#643312"],
      ["900", "#402310"],
    ],
  },
  {
    name: "accent-2 (олива)",
    steps: [
      ["100", "#f0fae1"],
      ["200", "#e1eecc"],
      ["300", "#ccdbb2"],
      ["400", "#aebf92"],
      ["500", "#8fa073"],
      ["600", "#728157"],
      ["700", "#56633f"],
      ["800", "#3d472b"],
      ["900", "#272e1b"],
    ],
  },
] as const;

const roles = [
  ["bg", "#f5ead8", "фон страницы"],
  ["surface", "#ebddc5", "карточки, поля ввода"],
  ["ink", "#201e1d", "текст"],
  ["accent", "#c67139", "основной акцент"],
  ["accent-2", "#7a8a5e", "второй акцент"],
] as const;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--color-divider)] py-12 first:border-t-0">
      <h2 className="mt-0 mb-6 text-[22px]">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <>
      <Header />
      <main>
        <Container className="py-12">
          <h1 className="mt-0 mb-2">Дизайн-система</h1>
          <p className="text-ink/75 mb-0 max-w-[60ch]">
            Токены и компоненты, перенесённые из макета. Эталон —{" "}
            <code className="bg-surface rounded px-1.5 py-0.5 text-[13px]">
              design/tokens/organic.css
            </code>
            , страницы-образцы лежат в{" "}
            <code className="bg-surface rounded px-1.5 py-0.5 text-[13px]">design/mockups/</code>.
          </p>
        </Container>

        <Container>
          <Block title="Цветовые роли">
            <div className="flex flex-wrap gap-4">
              {roles.map(([name, hex, note]) => (
                <div key={name} className="w-[168px]">
                  <div
                    className="rounded-tile h-16 border border-[var(--color-divider)]"
                    style={{ background: hex }}
                  />
                  <p className="mt-2 mb-0 text-[13px] font-semibold">{name}</p>
                  <p className="text-ink/60 m-0 text-[12px]">{hex}</p>
                  <p className="text-ink/60 m-0 text-[12px]">{note}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Тональные ряды">
            <div className="flex flex-col gap-6">
              {ramps.map((ramp) => (
                <div key={ramp.name}>
                  <p className="mt-0 mb-2 text-[13px] font-semibold">{ramp.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ramp.steps.map(([step, hex]) => (
                      <div key={step} className="w-[76px]">
                        <div
                          className="h-12 rounded-md border border-[var(--color-divider)]"
                          style={{ background: hex }}
                        />
                        <p className="text-ink/60 m-0 mt-1 text-[11px]">
                          {step} · {hex}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Типографика">
            <p className="text-ink/60 mb-6 max-w-[60ch] text-[13px]">
              Заголовки — Literata, текст — Manrope. В макете стояли Caprasimo и Figtree; заменены
              потому, что ни один из них не имеет кириллицы.
            </p>
            <div className="flex flex-col gap-3">
              <h1 className="m-0">Заголовок H1 — 42px</h1>
              <h2 className="m-0">Заголовок H2 — 32px</h2>
              <h3 className="m-0">Заголовок H3 — 25px</h3>
              <h4 className="m-0">Заголовок H4 — 20px</h4>
              <p className="m-0 max-w-[60ch]">
                Основной текст, 15px с интерлиньяжем 1.55. Пишет маслом и акрилом с 2020 года —
                взявшись за кисть в 55 лет, она прошла путь от первых этюдов до признания.
              </p>
              <p className="text-ink/55 m-0 text-[13px]">
                Приглушённый текст — подписи, метаданные работ.
              </p>
            </div>
          </Block>

          <Block title="Кнопки">
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/styleguide" variant="primary">
                Основная
              </ButtonLink>
              <ButtonLink href="/styleguide" variant="secondary">
                Вторичная
              </ButtonLink>
              <ButtonLink href="/styleguide" variant="ghost">
                Призрачная →
              </ButtonLink>
              <ButtonLink href="/styleguide" variant="primary" size="lg">
                Крупная
              </ButtonLink>
              <Button disabled>Выключена</Button>
            </div>
            <div className="rounded-tile mt-4 bg-neutral-900 p-5">
              <ButtonLink href="/styleguide" variant="onDark">
                Поверх тёмного фона
              </ButtonLink>
            </div>
          </Block>

          <Block title="Метки">
            <div className="flex flex-wrap items-center gap-3">
              <Tag tone="accent">Акцент</Tag>
              <Tag tone="accent2">Доступна</Tag>
              <Tag tone="neutral">Продана</Tag>
              <Tag tone="outline">Контурная</Tag>
            </div>
          </Block>

          <Block title="Карточки и высота">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="card elev-sm">
                <div className="relative aspect-4/5 overflow-hidden rounded-[20px]">
                  <ArtworkImage alt="Утренний свет" sizes="300px" />
                </div>
                <p className="card-title mt-3 mb-0">Утренний свет</p>
                <p className="card-body">Холст, масло · 50×70 см</p>
                <ButtonLink href="/styleguide" variant="secondary" block>
                  Запросить цену
                </ButtonLink>
              </div>
              <div className="card elev-md">
                <span className="card-kicker">Кикер</span>
                <p className="card-title m-0">Карточка elev-md</p>
                <p className="card-body">Средняя тень — для приподнятых блоков.</p>
              </div>
              <div className="card elev-lg">
                <p className="card-title m-0">Карточка elev-lg</p>
                <p className="card-body">Крупная тень — для диалогов и всплывающих слоёв.</p>
              </div>
            </div>
          </Block>

          <Block title="Формы">
            <div className="flex max-w-[480px] flex-col gap-5">
              <div className="field">
                <label htmlFor="sg-name">Имя</label>
                <input id="sg-name" className="input" placeholder="Как к вам обращаться" />
              </div>
              <div className="field">
                <label htmlFor="sg-msg">Сообщение</label>
                <textarea
                  id="sg-msg"
                  className="input"
                  rows={4}
                  placeholder="Расскажите, что вас интересует"
                />
              </div>
              <div className="field">
                <label>Тема обращения</label>
                <div className="seg w-full">
                  <label className="seg-opt flex-1 justify-center">
                    <input type="radio" name="sg-topic" defaultChecked />
                    <span>Покупка</span>
                  </label>
                  <label className="seg-opt flex-1 justify-center">
                    <input type="radio" name="sg-topic" />
                    <span>Заказ</span>
                  </label>
                  <label className="seg-opt flex-1 justify-center">
                    <input type="radio" name="sg-topic" />
                    <span>Другое</span>
                  </label>
                </div>
              </div>
            </div>
          </Block>

          <Block title="Приёмы оформления">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mt-0 mb-2 text-[13px] font-semibold">
                  panel-dashed — пустое состояние
                </p>
                <div className="panel-dashed p-8">
                  <h3 className="mt-0 mb-2">Пока ничего нет</h3>
                  <p className="text-ink/70 m-0">
                    Так показываются разделы без данных: выставки, пресса, отзывы.
                  </p>
                </div>
              </div>
              <div>
                <p className="mt-0 mb-2 text-[13px] font-semibold">
                  washed — фильтр для репродукций
                </p>
                <div className="flex gap-3">
                  <div className="rounded-tile relative aspect-3/4 w-1/2 overflow-hidden">
                    <ArtworkImage alt="Без фильтра" sizes="200px" />
                  </div>
                  <div className="washed rounded-tile relative aspect-3/4 w-1/2 overflow-hidden">
                    <ArtworkImage alt="washed" sizes="200px" />
                  </div>
                </div>
              </div>
            </div>
          </Block>

          <Block title="Радиусы">
            <div className="flex flex-wrap gap-4">
              {[
                ["rounded-pill", "999px", "кнопки, метки, поля"],
                ["rounded-tile", "16px", "мелкие плитки"],
                ["rounded-card", "32px", "карточки"],
                ["rounded-panel", "40px", "крупные панели"],
              ].map(([cls, value, note]) => (
                <div key={cls} className="w-[168px]">
                  <div className={`bg-surface h-16 ${cls}`} />
                  <p className="mt-2 mb-0 text-[13px] font-semibold">{cls}</p>
                  <p className="text-ink/60 m-0 text-[12px]">
                    {value} · {note}
                  </p>
                </div>
              ))}
            </div>
          </Block>
        </Container>
      </main>
    </>
  );
}
