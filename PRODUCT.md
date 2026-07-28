# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mini App de Telegram servida sobre HTTPS. Móvil web dentro del cliente de
Telegram: no es una app nativa y no adopta lenguaje de iOS ni de Android. El
panel de superadmin es web de escritorio, en el mismo despliegue.

## Users

**Primario: el agente comercial.** Afiliado profesional del sector —vive del
tráfico y de la afiliación, ya tiene su propia cartera de webmasters y sabe leer
un cuadro de comisiones—. No es alguien a quien haya que enseñar el negocio: la
app le sirve para dar de alta webmasters, fiscalizar lo que ha devengado y
cobrarlo. Trabaja desde el móvil, dentro de Telegram, donde ya tiene abiertas
las conversaciones de sus webmasters.

**Secundario: el superadmin.** Una sola persona. Es el dueño de la cuenta
maestra de Sophon y quien reparte: crea códigos de activación, fija tarifas y
bonos, y resuelve los retiros a mano. Opera desde el bot y desde un panel web
propio, no traducido, que solo abre él.

**Fuera del producto: el webmaster.** Existe en Sophon y en los datos, pero
nunca abre esta aplicación ni tiene cuenta en ella.

## Product Purpose

Permite a un agente construir y explotar una cartera de webmasters dentro del
programa de afiliados de Sophon sin ser afiliado de Sophon: da de alta a un
webmaster por email, ve cada día lo que ese webmaster le devenga, persigue un
hito mensual de registros y retira su saldo en cripto.

Del otro lado, le da al superadmin una contabilidad que cuadra: cuánto entra de
Sophon, cuánto se llevan los agentes, qué queda, y si los números en pantalla
son de fiar.

Éxito es que el agente confíe en la cifra sin pedir explicaciones, y que el
superadmin pueda pagar sin reconstruir nada a mano.

## Positioning

**El agente no necesita cuenta en Sophon.** Todo pasa por la cuenta maestra de
afiliado: el agente da de alta webmasters, cobra por ellos y ve su devengo sin
ser afiliado de Sophon, sin credenciales suyas y sin abrir jamás el panel de
Sophon. Un competidor no puede decir lo mismo salvo que monte también la
intermediación completa —atribución, ledger propio y tesorería— por debajo.

## Operating Context

- **Todo ocurre dentro de Telegram.** Mini App para el agente y bot para los
  avisos y para los comandos de gestión del superadmin. El agente no cambia de
  aplicación para trabajar.
- **El día contable es el de Sophon: UTC+8** (`Asia/Shanghai`). Sophon cierra a
  las 00:00 UTC+8 —16:00 UTC— y publica entonces los contadores del día que
  acaba; el barrido que recoge el cierre corre a las 16:05 UTC. La zona es única
  y no puede cambiar: define qué día es cada devengo, y moverla movería importes
  entre periodos ya cerrados.
- **Los datos entran por barridos programados**, no en tiempo real: registros y
  webmasters cada 30 min, tesorería cada hora, avisos una vez al día. Si el
  planificador no está configurado, la aplicación lo dice en pantalla en vez de
  mostrar números viejos como si fueran frescos.
- **Los retiros se resuelven a mano.** El agente solicita, el superadmin cobra
  el aviso en Telegram y aprueba o rechaza. El plazo que se comunica es de 1 a 3
  días. Las redes de pago son TRC20, BSC y TON.
- **La app depende de un tercero que puede decir que no.** Toda alta y toda
  concesión de PRO es una llamada al Tool API de Sophon, que puede fallar por
  motivos que ni el agente ni el superadmin controlan.

## Capabilities and Constraints

**Alta y atribución**

- Un alta vincula un email de webmaster a un agente contra Sophon
  (`bind_sub_aff`). Dos condiciones, las dos impuestas por la realidad: el
  webmaster tiene que existir ya en newSophon.com, y no puede estar vinculado a
  otro agente. El email es único a nivel global.
- **No hay tope de altas, y es una decisión.** Para frenar a un agente concreto
  está su estado, que corta también su sesión.
- Cada alta concede un año de PRO (`vip.year`) al webmaster, y hay renovación
  cuando el plazo se apaga. Un PRO vigente no se toca: no está confirmado si
  Sophon suma el plazo o lo sustituye.
- **Devengo prospectivo:** no se paga nada anterior a la fecha del alta, aunque
  la cuenta traiga historia.
- Las filas huérfanas —webmasters que ya existían en el árbol del superadmin—
  no se pueden adoptar desde la app.

**Dinero**

- El dinero se guarda siempre como entero en micros de dólar. Ni coma flotante
  ni decimal.
- El ledger es append-only. Una corrección se escribe como línea negativa
  fechada el día del ajuste; nunca se muta el asiento original.
- Cada asiento congela su tarifa y, si es un bono, el escalón que lo explica.
  Cambiar comisiones o la escalera no reescribe el histórico.
- Tipos de asiento: CPA por registro, CPS en puntos básicos sobre las compras,
  bono mensual por hito de registros, reverso, ajuste manual y retiro.
- Las recompensas de la escalera tienen que crecer con los usuarios; se valida
  al guardar.
- Un día sigue siendo provisional mientras Sophon pueda revisarlo, y se
  consolida al salir de la ventana de revisión.
- Se concilia el ledger contra las cifras de Sophon; un descuadre se registra y
  se avisa, no se ignora.

**Acceso**

- El agente entra con un código de activación que emite el superadmin, verifica
  su email con un OTP y a partir de ahí se identifica por el `initData` firmado
  de Telegram. Las sesiones se invalidan todas de golpe subiendo la época.
