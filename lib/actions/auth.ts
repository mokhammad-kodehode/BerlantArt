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

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: wrongCredentials };

  if (!(await checkCredentials(parsed.data.email, parsed.data.password))) {
    return { error: wrongCredentials, email: parsed.data.email };
  }

  await startSession();

  // redirect бросает исключение внутри, поэтому стоит последним и вне
  // try/catch — иначе переход был бы проглочен как ошибка.
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
