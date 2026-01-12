FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for native modules (if any) and Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Avoid EINTEGRITY errors by regenerating lockfile inside container
RUN rm -rf package-lock.json
RUN npm install


# Generate Prisma Client
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
