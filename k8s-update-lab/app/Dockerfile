FROM node:20-alpine

WORKDIR /app

COPY package.json server.js ./

EXPOSE 8080

ENV APP_VERSION=v1.0.0
ENV BG_COLOR="#2563eb"

USER node

CMD ["node", "server.js"]
