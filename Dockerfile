FROM node:12.16.3

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install --only=production --no-audit

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
