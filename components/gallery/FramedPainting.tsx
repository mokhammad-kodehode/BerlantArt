import Image from "next/image";
import type { CSSProperties } from "react";

import { frameStyle, type CssVars } from "@/lib/frame-look";
import { frameFinish, type CanvasCm, type FrameChoice } from "@/lib/room-options";

/**
 * Картина в раме на экране (TICKETS-primerka.md): холст и четыре планки
 * со скосами в углах, как у настоящего багета. Вид рамы — переменными из
 * lib/frame-look.ts, устройство — в globals.css, блок «Рама».
 *
 * Размер в пикселях считает CSS: картина вместе с рамой вписывается в
 * место, которое даёт родитель (`--fit-w`, `--fit-h`), а ширина рамы —
 * в сантиметрах от ширины холста. Поэтому багет 7 см на холсте 120 см
 * тоньше, чем на холсте 40 см, — как в жизни.
 */
export function FramedPainting({
  src,
  alt,
  choice,
  canvas,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  choice: FrameChoice;
  canvas: CanvasCm;
  sizes: string;
  priority?: boolean;
}) {
  const style: CSSProperties & CssVars = {
    ...frameStyle(choice),
    "--ar": canvas.width / canvas.height,
    "--wcm": canvas.width,
  };

  return (
    <div
      className="framed"
      data-frame={choice.frame}
      data-kind={frameFinish(choice.finish).kind}
      style={style}
    >
      {choice.frame !== "none" && (
        <>
          <span aria-hidden="true" className="framed-rail framed-rail-top" />
          <span aria-hidden="true" className="framed-rail framed-rail-right" />
          <span aria-hidden="true" className="framed-rail framed-rail-bottom" />
          <span aria-hidden="true" className="framed-rail framed-rail-left" />
        </>
      )}
      <div className="framed-canvas">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          priority={priority}
        />
      </div>
    </div>
  );
}
