# Imagen para desplegar en Skyway. Multi-etapa para que la final no lleve
# ni el código fuente ni las dependencias de compilación.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
# Playwright está en devDependencies solo para el guion de capturas
# (`scripts/capturas.mjs`), que no se ejecuta aquí. Sin esta variable su
# postinstall se descargaría tres navegadores —cientos de megas— en cada
# construcción de la imagen, para nada.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prisma generate` va dentro de `npm run build`.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# `HOSTNAME` explícito, y no es redundante: el servidor de la salida autocontenida
# hace `process.env.HOSTNAME || '0.0.0.0'`, y **Docker define HOSTNAME solo** con
# el identificador del contenedor. Sin esta línea, el servidor se ata a ese
# nombre en vez de a todas las interfaces, y el proxy que publica la aplicación
# puede no alcanzarlo. Es un fallo que solo aparece desplegado.
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# El esquema y el cliente generado hacen falta para migrar al arrancar.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

USER nextjs
EXPOSE 3000

# Migrar y sembrar antes de servir: en Skyway el contenedor se recrea en cada
# despliegue.
#
# Los dos encadenados se comportan distinto a propósito. Migrar es un requisito:
# si falla, el esquema no coincide con el código y arrancar solo serviría para
# fallar más tarde y peor, así que `&&` corta. La semilla es una red de
# seguridad para el arranque en frío —pone la tarifa inicial sin la cual nadie
# devenga nada— y si falla se avisa y se sigue: el panel ya grita la ausencia de
# tarifa en su portada, y dejar la aplicación caída por eso sería cambiar un
# problema que se arregla desde una pantalla por otro que no se arregla desde
# ninguna.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && { node --experimental-strip-types prisma/seed.ts || echo '[arranque] la semilla falló; pon la tarifa en /admin/tarifas'; } && node server.js"]
