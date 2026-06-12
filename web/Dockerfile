# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30.2-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD envsubst '${PORT}' < /etc/nginx/conf.d/default.conf > /tmp/default.conf && \
    mv /tmp/default.conf /etc/nginx/conf.d/default.conf && \
    nginx -g "daemon off;"
