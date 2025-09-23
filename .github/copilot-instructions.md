# Doctorcita - Cal.com Fork ✅

Este es un fork de Cal.com personalizado para Doctorcita, una aplicación enfocada en recordatorios para citas de pacientes.

## Configuración del Proyecto ✅

- **Base**: Cal.com (https://github.com/calcom/cal.com)
- **Propósito**: Sistema de recordatorios médicos
- **Stack**: Next.js, TypeScript, Prisma, PostgreSQL
- **Enfoque**: Citas médicas y recordatorios automatizados

## Estado del Proyecto

✅ Workspace configurado
✅ Repositorio Cal.com clonado
✅ Dependencias instaladas
✅ Entorno configurado
✅ Branding personalizado
✅ Documentación creada

## Próximos Pasos

1. **Desarrollo Local**: 
   - Configurar PostgreSQL local
   - Ejecutar migraciones: `yarn workspace @calcom/prisma db-deploy`
   - Iniciar desarrollo: `yarn dev`

2. **Personalización Médica**:
   - Modificar interfaces para contexto médico
   - Implementar recordatorios específicos
   - Agregar funcionalidades de historial de pacientes

3. **Despliegue en Servidor**:
   - Seguir instrucciones en `DEPLOY.md`
   - Configurar PostgreSQL en producción
   - Configurar SSL y dominio

## Archivos Clave

- `.env.doctorcita` - Variables de entorno específicas
- `DEPLOY.md` - Guía completa de despliegue
- `README.md` - Documentación principal actualizada

## Comando de Inicio Rápido

```bash
# Copiar configuración
cp .env.doctorcita .env.local

# Instalar y ejecutar
yarn install
yarn dev
```