# ==========================================
# DriveGram - Dockerfile para Google Cloud Run
# ==========================================

# Utiliza imagem oficial Node.js LTS leve (Alpine Linux)
FROM node:20-alpine

# Define diretório de trabalho dentro do container
WORKDIR /app

# Instala dependências nativas para compilação se necessário
RUN apk add --no-cache python3 make g++

# Copia manifestos de dependência
COPY package*.json ./

# Instala dependências do projeto
RUN npm install

# Copia todo o código-fonte da aplicação
COPY . .

# Compila o frontend e valida tipagens do TypeScript
RUN npm run build

# Cria diretórios de trabalho de dados e uploads se não existirem
RUN mkdir -p data uploads

# Google Cloud Run define e injeta a variável PORT automaticamente (padrão 8080)
ENV PORT=8080
ENV NODE_ENV=production

# Expõe a porta do container
EXPOSE 8080

# Inicia o servidor backend do DriveGram
CMD ["npm", "run", "server"]
