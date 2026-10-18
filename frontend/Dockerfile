# Multi-stage production build for React Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Enable legacy OpenSSL provider required for Webpack 4 / CRA
ENV NODE_OPTIONS=--openssl-legacy-provider

ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm ci

COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# Stage 2: Serve static build with Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
