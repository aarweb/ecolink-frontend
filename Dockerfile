# Etapa builder
FROM node:18-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ git
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# Etapa nginx
FROM nginx:stable-alpine

# Quita la config por defecto
RUN rm /etc/nginx/conf.d/default.conf

# Copia tu config de proxy (chat + api + spa)
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Limpia los estáticos por defecto
RUN rm -rf /usr/share/nginx/html/*

# COPIA TODO el contenido del build de Angular
COPY --from=builder /app/dist/ecolink/browser /usr/share/nginx/html/


EXPOSE 80
