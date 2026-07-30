# Política de Seguridad y Privacidad

**MIRATEA by Solutech** es una plataforma orientada al desarrollo, la autorregulación emocional y el acompañamiento familiar en entornos neurodivergentes. La protección de los menores y la seguridad de los datos de salud son nuestra máxima prioridad.

---

## 1. Privacidad Infantil & Protección de Datos

### Sanitización PII Automática
- **Middleware PiiSanitizer**: Toda interacción o texto procesado por IA pasa previamente por nuestro middleware (`src/lib/security/PiiSanitizer.ts`), anonimizando nombres propios y datos identificativos por tokens opacos (`[CHILD_NAME]`, `[FAMILY_NAME]`).
- **Anonimización en Servidor**: Los datos sensibles no abandonan el entorno sin anonimizar y se restauran localmente en la interfaz del usuario.

### Aislamiento de Datos por Familia
- **Row Level Security (RLS)**: En bases de datos PostgreSQL/Supabase, las políticas RLS garantizan aislamiento estricto por `family_id`. Ninguna familia o tercero puede acceder a datos ajenos.

---

## 2. Reporte de Incidencias de Seguridad

Si detectas cualquier fallo de seguridad en la plataforma, por favor repórtalo de forma privada a nuestro equipo de ingeniería:

- **Contacto Directo**: `xavi@solutech.blog`
- **SLA de Respuesta**: Acuse de recibo en menos de 24 horas y resolución prioritaria.

---

## 3. Propiedad Privada
Este software es propiedad exclusiva de **Solutech**. No está autorizada la publicación de exploits, pruebas públicas de vulnerabilidad ni ingeniería inversa sin consentimiento explícito.
