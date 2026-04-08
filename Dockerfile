FROM node:20-slim

RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /app/data

ENV HOSTNAME=0.0.0.0
ENV PORT=3002
ENV NODE_ENV=production

EXPOSE 3002

CMD ["sh", "-c", "npx drizzle-kit push && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && node .next/standalone/server.js"]
