#!/data/data/com.termux/files/usr/bin/bash

echo "========================================================"
echo "         🚀 DriveGram - Servidor Mobile Termux"
echo "========================================================"
echo ""

# Evitar que o Android mate o processo em segundo plano
termux-wake-lock 2>/dev/null || true

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Instalando Node.js e ferramentas..."
    pkg update -y && pkg install -y nodejs-lts python make clang
fi

# Instalar dependências se a pasta node_modules não existir
if [ ! -d "node_modules" ]; then
    echo "[*] Instalando dependencias do DriveGram..."
    npm install --omit=dev
fi

# Compilar frontend se a pasta dist não existir
if [ ! -d "dist" ]; then
    echo "[*] Compilando frontend..."
    npm run build
fi

echo ""
echo "========================================================"
echo " ✅ Servidor DriveGram Iniciando no seu Celular!"
echo " 👉 Endereco local: http://127.0.0.1:5000"
echo "========================================================"
echo ""

npm run server
