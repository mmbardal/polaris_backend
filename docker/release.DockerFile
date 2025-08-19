FROM node:22 AS builder

ARG NPM_TOK

# Create app directory
WORKDIR /app

# Download Goose (wget is available in node:22)
RUN wget -O /goose https://github.com/pressly/goose/releases/download/v3.24.3/goose_linux_x86_64

RUN echo "NPM_TOKEN=${NPM_TOK}" > .env.yarn

RUN corepack enable

# Copy all project
COPY . .

# Install app dependencies
RUN yarn install

# Build project
RUN yarn build:prod

FROM node:22-slim

ARG NPM_TOK

ENV NODE_ENV=production
ENV TZ=Asia/Tehran
#USER node

# Create app directory
WORKDIR /app

RUN apt-get update && \
 apt-get install -y -q --no-install-recommends libfontconfig1 && \
 apt-get clean && \
 rm -rf /var/lib/apt/lists/*

# Install app dependencies
COPY package.json yarn.lock .yarnrc.yml ./

RUN echo "NPM_TOKEN=${NPM_TOK}" > .env.yarn && \
    corepack enable yarn && yarn workspaces focus --production --all && \
    yarn cache clean && \
    rm .env.yarn

COPY migrations ./dist/migrations
COPY --from=builder /app/dist ./dist

# Copy Goose from builder stage with execute permission
COPY --from=builder --chmod=755 /goose /usr/local/bin/goose

EXPOSE 8081

ENTRYPOINT ["node", "--enable-source-maps"]

CMD [ "dist/main.js" ]
