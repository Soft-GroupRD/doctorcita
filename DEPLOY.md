# Script de Despliegue para Doctorcita

## Instrucciones de Despliegue en Servidor Linux

### 1. Preparación del Servidor

```bash
#!/bin/bash

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Instalar Nginx
sudo apt install nginx -y

# Instalar Yarn y PM2
npm install -g yarn pm2

# Configurar PostgreSQL
sudo -u postgres psql -c "CREATE USER doctorcita WITH PASSWORD 'tu_password_seguro';"
sudo -u postgres psql -c "CREATE DATABASE doctorcita OWNER doctorcita;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE doctorcita TO doctorcita;"
```

### 2. Configuración de la Aplicación

```bash
# Clonar el repositorio
git clone [tu-fork-url] /var/www/doctorcita
cd /var/www/doctorcita

# Instalar dependencias
yarn install

# Configurar variables de entorno
cp .env.doctorcita .env.local

# Editar variables para producción
nano .env.local
```

### 3. Variables de Entorno de Producción

```bash
# Base de datos
DATABASE_URL="postgresql://doctorcita:tu_password_seguro@localhost:5432/doctorcita"
DATABASE_DIRECT_URL="postgresql://doctorcita:tu_password_seguro@localhost:5432/doctorcita"

# URLs de producción
NEXT_PUBLIC_WEBAPP_URL='https://tu-dominio.com'
NEXT_PUBLIC_WEBSITE_URL='https://tu-dominio.com'
NEXTAUTH_URL="https://tu-dominio.com/api/auth"

# Seguridad
NEXTAUTH_SECRET="genera-una-clave-secreta-muy-larga-y-aleatoria"
CALENDSO_ENCRYPTION_KEY="otra-clave-secreta-para-encriptacion"

# Email
EMAIL_FROM="noreply@tu-dominio.com"
EMAIL_SERVER_HOST="smtp.tu-proveedor.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="tu-email@tu-dominio.com"
EMAIL_SERVER_PASSWORD="tu-password-email"

# Doctorcita específicas
MEDICAL_MODE=true
PATIENT_REMINDERS=true
COMPANY_NAME="Doctorcita"
```

### 4. Build y Despliegue

```bash
# Ejecutar migraciones de base de datos
yarn workspace @calcom/prisma db-deploy

# Generar cliente Prisma
yarn workspace @calcom/prisma db-generate

# Build de producción
yarn build

# Iniciar con PM2
pm2 start yarn --name "doctorcita" -- start

# Guardar configuración PM2
pm2 save
pm2 startup
```

### 5. Configuración de Nginx

```bash
# Crear configuración del sitio
sudo nano /etc/nginx/sites-available/doctorcita
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/doctorcita /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Verificar renovación automática
sudo certbot renew --dry-run
```

### 7. Monitoreo y Mantenimiento

```bash
# Ver logs de la aplicación
pm2 logs doctorcita

# Monitor en tiempo real
pm2 monit

# Reiniciar aplicación
pm2 restart doctorcita

# Ver estado de PostgreSQL
sudo systemctl status postgresql

# Backup de base de datos
pg_dump -U doctorcita -h localhost doctorcita > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 8. Firewall y Seguridad

```bash
# Configurar UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Configurar fail2ban para protección adicional
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 9. Script de Actualización

```bash
#!/bin/bash
# update-doctorcita.sh

cd /var/www/doctorcita

# Hacer backup de base de datos
pg_dump -U doctorcita -h localhost doctorcita > backup_antes_actualizacion_$(date +%Y%m%d_%H%M%S).sql

# Actualizar código
git pull origin main

# Instalar dependencias actualizadas
yarn install

# Ejecutar migraciones si las hay
yarn workspace @calcom/prisma db-deploy

# Rebuild aplicación
yarn build

# Reiniciar aplicación
pm2 restart doctorcita

echo "Actualización completada"
```

### 10. Troubleshooting Común

```bash
# Si hay problemas de memoria durante el build
export NODE_OPTIONS="--max-old-space-size=4096"

# Si hay problemas con Prisma
yarn workspace @calcom/prisma generate

# Si la aplicación no inicia
pm2 delete doctorcita
pm2 start yarn --name "doctorcita" -- start

# Verificar logs detallados
pm2 logs doctorcita --lines 100
```

## Notas Importantes

1. **Seguridad**: Cambia todas las claves secretas por valores únicos y seguros
2. **Backups**: Configura backups automáticos de la base de datos
3. **Monitoring**: Considera usar herramientas como Grafana o New Relic para monitoreo
4. **SSL**: Asegúrate de que el certificado SSL se renueve automáticamente
5. **Updates**: Mantén el sistema operativo y dependencias actualizadas

## Soporte

Para problemas específicos de despliegue, consulta:
- Logs de la aplicación: `pm2 logs doctorcita`
- Logs de Nginx: `/var/log/nginx/error.log`
- Logs de PostgreSQL: `/var/log/postgresql/postgresql-*.log`