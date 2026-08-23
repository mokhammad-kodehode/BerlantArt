import type { NextConfig } from "next";

/**
 * Импорт ради побочного эффекта: схема из lib/env.ts выполняется здесь, при
 * старте dev-сервера и при сборке. Без этого импорта валидация была написана,
 * но не работала — модуль никто не подключал, и сборка с пустым DATABASE_URL
 * прошла бы успешно, а падало бы уже на проде в рантайме.
 */
import "./lib/env";

const nextConfig: NextConfig = {/* config options here */};

export default nextConfig;
