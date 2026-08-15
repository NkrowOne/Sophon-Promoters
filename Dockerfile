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

# ──────────────────────────────────────────────────────────────────────────────
# El CLI de Prisma, con su árbol de dependencias COMPLETO.
#
# Esta etapa existe por un fallo que solo aparecía al desplegar, y que costó el
# primer despliegue entero. El runner copiaba tres carpetas sueltas
# —`node_modules/{.prisma,@prisma,prisma}`— y arrancaba con
# `node_modules/.bin/prisma migrate deploy`. Dos cosas mal:
#
#  1. **`.bin` no se copiaba nunca.** Ese `prisma` es un enlace simbólico que npm
#     crea en `node_modules/.bin`, y esa carpeta no estaba en ninguna línea
#     `COPY`. El contenedor moría con `sh: node_modules/.bin/prisma: not found`.
#  2. **Y arreglar la ruta no bastaba.** El CLI necesita 33 paquetes
#     transitivos, y varios —`effect`, `c12`, `chokidar`…— viven en la raíz de
#     `node_modules`, no bajo `@prisma/`. Invocarlo por su fichero real fallaba
#     igual, ahora con `Cannot find module 'effect'`.
#
# Enumerar esos 33 paquetes a mano sería frágil: la lista cambia con cada versión
# de Prisma y el fallo volvería a aparecer solo al desplegar. Así que **el cierre
# lo calcula npm**, instalando el CLI a secas en su versión EXACTA del lockfile.
#
# Cuesta menos de lo que parece: 155 MB de los cuales los motores —lo gordo— ya
# se copiaban antes. Y no trae `@prisma/client`, así que al fusionarse sobre el
# `node_modules` de la salida autocontenida no pisa el cliente de la aplicación.
FROM node:22-alpine AS cliprisma
WORKDIR /cli
COPY package-lock.json ./
RUN npm i --no-save --no-audit --no-fund \
      "prisma@$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")"

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
# El esquema y las migraciones: sin ellos no hay nada que aplicar.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# El cliente GENERADO por `prisma generate`. No sale de ningún `npm install`:
# lo produce el build a partir del esquema, así que solo puede venir del builder.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
# Y el CLI con su cierre completo, fusionado sobre el `node_modules` que ya trajo
# la salida autocontenida. Va el ÚLTIMO a propósito: si trajera un
# `@prisma/client` propio, pisaría al que Next ha trazado —no lo trae, y por eso
# este orden es seguro—.
COPY --from=cliprisma --chown=nextjs:nodejs /cli/node_modules ./node_modules

# ── LA AUTOCOMPROBACIÓN ──
#
# Ejecuta el CLI en tiempo de CONSTRUCCIÓN. Si le falta una dependencia, la
# imagen no se construye; antes se construía perfecta y el contenedor moría al
# arrancar, que es donde el fallo cuesta un despliegue en vez de treinta
# segundos. Es la línea que impide que esto vuelva a pasar: cualquier cambio
# futuro en lo que se copia lo caza aquí.
RUN node node_modules/prisma/build/index.js --version

USER nextjs
EXPOSE 3000

# ¿Está viva? `/api/salud` toca la base de datos y responde 503 si no contesta o
# si falta una variable esencial, así que esto distingue «el proceso escucha» de
# «la aplicación sirve», que es lo único que le interesa saber al orquestador.
#
# `start-period` largo a propósito: antes de servir, el `CMD` de abajo migra y
# siembra. Con el margen por defecto —cero— la primera comprobación llegaría a
# mitad de `migrate deploy` y marcaría el contenedor como enfermo justo cuando
# está haciendo lo que debe.
#
# `wget` y no `curl`: BusyBox trae el primero y la imagen no instala el segundo.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/salud || exit 1

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
# Se invoca el CLI por su FICHERO, no por el enlace de `node_modules/.bin`: ese
# enlace lo crea `npm install` y aquí no se instala nada, así que no existe. Ver
# la etapa `cliprisma`.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && { node --experimental-strip-types prisma/seed.ts || echo '[arranque] la semilla falló; pon la tarifa en /admin/tarifas'; } && node server.js"]
