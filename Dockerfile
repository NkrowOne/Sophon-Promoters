# Imagen para desplegar en Skyway. Multi-etapa para que la final no lleve
# ni el código fuente ni las dependencias de compilación.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
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
