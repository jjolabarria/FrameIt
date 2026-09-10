# Marca FrameIt

Actualizado el 10/09/2026. Sustituye las recomendaciones pendientes del informe histórico de marca.

- Grafía canónica: **FrameIt**, sin punto en las firmas.
- Símbolo maestro: `frontend/public/favicon.svg`. Se usa directamente en la web y se incrusta como recurso `FrameIt.Brand.svg` en el backend para los PDF. No recrear las letras con HTML ni mantener copias del dibujo.
- Componente web: `Brand`, con lema opcional; `BrandSymbol` solo cuando el nombre ya aparece al lado. El símbolo es decorativo y el nombre permanece como texto accesible.
- Paleta: petróleo `#193e43`, verde `#286a57`, papel `#f7f8f3`. Tokens web `--brand-ink`, `--brand-green`, `--brand-paper`. Los colores semánticos de las rondas se mantienen separados.
- Firma web: Source Sans 3 600, servida localmente. Contenido de landing: Bitter y Source Sans 3. Contenido operativo: Space Grotesk y Manrope. El PDF conserva su fuente de documento con el mismo símbolo y colores de identidad.
- Símbolo web de 34 px, con separación de 10 px del nombre; PDF de 28 pt. Conservar proporciones y evitar recolorear el SVG por pantalla. El fondo papel integrado permite reconocerlo sobre superficies distintas.
- Seguridad: ShieldCheck. Identificación de facilitador: UserRound. Mantener sus etiquetas de texto.
- La marca también queda visible en la navegación móvil del espacio privado.

## Validación

- Compilación frontend y lint correctos; compilación backend sin advertencias ni errores.
- Seis escenarios existentes de exportación PDF correctos, con proveedores simulados; muestra renderizada e inspeccionada visualmente.
- Landing, entrada y directorio privado comprobados a 1440 y 320 px con datos simulados, sin desbordamiento horizontal y con el símbolo cargado. Capturas en `output/playwright/brand-unified/`.
- PDF de muestra: `output/pdf/brand-unified/success.pdf`.

La revisión visual no cubre todos los estados de sesión ni constituye una auditoría completa de accesibilidad. Los cambios están en el código local; no se ha desplegado el servicio.
