FROM docker.io/node:18.20.4-bullseye
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y wget gnupg gnupg2 \
    && apt-get update
RUN curl http://nginx.org/keys/nginx_signing.key | apt-key add -
RUN npm install -g npm@10 && \
    npm install -g @angular/cli && \
    rm -rf ~/.npm
RUN apt-get update && \
    apt-get install -y -q nginx
ADD default /etc/nginx/sites-available

RUN mkdir /front-end
COPY package.json *.json /front-end/
WORKDIR /front-end
RUN node --single-threaded /usr/local/lib/node_modules/npm/bin/npm-cli.js install --legacy-peer-deps
COPY src /front-end/src
RUN NODE_OPTIONS="--max-semi-space-size=64 --max-old-space-size=4096" node --single-threaded node_modules/.bin/ng build --configuration development
EXPOSE 443 80
CMD ["nginx", "-g", "daemon off;"]