"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { checkCredentials, destroySession, startSession } from "@/lib/auth";

/**
 * Вход и выход администратора.
 *
 * Проверка данных формы — здесь, на входе, один раз
 * (.ai/rules/architecture.md): дальше типам можно верить.
 */

const credentialsSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Состояние формы между отправками.
 *
 * Почта возвращается назад намеренно: React 19 после Server Action очищает
 * форму целиком, и без этого при опечатке в пароле заново вводить пришлось
 * бы оба поля. Пароль сюда не кладётся никогда — он поехал бы обратно
 * в браузер в разметке ответа.
 */
export type LoginState = { error?: string; email?: string };

/**
 * Ошибка намеренно одна на все случаи: и на незнакомую почту, и на неверный
 * пароль, и на пустое поле. Раздельные тексты сообщали бы постороннему,
 * что почту он угадал, — и перебор сузился бы до пароля.
 */
const wrongCredentials = "Неверная почта или пароль.";

/**
 * Настройка сервера сломана — это не ошибка того, кто вводит пароль.
 * Текст общий: подробности (какая именно переменная не подошла) уходят
 * в лог сервера, а не на экран, где их прочитал бы посторонний.
 */
const notConfigured =
  "Вход не настроен на сервере: не заданы или неверны переменные AUTH_*. Подробности — в логах.";

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: wrongCredentials };

  let credentialsMatch: boolean;
  try {
    credentialsMatch = await checkCredentials(parsed.data.email, parsed.data.password);
  } catch (error) {
    console.error("Проверка пароля невозможна:", error);
    return { error: notConfigured, email: parsed.data.email };
  }

  if (!credentialsMatch) {
    return { error: wrongCredentials, email: parsed.data.email };
  }

  // Невыбранный флажок браузер не присылает вовсе — его отсутствие
  // и означает «не запоминать».
  await startSession(formData.get("remember") !== null);

  // redirect бросает исключение внутри, поэтому стоит последним и вне
  // try/catch — иначе переход был бы проглочен как ошибка.
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
