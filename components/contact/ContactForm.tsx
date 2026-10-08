"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";

/**
 * Темы обращения — три, как в макете, но без «Покупки» и «Заказа»: продажа
 * на сайте выключена (ARCHITECTURE.md, «Продажа выключена»). На переключателе короткое
 * слово: полные названия на телефоне 375px переносились на две строки,
 * и «таблетка» разъезжалась до 65px в высоту. В сообщение уходит полное.
 * Сами темы — в словаре (contactForm.topics), на языке страницы.
 */

type Errors = { name?: string; message?: string };

/**
 * Форма «написать художнице» без сервера (решение Э4-0.3).
 *
 * Отправка ничего никуда не шлёт: форма собирает текст из полей и открывает
 * WhatsApp — или почтовую программу — с готовым сообщением. Посетитель
 * видит его перед отправкой и отправляет сам. Хранить заявки негде и
 * незачем, а спам через такую форму невозможен.
 *
 * Телефона и почты посетителя в форме нет, хотя в макете они были: WhatsApp
 * и так покажет художнице номер, письмо — адрес. Спрашивать лишнее нельзя
 * ([security.md](../../.ai/rules/security.md)).
 *
 * Адреса приходят пропсами, а не из lib/contacts.ts: тот читает lib/env.ts,
 * где при импорте проверяются и серверные переменные, — в браузере их нет,
 * и страница упала бы.
 */
export function ContactForm({
  whatsappPhone,
  email,
}: {
  /** Номер без плюса для wa.me. Нет — кнопки WhatsApp нет. */
  whatsappPhone?: string;
  email?: string;
}) {
  const t = useDictionary().contactForm;
  const lang = useLocale();
  const topics = t.topics;
  const [errors, setErrors] = useState<Errors>({});

  /** Проверяет поля и собирает текст. Незаполненное — null и ошибки на экране. */
  function compose(form: HTMLFormElement): { text: string; subject: string } | null {
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const topic = String(data.get("topic") ?? topics[0].value);
    const message = String(data.get("message") ?? "").trim();

    const found: Errors = {};
    if (name === "") found.name = t.nameRequired;
    if (message === "") found.message = t.messageRequired;
    setErrors(found);

    // Фокус на первое незаполненное поле: без этого на телефоне ошибка
    // может оказаться выше экрана, и нажатие выглядит как «ничего не
    // произошло». Поле ищется по имени, а не по пометке ошибки: пометка
    // появится только после отрисовки, а ждать кадра ненадёжно — в скрытой
    // вкладке кадры не идут вовсе.
    const firstEmpty =
      found.name !== undefined ? "name" : found.message !== undefined ? "message" : null;
    if (firstEmpty !== null) {
      form.querySelector<HTMLElement>(`[name="${firstEmpty}"]`)?.focus();
      return null;
    }

    return {
      text: t.text(name, topic, message),
      subject: t.subject(topic),
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const composed = compose(form);
    if (composed === null) return;

    // Какой кнопкой отправили: у формы их может быть две.
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const viaEmail = submitter?.getAttribute("value") === "email";

    if (viaEmail && email !== undefined) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(composed.subject)}&body=${encodeURIComponent(composed.text)}`;
      return;
    }

    if (whatsappPhone !== undefined) {
      window.open(
        `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(composed.text)}`,
        "_blank",
        "noopener",
      );
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="field">
        <label htmlFor="contact-name">{t.name}</label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          className="input"
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name !== undefined ? "contact-name-error" : undefined}
          onInput={() => errors.name && setErrors({ ...errors, name: undefined })}
        />
        {errors.name && (
          <p id="contact-name-error" className="field-error m-0">
            {errors.name}
          </p>
        )}
      </div>

      <fieldset className="field m-0 border-0 p-0">
        {/* legend, а не label: подпись относится к группе переключателей,
            и скринридер зачитает её перед каждым вариантом. */}
        <legend className="text-ink mb-1.5 p-0 font-[family-name:var(--font-body)] text-[14px] font-medium">
          {t.topic}
        </legend>
        <div className="seg flex w-full">
          {topics.map((topic, index) => (
            <label key={topic.value} className="seg-opt flex-1 justify-center text-center">
              <input type="radio" name="topic" value={topic.value} defaultChecked={index === 0} />
              <span>{topic.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="contact-message">{t.message}</label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          className="input"
          placeholder={t.placeholder}
          aria-invalid={errors.message !== undefined}
          aria-describedby={errors.message !== undefined ? "contact-message-error" : undefined}
          onInput={() => errors.message && setErrors({ ...errors, message: undefined })}
        />
        {errors.message && (
          <p id="contact-message-error" className="field-error m-0">
            {errors.message}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {whatsappPhone !== undefined && (
          <button type="submit" value="whatsapp" className="btn btn-primary">
            {t.sendWhatsapp}
          </button>
        )}
        {email !== undefined && (
          <button
            type="submit"
            value="email"
            className={whatsappPhone === undefined ? "btn btn-primary" : "btn btn-secondary"}
          >
            {t.sendEmail}
          </button>
        )}
      </div>

      <p className="field-hint m-0">
        {t.privacyBefore(whatsappPhone !== undefined ? "WhatsApp" : t.channelMail)}
        <Link href={localePath(lang, "/privacy")}>{t.privacyLink}</Link>.
      </p>
    </form>
  );
}
