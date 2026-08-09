# Sophon Promoters

Mini App de Telegram para que los agentes comerciales gestionen sus webmasters
de Sophon y cobren sus comisiones.

Un agente entra desde el bot, da de alta webmasters —cada alta concede un año de
PRO—, ve lo que devengan sus registros día a día y pide el retiro de su saldo. El
Operador lo aprueba y lo paga desde un panel aparte.

---

## Índice

1. [Qué hay dentro](#qué-hay-dentro)
2. [Cómo funciona el dinero](#cómo-funciona-el-dinero)
3. [Requisitos y variables](#requisitos-y-variables)
4. [Trabajar en local](#trabajar-en-local)
5. [Desplegar](#desplegar)
6. [El planificador](#el-planificador-y-por-qué-la-línea-de-las-1605-no-es-opcional)
7. [Operación diaria](#operación-diaria)
8. [Lo que hay que saber antes de dar por buena la producción](#lo-que-hay-que-saber-antes-de-dar-por-buena-la-producción)

---

## Qué hay dentro

Una sola aplicación Next.js con **dos caras y un bot**, servidas por un único
contenedor:

| Cara | Ruta | Quién entra | Cómo se autentica |
|---|---|---|---|
| Mini App | `/`, `/red`, `/cartera`, `/pro`, `/historico`… | El agente comercial | `initData` firmado por Telegram **más** cookie de sesión |
| Panel | `/admin/*` | El Operador, una sola persona | Enlace de un solo uso que manda el bot a su Telegram |
| Bot | `/api/bot` | Telegram | Secreto en `X-Telegram-Bot-Api-Secret-Token` |

No hay servicio aparte para el bot —funciona por webhook, no por *polling*— ni
para el planificador: las tareas se disparan desde fuera contra `/api/cron`.

```
app/(miniapp)   la aplicación del agente, en cinco idiomas
app/(admin)     el panel del Operador, solo en español y a propósito
app/api         rutas de datos, autenticación, bot y cron
components      las piezas de interfaz (Escalera, Malla, Mecha, Testigo, Isotipo…)
lib/devengo     el motor de comisiones: aritmética pura en micros de dólar
lib/sync        los cuatro barridos contra Sophon
lib/sophon      el cliente HTTP con reintentos y cortacircuitos
lib/i18n.ts     los cinco catálogos, completos y verificados por el compilador
prisma          esquema y migraciones
test            150 pruebas, sin base de datos: `npm test`
```

### Idiomas

Español, inglés, italiano, portugués y árabe (con la interfaz invertida). El
idioma sale del `language_code` que Telegram firma en el `initData` y se
persiste en el agente, así que los avisos del bot y el correo del código de
acceso llegan también en su lengua. El panel del Operador **no** se traduce:
lo usa una persona.

---

## Cómo funciona el dinero

Tres reglas que explican casi todo el código de `lib/devengo`:

1. **Todo el dinero es `bigint` en micros de dólar** (1 $ = 1 000 000 µ$). Nunca
   coma flotante: los importes llegan de Sophon como cadena decimal y convertir
   a `number` acumula error a lo largo de cientos de miles de registros.
2. **No se devenga por eventos, se devenga por diferencia.** Sophon publica
   contadores acumulados por webmaster y día, y los revisa. En cada barrido se
   calcula el objetivo de la fila y se escribe solo lo que falta, así que
   re-sincronizar no paga dos veces y una revisión a la baja genera un asiento
   negativo en lugar de tocar el original.
3. **El ledger es *append-only*.** Una corrección es una línea nueva fechada el
   día del ajuste. Un retiro entra como asiento negativo, de modo que el
   disponible sale de una suma y no de restar tablas distintas.

Un día permanece **abierto a revisión siete días**. Solo lo consolidado es
retirable: pagar sobre un día abierto obligaría a reclamar dinero ya entregado
si Sophon lo revisa a la baja.

---

## Requisitos y variables

- Node ≥ 20 (la imagen usa Node 22)
- PostgreSQL
- Un bot de Telegram
- Una cuenta de Sophon con acceso al Tool API
- Un SMTP para los códigos de acceso

Todas las variables están documentadas una a una en **`.env.example`**. La
aplicación las comprueba **al arrancar** (`lib/entorno.ts`) y distingue dos
niveles:

- **Esenciales** — `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `CLAVE_CIFRADO`,
  `PIMIENTA_OTP`. Sin ellas el proceso **no arranca** en producción. Es
  deliberado: un contenedor que se niega a arrancar se ve en el panel de
  despliegue en treinta segundos, mientras que uno que arranca a medias se
  descubre sobre un usuario real.
- **De función** — el resto. La aplicación sirve, pero una pieza concreta queda
  apagada y el arranque lo dice por consola nombrando qué se ha perdido.

Los dos secretos que hay que generar:

```bash
openssl rand -base64 32   # CLAVE_CIFRADO — cifra las wallets de los retiros
openssl rand -base64 32   # PIMIENTA_OTP  — pimienta del hash de los OTP
openssl rand -hex 32      # CRON_SECRET   — protege /api/cron
```

`CLAVE_CIFRADO` perdida no rompe nada ni impide cobrar: deja ilegibles las
wallets ya guardadas, así que un retiro pendiente habría que volver a pedirlo.

---

## Trabajar en local

```bash
cp .env.example .env      # y rellenarlo
npm install
npm run docker:local      # la app + un Postgres de trabajo
```

Sin Docker, con un Postgres propio:

```bash
npm install
npm run db:migrate:dev
npm run db:seed           # deja la tarifa inicial; sin ella nadie devenga nada
npm run dev
```

Comprobaciones:

```bash
npm run comprobar   # typecheck + las 150 pruebas. Es lo que corre en CI
npm test            # solo las pruebas: sin base de datos y sin red
npm run typecheck
```

> No hay ESLint, y la ausencia es deliberada. Había un `npm run lint` que
> llamaba a `next lint` **sin ninguna configuración en el repositorio**: en vez
> de comprobar nada, abría un menú interactivo preguntando qué configuración
> instalar, de modo que en CI se habría quedado colgado esperando una respuesta
> que nadie iba a dar. Y `next lint` desaparece en Next 16. Lo que sostiene la
> calidad aquí es TypeScript en modo estricto —con `noUncheckedIndexedAccess`—
> y las pruebas; un guion que finge comprobar es peor que no tenerlo.

Y las que necesitan credenciales de verdad:

```bash
npm run sophon:diagnostico   # en qué estado está la cuenta de Sophon ahora mismo
npm run prueba:e2e           # circuito completo, incluido el del dinero
```

### Las capturas

La disciplina del proyecto es que **ninguna pantalla se da por buena sin
mirarla**: todos los defectos de diseño encontrados aquí salieron de mirar o de
medir, ninguno de leer el código.

```bash
npm run build && npm start -- -p 3100 &
node scripts/capturas.mjs 3100 capturas    # claro y oscuro, con la API simulada
```

### Los iconos

```bash
npm run iconos
```

Regenera el juego entero —favicon, `apple-touch-icon`, iconos del manifiesto, la
marca del correo y la imagen de previsualización— a partir de la **misma
geometría** que `components/Isotipo.tsx`. Los PNG se versionan: la imagen de
producción no ejecuta este guion. Solo hay que lanzarlo si se toca la marca.

---

## Desplegar

Skyway lee `docker-compose.yml`, construye el `Dockerfile` e inyecta las
variables desde su panel.

1. Conectar el repositorio. Reconstruye en cada push.
2. Añadir el Postgres gestionado y poner su URL **interna** en `DATABASE_URL`,
   con `?connection_limit=10` al final. Sin ese tope Prisma abre
   `núcleos × 2 + 1` conexiones y agota el cupo de una base pequeña.
3. El resto de variables, en el panel. Están todas en `.env.example`.
4. `npm run bot:configurar` desde un clon, con `APP_URL` apuntando ya al
   dominio. No se puede lanzar dentro del contenedor: la imagen final no copia
   `scripts/`.
5. Poner las líneas del planificador (abajo).

**Las migraciones no se lanzan a mano nunca.** El `CMD` de la imagen ejecuta
`prisma migrate deploy` antes de servir, y hace falta también sobre una base
vacía porque es lo que crea las tablas. Si falla, el contenedor no arranca: un
esquema que no coincide con el código solo serviría para fallar más tarde y
peor. La semilla sí puede fallar sin tumbar nada —el panel ya avisa en su
portada cuando no hay tarifa en vigor—.

El contenedor trae `HEALTHCHECK` contra `/api/salud`, que toca la base de datos
de verdad y responde `503` si no contesta o si falta una variable esencial.

---

## El planificador, y por qué la línea de las 16:05 no es opcional

Sophon no tiene webhooks: todo es *polling* contra `/api/cron`. El secreto viaja
en la cabecera `x-cron-secret` y no como parámetro de URL, porque los parámetros
acaban en los logs de acceso de cualquier proxy.

```cron
 5 16  * * *   curl -XPOST -H "x-cron-secret: $CRON_SECRET" $APP_URL/api/cron?tarea=todo
*/30  * * * *  ...  ?tarea=registros
*/30  * * * *  ...  ?tarea=webmasters
 0    * * * *  ...  ?tarea=tesoreria
30    7 * * *  ...  ?tarea=avisos
```

Las horas van en **UTC**. La línea de las **16:05** es la que recoge el cierre:
Sophon cierra su día contable a las 00:00 UTC+8 —las 16:00 UTC— y publica
entonces los contadores del día que acaba. Las demás mantienen la pantalla
fresca durante el día.

Si ninguna llega a ponerse, la portada del panel lo dice: avisa cuando no ha
corrido ningún barrido de registros desde el último cierre de Sophon. **Un
planificador mal configurado no puede ser invisible.**

---

## Operación diaria

Casi todo se hace desde el bot, como Operador:

| Comando | Para qué |
|---|---|
| `/codigo` | Genera un código de activación para dar de alta a un agente |
| `/agentes` | Quién hay y cuánto lleva cada uno |
| `/retiros` | Solicitudes pendientes, con su wallet, para pagar desde el móvil |
| `/panel` | Enlace de un solo uso al panel web (15 minutos, un uso) |

Y en el panel: aprobar y marcar como pagados los retiros —con referencia
obligatoria, que es el único rastro de que la transferencia salió—, fijar la
tarifa, configurar la escalera de bonos y suspender agentes.

### Cuando algo va raro

| Síntoma | Dónde mirar |
|---|---|
| Los agentes devengan 0,00 $ | ¿Hay tarifa en vigor? El panel lo grita en su portada. `/admin/tarifas` |
| El disponible no sube y el devengado sí | Los días tardan 7 en consolidarse. Si pasa de ahí, mirar el barrido de registros |
| Un alta falla con «Sophon no nos autoriza» | La cuenta maestra no está en la whitelist del Tool API. Ver abajo |
| La aplicación no arranca tras un despliegue | Los logs dicen exactamente qué variable falta y qué deja de funcionar |
| No sé si está viva | `GET /api/salud` |

---

## Lo que hay que saber antes de dar por buena la producción

**La whitelist del Tool API.** La cuenta maestra de afiliado tiene que estar
autorizada por soporte de Sophon. Sin autorizar, `sub-aff/status` responde
`caller not in allowed list` y **activar webmasters falla**, y con ello el año de
PRO que va incluido en cada alta; el resto —registros, ingresos y tesorería—
opera con normalidad.

Fue el bloqueo conocido durante todo el desarrollo. El titular confirma que
`Nkrowone+2@gmail.com` **ya está en la whitelist**, pero eso no se ha podido
comprobar contra la API desde aquí: hace falta `SOPHON_PASSWORD`, que no vive en
el repositorio. **Compruébalo antes del primer despliegue**, porque es la
diferencia entre un alta que funciona y un alta que se queda a medias:

```bash
SOPHON_EMAIL=... SOPHON_PASSWORD=... npm run sophon:diagnostico
```

Solo lee, no escribe nada, y dice en qué estado está la cuenta ahora mismo: si
la whitelist responde, en qué `partnerLevel` está y si los endpoints devuelven la
forma que el cliente espera.

**El PRO no se renueva mientras esté vigente.** No es una preferencia: la API de
Sophon no documenta si al fijar la membresía sobre una suscripción viva el plazo
se suma o se sustituye. Si sustituye, renovar a mitad de año le borraría al
webmaster los meses que le quedaban. Como el caso no se puede provocar para
comprobarlo, no se llama nunca a `setmembership` sobre una membresía viva y la
pregunta deja de importar. Está en `lib/pro/vigencia.ts`, con su prueba.

**La zona horaria contable no se cambia.** `ZONA_HORARIA` define de qué día es
cada devengo. Es la de Sophon —UTC+8, sin horario de verano— porque la etiqueta
de fecha de cada fila viene de ellos. Moverla cambiaría importes de periodos ya
cerrados.

**El reloj del contenedor va en UTC** y el reparto por día lo hace la aplicación.
Son dos cosas distintas a propósito: si el contenedor tuviera su propia zona
habría dos respuestas a «¿de qué día es este devengo?».