- El superadmin no tiene contraseña: el bot le emite un enlace de un solo uso a
  su Telegram, que ya es el ancla de confianza de la aplicación. Su sesión dura
  poco a propósito.
- Los tokens jamás se persisten en claro; el token de Sophon y las wallets van
  cifrados en reposo.

**Idiomas**

- Cinco: español (por defecto), inglés, árabe, italiano y portugués europeo.
  Solo el árabe invierte el layout.
- Los catálogos son completos, no parciales: olvidar una cadena es un error de
  compilación, no media pantalla en un idioma que el agente no lee.
- Las cinco lenguas tutean. Un mismo producto no puede tutear en español y
  tratar de usted en italiano.
- El panel de superadmin no se traduce: lo abre una sola persona.

**Regla dura de confidencialidad**

- Ninguna cadena, ninguna pantalla y ninguna respuesta de API puede revelar el
  reparto del superadmin ni lo que cobra el webmaster. El agente solo ve lo
  suyo. El margen del superadmin es la única cifra de la aplicación que nadie
  más puede ver, y va marcada como privada allí donde aparece.

**Sin decidir**

- La relación de marca y legal con Sophon —producto oficial, operación
  independiente sobre su programa de afiliados, o algo intermedio— no está
  confirmada. Ningún trabajo futuro debe afirmar respaldo oficial de Sophon
  hasta que se decida.

## Brand Commitments

- **Nombre:** Sophon Promoters.
- **Isotipo:** `public/icono.svg`, geometría de tres trazos circulares. Un solo
  vectorial de ~1 kB sirve para favicon, pantalla de inicio y cualquier
  densidad; no hay juego de PNG y no debe generarse uno.
- **La voz está escrita y es vinculante** (`lib/i18n.ts`), en cinco reglas:
  1. Tuteo y verbo conjugado. «Has alcanzado el hito», nunca «Alcanzado el
     hito».
  2. El agente es el sujeto de lo que hace él. La pasiva refleja vale para
     estados del sistema, no para algo que tiene que hacer alguien.
  3. Pretérito perfecto compuesto para lo reciente: «has alcanzado», no
     «alcanzaste».
  4. Sin felicitaciones, sin exclamaciones, sin emoji. El agente es un
     profesional que cobra, no alguien a quien haya que animar.
  5. Los errores dicen qué ha pasado, por qué y qué hacer ahora. Los tres, y en
     ese orden.
- **Profesional no es impersonal.** Ya se pagó una vez confundirlos: una pasada
  de «registro profesional» convirtió media interfaz en etiquetas nominales.
  Profesional es conjugar bien.

## Evidence on Hand

- **Lo que hay:** el código y sus pruebas. Suite en `test/` que cubre el motor
  de devengo, el dinero en micros, los bonos, las fechas contables, los
  catálogos de los cinco idiomas, la firma de Telegram y el contraste de color.
  Guion de extremo a extremo (`scripts/prueba-extremo-a-extremo.ts`) y
  diagnóstico del estado de la cuenta de Sophon
  (`npm run sophon:diagnostico`).
- **Lo que NO hay, y no debe inventarse:** clientes, agentes de referencia,
  testimonios, casos de éxito, cifras de volumen, capturas de prensa, precios
  públicos, ni ninguna afirmación de respaldo por parte de Sophon.
- **Bloqueo vigente (prelanzamiento):** a fecha de 2026-07-25 la cuenta maestra
  no figura en la whitelist del Tool API de Sophon —`sub-aff/status` responde
  «caller not in allowed list»—, así que activar webmasters falla, y con ello el
  año de PRO que va en cada alta. La lectura de registros, ingresos y tesorería
  sí opera. El producto todavía no tiene agentes reales cobrando.

## Product Principles

1. **El dinero se explica solo.** Cada cifra que ve el agente tiene detrás un
   asiento con su fecha, su base y la tarifa congelada que lo produjo. Si una
   cifra necesita que alguien la justifique por chat, está mal presentada.
2. **El agente solo ve lo suyo.** No es una preferencia de privacidad: es la
   frontera del producto. Lo que gana el superadmin y lo que gana el webmaster
   no existen en la superficie del agente.
3. **Nada se calla.** Un barrido que no corrió, un descuadre, una whitelist
   cerrada o un dato provisional se dicen arriba y antes, nunca en una nota al
   pie. Un sistema mal configurado no puede ser invisible.
4. **El agente no toca Sophon.** Esta aplicación es la única superficie. Todo lo
   que exija abrir el panel de Sophon, tener credenciales suyas o entender su
   jerga es un fallo del producto.
5. **Se le habla como a un profesional que cobra.** Sin celebración, sin
   ánimos, sin premios de cartón. La recompensa es dinero y con enseñarlo bien
   basta.

## Accessibility & Inclusion

- **Contraste con puerta automática.** Ningún token de color entra por criterio
  visual: `test/contraste.test.ts` mide cada token contra los fondos reales
  —los de Telegram y las bandas propias, en claro y en oscuro— y falla por
  debajo de 4,5:1 en texto y 3:1 en marcas de datos y bordes. Existe porque ya
  se colaron dos acentos ilegibles sin que nadie los viera.
- **RTL de verdad en árabe**, con su propia familia tipográfica en lugar de caer
  a la del sistema, y cifras tabulares en las cinco lenguas para que recuentos e
  importes no usen dos convenciones numéricas en la misma pantalla.
- **Claro y oscuro** son ambos de la casa: no se derivan del color que ponga el
  cliente de Telegram.
- No hay una norma formal comprometida (WCAG AA/AAA) ni una necesidad de usuario
  concreta establecida más allá de lo anterior.
