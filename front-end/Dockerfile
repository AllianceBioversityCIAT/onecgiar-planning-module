FROM docker.io/node:20-bullseye
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y wget gnupg gnupg2 \
    && apt-get update
RUN curl http://nginx.org/keys/nginx_signing.key | apt-key add -
RUN npm install -g @angular/cli && \
    rm -rf ~/.npm
RUN apt-get update && \
    apt-get install -y -q nginx
ADD default /etc/nginx/sites-available

RUN mkdir /front-end
COPY package.json *.json /front-end/
WORKDIR /front-end
RUN npm install --legacy-peer-deps
COPY src /front-end/src
ENV NODE_OPTIONS="--max-old-space-size=8192"
# Accept build version from Jenkins — only injects into environment files when set
# Without Jenkins (local docker compose), both frontend and backend stay on 'dev'
ARG APP_BUILD_VERSION=dev
RUN if [ "$APP_BUILD_VERSION" != "dev" ]; then \
      node -e " \
        const fs = require('fs'); \
        const v = '$APP_BUILD_VERSION'; \
        ['environment.ts', 'environment.staging.ts'].forEach(f => { \
          const p = 'src/environments/' + f; \
          let c = fs.readFileSync(p, 'utf8'); \
          c = c.replace(\"buildVersion: 'dev'\", \"buildVersion: '\" + v + \"'\"); \
          fs.writeFileSync(p, c); \
        }); \
      "; \
    fi
RUN npx ng build --configuration development
EXPOSE 443 80
CMD ["nginx", "-g", "daemon off;"]