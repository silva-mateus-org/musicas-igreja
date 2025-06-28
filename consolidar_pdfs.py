#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para consolidar PDFs únicos usando hash MD5
Procura todos os PDFs em subdiretorios e copia apenas os únicos para uma pasta "Todos"
"""

import os
import hashlib
import shutil
from pathlib import Path
import time

# CONFIGURAÇÃO - Altere este path conforme necessário
BASE_DIRECTORY = r"C:\Users\thi_s\Documents\Cifras"

def get_file_hash(file_path):
    """Gerar hash MD5 de um arquivo para identificar duplicatas."""
    hash_md5 = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            # Lê o arquivo em chunks para economizar memória com arquivos grandes
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except Exception as e:
        print(f"❌ Erro ao calcular hash do arquivo {file_path}: {e}")
        return None

def find_all_pdfs(base_path):
    """Encontrar todos os arquivos PDF em todos os subdiretorios."""
    pdf_files = []
    base_path = Path(base_path)
    
    if not base_path.exists():
        print(f"❌ Diretório não encontrado: {base_path}")
        return pdf_files
    
    print(f"🔍 Procurando PDFs em: {base_path}")
    
    # Usar rglob para busca recursiva
    try:
        for pdf_file in base_path.rglob("*.pdf"):
            if pdf_file.is_file():
                pdf_files.append(pdf_file)
                print(f"  📄 Encontrado: {pdf_file.relative_to(base_path)}")
    except Exception as e:
        print(f"❌ Erro ao buscar PDFs: {e}")
    
    return pdf_files

def create_todos_folder(base_path):
    """Criar pasta 'Todos' no diretório base."""
    todos_path = Path(base_path) / "Todos"
    
    try:
        todos_path.mkdir(exist_ok=True)
        print(f"📁 Pasta 'Todos' criada/verificada em: {todos_path}")
        return todos_path
    except Exception as e:
        print(f"❌ Erro ao criar pasta 'Todos': {e}")
        return None

def consolidate_unique_pdfs(base_directory):
    """Função principal para consolidar PDFs únicos."""
    start_time = time.time()
    
    print("=" * 60)
    print("🎵 CONSOLIDADOR DE PDFs ÚNICOS 🎵")
    print("=" * 60)
    print(f"📂 Diretório base: {base_directory}")
    print()
    
    # Verificar se o diretório base existe
    if not os.path.exists(base_directory):
        print(f"❌ Diretório base não encontrado: {base_directory}")
        return False
    
    # Criar pasta "Todos"
    todos_folder = create_todos_folder(base_directory)
    if not todos_folder:
        return False
    
    print()
    
    # Encontrar todos os PDFs
    all_pdfs = find_all_pdfs(base_directory)
    
    if not all_pdfs:
        print("⚠️  Nenhum arquivo PDF encontrado!")
        return False
    
    print(f"\n📊 Total de PDFs encontrados: {len(all_pdfs)}")
    print("\n🔍 Calculando hashes MD5 para identificar duplicatas...")
    
    # Dicionário para armazenar hash -> caminho do primeiro arquivo encontrado
    unique_files = {}  # hash -> (primeiro_arquivo, nome_limpo)
    duplicates = []    # Lista de duplicatas encontradas
    
    # Analisar cada PDF
    for i, pdf_file in enumerate(all_pdfs, 1):
        print(f"  [{i:3d}/{len(all_pdfs)}] Analisando: {pdf_file.name}")
        
        # Calcular hash MD5
        file_hash = get_file_hash(pdf_file)
        if file_hash is None:
            continue
        
        if file_hash in unique_files:
            # Arquivo duplicado encontrado
            original_file = unique_files[file_hash][0]
            duplicates.append((pdf_file, original_file))
            print(f"      🔄 Duplicata de: {original_file.name}")
        else:
            # Arquivo único
            # Gerar nome limpo (sem caracteres especiais problemáticos)
            clean_name = sanitize_filename(pdf_file.name)
            unique_files[file_hash] = (pdf_file, clean_name)
            print(f"      ✅ Único (hash: {file_hash[:8]}...)")
    
    print(f"\n📈 Resumo da análise:")
    print(f"  📄 Arquivos únicos: {len(unique_files)}")
    print(f"  🔄 Duplicatas encontradas: {len(duplicates)}")
    
    if duplicates:
        print(f"\n📋 Lista de duplicatas:")
        for duplicate, original in duplicates:
            print(f"  🔄 {duplicate.relative_to(Path(base_directory))} -> {original.relative_to(Path(base_directory))}")
    
    # Copiar arquivos únicos para a pasta "Todos"
    print(f"\n📦 Copiando {len(unique_files)} arquivos únicos para a pasta 'Todos'...")
    
    copied_count = 0
    error_count = 0
    
    for i, (file_hash, (source_file, clean_name)) in enumerate(unique_files.items(), 1):
        try:
            destination_path = todos_folder / clean_name
            
            # Verificar se já existe um arquivo com o mesmo nome no destino
            counter = 1
            original_name = clean_name
            while destination_path.exists():
                name_parts = original_name.rsplit('.', 1)
                if len(name_parts) == 2:
                    clean_name = f"{name_parts[0]}_{counter}.{name_parts[1]}"
                else:
                    clean_name = f"{original_name}_{counter}"
                destination_path = todos_folder / clean_name
                counter += 1
            
            # Copiar arquivo
            shutil.copy2(source_file, destination_path)
            copied_count += 1
            
            print(f"  [{i:3d}/{len(unique_files)}] ✅ {source_file.name} -> {clean_name}")
            
        except Exception as e:
            error_count += 1
            print(f"  [{i:3d}/{len(unique_files)}] ❌ Erro ao copiar {source_file.name}: {e}")
    
    # Estatísticas finais
    end_time = time.time()
    duration = end_time - start_time
    
    print("\n" + "=" * 60)
    print("📊 RELATÓRIO FINAL")
    print("=" * 60)
    print(f"⏱️  Tempo de execução: {duration:.2f} segundos")
    print(f"📂 Diretório de origem: {base_directory}")
    print(f"📁 Pasta de destino: {todos_folder}")
    print(f"📄 PDFs encontrados: {len(all_pdfs)}")
    print(f"✅ Arquivos únicos identificados: {len(unique_files)}")
    print(f"🔄 Duplicatas encontradas: {len(duplicates)}")
    print(f"📦 Arquivos copiados com sucesso: {copied_count}")
    if error_count > 0:
        print(f"❌ Erros durante cópia: {error_count}")
    print("=" * 60)
    
    return True

def sanitize_filename(filename):
    """Sanitizar nome de arquivo removendo caracteres problemáticos."""
    # Caracteres problemáticos em nomes de arquivo no Windows
    invalid_chars = '<>:"/\\|?*'
    
    # Substituir caracteres inválidos por underscore
    clean_name = filename
    for char in invalid_chars:
        clean_name = clean_name.replace(char, '_')
    
    # Remover espaços extras e limitar tamanho
    clean_name = ' '.join(clean_name.split())
    
    # Limitar tamanho do nome (deixar espaço para extensão)
    if len(clean_name) > 200:
        name_part = clean_name[:190]
        extension = clean_name[190:]
        if '.' in extension:
            extension = '.' + extension.split('.')[-1]
        else:
            extension = '.pdf'
        clean_name = name_part + extension
    
    return clean_name

if __name__ == "__main__":
    # Executar o consolidador
    success = consolidate_unique_pdfs(BASE_DIRECTORY)
    
    if success:
        print("\n🎉 Consolidação concluída com sucesso!")
        input("\nPressione Enter para sair...")
    else:
        print("\n😞 Consolidação não pôde ser concluída.")
        input("\nPressione Enter para sair...") 