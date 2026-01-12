FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for native modules (if any) and Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies using lockfile for consistency
RUN npm install


# Generate Prisma Client
RUN npx prisma generate

COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
