import Image from "next/image";

import { Header } from "@/components/layout/Header";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/site";

/**
 * Первый экран по макету design/mockups/Home.dc.html: слева текст на фоне
 * зала, справа фотография художницы на всю высоту до правого края окна.
 *
 * Видео со слайдами, которое раньше лежало здесь фоном, переехало в
 * отдельную секцию ниже (PaintingReel) — по просьбе заказчика.
 *
 * Компонент серверный: своего состояния у первого экрана больше нет.
 */
export function Hero() {
  return (
    <section className="bg-bg flex min-h-svh flex-col">
      {/* stage, а не solid: шапка прозрачная и не липкая — на первом экране
          она часть композиции, а высоту экрана делят она и две колонки. */}
      <Header variant="stage" />

      {/* На телефоне колонки встают друг под друга, и фото забирает всю
          оставшуюся высоту (строка 1fr): с фиксированной пропорцией 4:3 оно
          кончалось раньше экрана, и снизу выглядывала следующая секция. */}
      <div className="grid flex-1 grid-cols-1 grid-rows-[auto_1fr] min-[900px]:grid-cols-[41fr_59fr] min-[900px]:grid-rows-1">
        <div className="flex flex-col justify-center gap-7 px-[clamp(20px,5vw,64px)] pt-8 pb-12 min-[900px]:py-16">
          <div>
            <span className="text-accent mb-3.5 block text-[13px] font-semibold tracking-[0.1em] uppercase">
              {site.role}
            </span>
            <h1 className="text-ink m-0 text-[clamp(38px,4.6vw,68px)] leading-[1.06]">
              {site.artist}
            </h1>
            {/* Разрядка вместо курсива: у Oranienbaum курсива нет, и браузер
                подделал бы его наклоном — у высококонтрастной антиквы это
                сразу видно. */}
            <p className="font-heading text-accent mt-5 mb-0 text-[clamp(19px,2.2vw,28px)] tracking-[0.06em]">
              {site.slogan}
            </p>
          </div>

          {/*
            Только подтверждённое самой художницей: масло (акрил она
            не называла), возраст, отсутствие школы и что пишет каждый день.
            Прежний текст из макета обещал выставки, которых нечем подтвердить.
          */}
          <p className="text-ink/80 m-0 max-w-[46ch] text-base leading-relaxed">
            Пишет маслом с 2020 года. Взялась за кисть в 54 года, без художественной школы и без
            единого урока рисования, — и с тех пор пишет каждый день.
          </p>

          <div className="flex flex-wrap gap-3.5">
            <ButtonLink href="/gallery" variant="primary" size="lg">
              Смотреть галерею
            </ButtonLink>
            <ButtonLink href="/about" variant="secondary" size="lg">
              О художнице
            </ButtonLink>
          </div>
        </div>

        {/*
          Кадр 3:2, а колонка на ноутбуке почти квадратная, поэтому часть
          снимка неизбежно срезается. Срезается левая — мольберт, по просьбе
          заказчика. Не вплотную к правому краю (object-right), а на 72%:
          при 1280px object-right срезал и руку с мастихином, а на 72% рука
          остаётся у левого края колонки, лицо — в правой её половине.
          Замерено по кадру: рука на ~23% ширины, лицо на ~72%.

          ВРЕМЕННО: кадр сгенерирован нейросетью, а не снят. Заменить
          настоящей фотографией — docs/tekst-o-hudozhnitse.md, раздел 6.
        */}
        {/* 260px — нижняя граница для низких экранов (телефон лёжа): ниже
            снимок превращается в полоску, лучше пусть hero станет выше окна. */}
        <figure className="relative m-0 min-h-[260px]">
          <Image
            src="/about/berlant-v-masterskoy.webp"
            alt="Берлант Джабраилова кладёт мастихином мазок на холст с башней; рядом палитра и тюбики масляных красок"
            fill
            preload
            sizes="(min-width: 900px) 59vw, 100vw"
            className="object-cover object-[72%_center]"
          />
        </figure>
      </div>
    </section>
  );
}
