import type { NextConfig } from "next";

/**
 * Импорт нужен дважды: ради значения и ради побочного эффекта. Схема из
 * lib/env.ts выполняется здесь, при старте dev-сервера и при сборке. Без
 * этого импорта валидация была написана, но не работала — модуль никто
 * не подключал, и сборка с пустым DATABASE_URL прошла бы успешно, а падало
 * бы уже на проде в рантайме.
 */
import { clientEnv } from "./lib/env";

const r2PublicUrl = clientEnv.NEXT_PUBLIC_R2_PUBLIC_URL;

const nextConfig: NextConfig = {
  images: {
    /**
     * next/image не отдаёт картинки с чужого домена, пока тот не разрешён
     * явно. Домен бакета попадает сюда, только когда он задан: пока
     * хранилище не подключено, картинок оттуда всё равно нет, а пустой
     * шаблон вместо конкретного означал бы разрешение на любой адрес.
     */
    remotePatterns: r2PublicUrl ? [new URL(`${r2PublicUrl.replace(/\/+$/, "")}/**`)] : [],
  },
};

export default nextConfig;
