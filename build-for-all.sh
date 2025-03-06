#!/bin/bash

# Função para imprimir mensagens com cores
print_message() {
    local message=$1
    local color=$2
    local timestamp
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo -e "${color}[${timestamp}] ${message}\033[0m"
}

# Função para compilar para diferentes sistemas
build_for_os() {
    local os=$1
    local arch=$2
    local output=$3

    print_message "Building for $os ($arch)..." "\033[0;33m" # Amarelo
    GOOS=$os GOARCH=$arch go build -o "$output"
    if [ $? -eq 0 ]; then
        print_message "Build successful for $os ($arch)!" "\033[0;32m" # Verde
    else
        print_message "Build failed for $os ($arch)." "\033[0;31m" # Vermelho
    fi
}

# Compilando para diferentes plataformas
build_for_os "windows" "386" "Passa ou Repassa (32-bits).exe"
build_for_os "windows" "amd64" "Passa ou Repassa (64-bits).exe"
build_for_os "linux" "amd64" "Passa ou Repassa (64-bits Linux)"
build_for_os "linux" "386" "Passa ou Repassa (32-bits Linux)"

print_message "Build process completed." "\033[0;36m" # Ciano
