# Etapa de build (instala dependencias)
FROM node:20-alpine AS builder

# Establece el directorio de trabajo
WORKDIR /src

# Copia solo los archivos de configuración para instalar dependencias
COPY src/package*.json ./

# Instala solo dependencias de producción (excluye devDependencies)
RUN npm install --production

# Copia el resto del código fuente (luego filtramos con .dockerignore)
COPY src/ .

# Etapa de runtime final (imagen más pequeña)
FROM node:20-alpine

WORKDIR /src

# Copia solo lo necesario desde el builder
COPY --from=builder /src /src

# Comando de inicio
CMD ["node", "app.js"]
