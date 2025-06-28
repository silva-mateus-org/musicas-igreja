import os
import sqlite3
import shutil
from datetime import datetime
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, flash, session
from werkzeug.utils import secure_filename
import pypdf
from pypdf import PdfReader, PdfWriter
import hashlib
import mimetypes
import re
import tempfile
import time

app = Flask(__name__)
app.secret_key = 'pdf-organizer-secret-key-2024'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Configuration
UPLOAD_FOLDER = 'uploads'
ORGANIZED_FOLDER = 'organized'
DATABASE = 'pdf_organizer.db'

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(ORGANIZED_FOLDER, exist_ok=True)

def hash_password(password):
    """Gerar hash MD5 da senha."""
    return hashlib.md5(password.encode()).hexdigest()

def is_admin_logged():
    """Verificar se o admin está logado."""
    return session.get('admin_logged', False)

def admin_password_exists():
    """Verificar se senha de admin já foi criada."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM admin_settings WHERE key = ?', ('admin_password',))
    exists = cursor.fetchone()[0] > 0
    conn.close()
    return exists

def verify_admin_password(password):
    """Verificar senha do admin."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT value FROM admin_settings WHERE key = ?', ('admin_password',))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        stored_hash = result[0]
        return hash_password(password) == stored_hash
    return False

def create_admin_password(password):
    """Criar senha do admin."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    password_hash = hash_password(password)
    cursor.execute('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)', 
                   ('admin_password', password_hash))
    conn.commit()
    conn.close()

def sanitize_filename(text):
    """Sanitizar texto para uso em nomes de arquivos."""
    if not text:
        return ""
    # Remove caracteres inválidos e substitui por underscore
    text = re.sub(r'[<>:"/\\|?*]', '_', text)
    # Remove espaços extras e quebras de linha
    text = re.sub(r'\s+', ' ', text.strip())
    return text

def generate_filename(song_name, artist, original_filename):
    """Gerar nome de arquivo baseado na música e artista."""
    print(f"    [FILENAME] Gerando nome do arquivo:")
    print(f"    [FILENAME] - song_name: '{song_name}'")
    print(f"    [FILENAME] - artist: '{artist}'")
    print(f"    [FILENAME] - original_filename: '{original_filename}'")
    
    if song_name and artist:
        filename = f"{sanitize_filename(song_name)} - {sanitize_filename(artist)}.pdf"
        print(f"    [FILENAME] - Usando padrão 'Música - Artista': '{filename}'")
    elif song_name:
        filename = f"{sanitize_filename(song_name)}.pdf"
        print(f"    [FILENAME] - Usando apenas música: '{filename}'")
    elif artist:
        filename = f"{sanitize_filename(artist)}.pdf"
        print(f"    [FILENAME] - Usando apenas artista: '{filename}'")
    else:
        # Fallback para nome original
        filename = original_filename
        print(f"    [FILENAME] - Usando nome original: '{filename}'")
    
    print(f"    [FILENAME] - Resultado final: '{filename}'")
    return filename

def move_file_to_category(file_path, old_category, new_category, filename):
    """Mover arquivo entre diretórios de categorias."""
    try:
        print(f"    [MOVE] Iniciando movimentação:")
        print(f"    [MOVE] - Arquivo: {file_path}")
        print(f"    [MOVE] - Categoria antiga: {old_category}")
        print(f"    [MOVE] - Categoria nova: {new_category}")
        print(f"    [MOVE] - Nome desejado: {filename}")
        
        old_category_folder = os.path.join(ORGANIZED_FOLDER, old_category)
        new_category_folder = os.path.join(ORGANIZED_FOLDER, new_category)
        
        print(f"    [MOVE] - Pasta antiga: {old_category_folder}")
        print(f"    [MOVE] - Pasta nova: {new_category_folder}")
        
        # Criar novo diretório se não existir
        if not os.path.exists(new_category_folder):
            print(f"    [MOVE] - Criando diretório: {new_category_folder}")
            os.makedirs(new_category_folder, exist_ok=True)
        else:
            print(f"    [MOVE] - Diretório já existe: {new_category_folder}")
        
        # Caminhos completos
        old_path = file_path
        new_path = os.path.join(new_category_folder, filename)
        
        print(f"    [MOVE] - Caminho origem: {old_path}")
        print(f"    [MOVE] - Caminho destino: {new_path}")
        print(f"    [MOVE] - Arquivo origem existe: {os.path.exists(old_path)}")
        
        # Verificar se arquivo precisa ser movido
        if os.path.normpath(os.path.dirname(old_path)) != os.path.normpath(new_category_folder):
            print(f"    [MOVE] - Arquivo precisa ser movido")
            
            # Garantir nome único no destino
            counter = 1
            base_name = os.path.splitext(filename)[0]
            final_filename = filename
            final_path = new_path
            
            while os.path.exists(final_path):
                print(f"    [MOVE] - Arquivo {final_path} já existe, tentando nome alternativo...")
                final_filename = f"{base_name}_{counter}.pdf"
                final_path = os.path.join(new_category_folder, final_filename)
                counter += 1
            
            print(f"    [MOVE] - Nome final: {final_filename}")
            print(f"    [MOVE] - Caminho final: {final_path}")
            
            # Verificar se o arquivo origem realmente existe antes de mover
            if not os.path.exists(old_path):
                print(f"    [MOVE] - ERRO: Arquivo origem não existe!")
                return file_path, os.path.basename(file_path)
            
            # Mover arquivo
            print(f"    [MOVE] - Executando movimentação...")
            shutil.move(old_path, final_path)
            print(f"    [MOVE] - Arquivo movido com sucesso!")
            
            return final_path, final_filename
        else:
            print(f"    [MOVE] - Arquivo já está no diretório correto")
            
            # Mesmo no diretório correto, pode precisar renomear
            if os.path.basename(old_path) != filename:
                print(f"    [MOVE] - Renomeando no mesmo diretório...")
                new_path_rename = os.path.join(new_category_folder, filename)
                
                # Verificar se nome já existe
                counter = 1
                base_name = os.path.splitext(filename)[0]
                final_filename = filename
                final_path = new_path_rename
                
                while os.path.exists(final_path) and final_path != old_path:
                    print(f"    [MOVE] - Nome {final_filename} já existe, tentando alternativo...")
                    final_filename = f"{base_name}_{counter}.pdf"
                    final_path = os.path.join(new_category_folder, final_filename)
                    counter += 1
                
                if final_path != old_path:
                    print(f"    [MOVE] - Renomeando {old_path} -> {final_path}")
                    os.rename(old_path, final_path)
                    return final_path, final_filename
                else:
                    print(f"    [MOVE] - Nome já é o correto")
            
            return file_path, os.path.basename(file_path)
        
    except Exception as e:
        print(f"    [MOVE] - ERRO ao mover arquivo: {e}")
        import traceback
        traceback.print_exc()
        return file_path, os.path.basename(file_path)

def scan_and_fix_files():
    """Escanear e corrigir arquivos que precisam de renomeação ou reorganização."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, filename, song_name, artist, category, file_path 
        FROM pdf_files
    ''')
    files = cursor.fetchall()
    
    print(f"[DEBUG] Encontrados {len(files)} arquivos no banco de dados")
    
    changes_made = []
    
    for file_data in files:
        file_id, current_filename, song_name, artist, category, current_path = file_data
        
        print(f"[DEBUG] Processando arquivo ID {file_id}:")
        print(f"  - Nome atual: {current_filename}")
        print(f"  - Música: {song_name}")
        print(f"  - Artista: {artist}")
        print(f"  - Categoria: {category}")
        print(f"  - Caminho atual: {current_path}")
        
        # Gerar nome ideal do arquivo
        ideal_filename = generate_filename(song_name, artist, current_filename)
        print(f"  - Nome ideal: {ideal_filename}")
        
        # Verificar se arquivo está no diretório correto
        expected_dir = os.path.join(ORGANIZED_FOLDER, category)
        current_dir = os.path.dirname(current_path)
        
        print(f"  - Diretório atual: {current_dir}")
        print(f"  - Diretório esperado: {expected_dir}")
        
        needs_rename = current_filename != ideal_filename
        needs_move = os.path.normpath(current_dir) != os.path.normpath(expected_dir)
        
        print(f"  - Precisa renomear: {needs_rename}")
        print(f"  - Precisa mover: {needs_move}")
        print(f"  - Arquivo existe: {os.path.exists(current_path)}")
        
        if needs_rename or needs_move:
            try:
                print(f"  - [AÇÃO] Processando correções...")
                
                # Mover/renomear arquivo
                if needs_move:
                    print(f"  - [AÇÃO] Movendo de {current_dir} para {expected_dir}")
                    new_path, new_filename = move_file_to_category(
                        current_path, 
                        os.path.basename(current_dir), 
                        category, 
                        ideal_filename
                    )
                    print(f"  - [RESULTADO] Novo caminho: {new_path}")
                    print(f"  - [RESULTADO] Novo nome: {new_filename}")
                else:
                    # Apenas renomear
                    print(f"  - [AÇÃO] Renomeando apenas...")
                    new_path = os.path.join(current_dir, ideal_filename)
                    if current_path != new_path and not os.path.exists(new_path):
                        print(f"  - [AÇÃO] Renomeando {current_path} -> {new_path}")
                        os.rename(current_path, new_path)
                        new_filename = ideal_filename
                    else:
                        print(f"  - [AVISO] Arquivo destino já existe ou caminhos são iguais")
                        new_filename = current_filename
                        new_path = current_path
                
                # Atualizar banco de dados
                print(f"  - [AÇÃO] Atualizando banco de dados...")
                cursor.execute('''
                    UPDATE pdf_files 
                    SET filename = ?, file_path = ? 
                    WHERE id = ?
                ''', (new_filename, new_path, file_id))
                
                changes_made.append({
                    'id': file_id,
                    'old_filename': current_filename,
                    'new_filename': new_filename,
                    'old_path': current_path,
                    'new_path': new_path
                })
                
                print(f"  - [SUCESSO] Arquivo processado com sucesso!")
                
            except Exception as e:
                print(f"  - [ERRO] Erro ao processar arquivo {file_id}: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"  - [INFO] Arquivo já está correto, nenhuma ação necessária")
        
        print(f"  - [SEPARADOR] " + "="*50)
    
    conn.commit()
    conn.close()
    
    print(f"[DEBUG] Escaneamento concluído. {len(changes_made)} alterações feitas.")
    return changes_made

def get_categories():
    """Buscar todas as categorias do banco de dados."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM categories ORDER BY name')
    categories = [row[0] for row in cursor.fetchall()]
    conn.close()
    return categories

def get_artists():
    """Obter lista de artistas do banco de dados."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM artists ORDER BY name')
    artists = [row[0] for row in cursor.fetchall()]
    conn.close()
    return artists

def get_liturgical_times():
    """Buscar todos os tempos litúrgicos do banco de dados."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM liturgical_times ORDER BY name')
    times = [row[0] for row in cursor.fetchall()]
    conn.close()
    return times

def get_musical_keys():
    """Obter lista de tons musicais."""
    return [
    # Tons maiores
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    # Tons menores
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
]

def create_category(name, description=""):
    """Criar nova categoria."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO categories (name, description) VALUES (?, ?)', (name, description))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def create_artist(name, description=""):
    """Criar novo artista."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO artists (name, description) VALUES (?, ?)', (name, description))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def create_liturgical_time(name, description=""):
    """Criar novo tempo litúrgico."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO liturgical_times (name, description) VALUES (?, ?)', (name, description))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def add_file_categories(file_id, category_names):
    """Adicionar múltiplas categorias a um arquivo."""
    if not category_names:
        return
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Primeiro, remover categorias existentes
    cursor.execute('DELETE FROM file_categories WHERE file_id = ?', (file_id,))
    
    for category_name in category_names:
        # Obter ou criar categoria
        cursor.execute('SELECT id FROM categories WHERE name = ?', (category_name,))
        category_result = cursor.fetchone()
        
        if not category_result:
            cursor.execute('INSERT INTO categories (name) VALUES (?)', (category_name,))
            category_id = cursor.lastrowid
        else:
            category_id = category_result[0]
        
        # Adicionar relacionamento
        cursor.execute('''
            INSERT OR IGNORE INTO file_categories (file_id, category_id) 
            VALUES (?, ?)
        ''', (file_id, category_id))
    
    conn.commit()
    conn.close()

def add_file_liturgical_times(file_id, liturgical_time_names):
    """Adicionar múltiplos tempos litúrgicos a um arquivo."""
    if not liturgical_time_names:
        return
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Primeiro, remover tempos litúrgicos existentes
    cursor.execute('DELETE FROM file_liturgical_times WHERE file_id = ?', (file_id,))
    
    for time_name in liturgical_time_names:
        # Obter ou criar tempo litúrgico
        cursor.execute('SELECT id FROM liturgical_times WHERE name = ?', (time_name,))
        time_result = cursor.fetchone()
        
        if not time_result:
            cursor.execute('INSERT INTO liturgical_times (name) VALUES (?)', (time_name,))
            time_id = cursor.lastrowid
        else:
            time_id = time_result[0]
        
        # Adicionar relacionamento
        cursor.execute('''
            INSERT OR IGNORE INTO file_liturgical_times (file_id, liturgical_time_id) 
            VALUES (?, ?)
        ''', (file_id, time_id))
    
    conn.commit()
    conn.close()

def get_file_categories(file_id):
    """Obter todas as categorias de um arquivo."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT c.name 
        FROM categories c
        JOIN file_categories fc ON c.id = fc.category_id
        WHERE fc.file_id = ?
        ORDER BY c.name
    ''', (file_id,))
    categories = [row[0] for row in cursor.fetchall()]
    conn.close()
    return categories

def get_file_liturgical_times(file_id):
    """Obter todos os tempos litúrgicos de um arquivo."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT lt.name 
        FROM liturgical_times lt
        JOIN file_liturgical_times flt ON lt.id = flt.liturgical_time_id
        WHERE flt.file_id = ?
        ORDER BY lt.name
    ''', (file_id,))
    times = [row[0] for row in cursor.fetchall()]
    conn.close()
    return times

def rename_merge_list(list_id, new_name):
    """Renomear lista de fusão."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE merge_lists 
            SET name = ?, updated_date = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (new_name, list_id))
        conn.commit()
        return True
    except Exception:
        return False
    finally:
        conn.close()

def clean_database_and_files():
    """APENAS PARA ADMIN: Limpar completamente banco e arquivos."""
    if not is_admin_logged():
        return False, "Esta função requer acesso de administrador"
    
    try:
        # Remover arquivos organizados
        if os.path.exists(ORGANIZED_FOLDER):
            shutil.rmtree(ORGANIZED_FOLDER)
        os.makedirs(ORGANIZED_FOLDER, exist_ok=True)
        
        # Limpar uploads
        if os.path.exists(UPLOAD_FOLDER):
            for file in os.listdir(UPLOAD_FOLDER):
                os.remove(os.path.join(UPLOAD_FOLDER, file))
        
        # Salvar senha do admin antes de limpar
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('SELECT value FROM admin_settings WHERE key = ?', ('admin_password',))
        admin_password = cursor.fetchone()
        conn.close()
        
        # Recrear banco de dados
        if os.path.exists(DATABASE):
            os.remove(DATABASE)
        init_db()
        
        # Restaurar senha do admin
        if admin_password:
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute('INSERT INTO admin_settings (key, value) VALUES (?, ?)', 
                           ('admin_password', admin_password[0]))
            conn.commit()
            conn.close()
        
        return True, "Banco de dados e arquivos limpos com sucesso"
    except Exception as e:
        return False, f"Erro ao limpar: {str(e)}"

def init_db():
    """Inicializar o banco de dados com as tabelas necessárias."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pdf_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            song_name TEXT,
            artist TEXT,
            category TEXT NOT NULL,
            liturgical_time TEXT,
            musical_key TEXT,
            youtube_link TEXT,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            file_hash TEXT UNIQUE,
            page_count INTEGER,
            description TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS artists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS liturgical_times (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS merge_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS merge_list_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merge_list_id INTEGER NOT NULL,
            pdf_file_id INTEGER NOT NULL,
            order_position INTEGER NOT NULL,
            FOREIGN KEY (merge_list_id) REFERENCES merge_lists (id) ON DELETE CASCADE,
            FOREIGN KEY (pdf_file_id) REFERENCES pdf_files (id) ON DELETE CASCADE
        )
    ''')
    
    # Tabelas para relacionamento muitos-para-muitos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS file_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            FOREIGN KEY (file_id) REFERENCES pdf_files (id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
            UNIQUE(file_id, category_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS file_liturgical_times (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL,
            liturgical_time_id INTEGER NOT NULL,
            FOREIGN KEY (file_id) REFERENCES pdf_files (id) ON DELETE CASCADE,
            FOREIGN KEY (liturgical_time_id) REFERENCES liturgical_times (id) ON DELETE CASCADE,
            UNIQUE(file_id, liturgical_time_id)
        )
    ''')
    
    # Adicionar colunas se não existirem (para compatibilidade)
    try:
        cursor.execute('ALTER TABLE pdf_files ADD COLUMN liturgical_time TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        cursor.execute('ALTER TABLE pdf_files ADD COLUMN musical_key TEXT')
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute('ALTER TABLE pdf_files ADD COLUMN youtube_link TEXT')
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute('ALTER TABLE pdf_files ADD COLUMN song_name TEXT')
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute('ALTER TABLE pdf_files ADD COLUMN artist TEXT')
    except sqlite3.OperationalError:
        pass
    
    # Inserir dados padrão se as tabelas estiverem vazias
    default_categories = [
        'Entrada', 'Ato penitencial', 'Glória', 'Salmo', 'Aclamação', 
        'Ofertório', 'Santo', 'Cordeiro', 'Comunhão', 'Pós Comunhão', 
        'Final', 'Diversos', 'Maria', 'Espírito Santo'
    ]
    
    default_liturgical_times = [
        'Tempo Comum', 'Quaresma', 'Advento', 'Natal'
    ]
    
    default_artists = [
        'Padre Zezinho', 'Padre Marcelo Rossi', 'Padre Antônio Maria', 
        'Padre Fábio de Melo', 'Irmã Kelly Patrícia', 'Eliana Ribeiro',
        'Dunga', 'Ministério Adoração e Vida', 'Comunidade Católica Shalom',
        'Padre Joãozinho', 'Rosa de Saron', 'Anjos de Resgate',
        'Músicas Católicas', 'Cantoral Popular', 'Coral Diocesano'
    ]
    
    for category in default_categories:
        cursor.execute('INSERT OR IGNORE INTO categories (name) VALUES (?)', (category,))
    
    for time in default_liturgical_times:
        cursor.execute('INSERT OR IGNORE INTO liturgical_times (name) VALUES (?)', (time,))
    
    for artist in default_artists:
        cursor.execute('INSERT OR IGNORE INTO artists (name) VALUES (?)', (artist,))
    
    conn.commit()
    conn.close()

def reset_database():
    """Reset the database - remove all data and recreate tables with current categories."""
    # Remove database file
    if os.path.exists(DATABASE):
        os.remove(DATABASE)
    
    # Remove organized folder to start fresh
    if os.path.exists(ORGANIZED_FOLDER):
        shutil.rmtree(ORGANIZED_FOLDER)
    os.makedirs(ORGANIZED_FOLDER, exist_ok=True)
    
    # Recreate database
    init_db()
    print("Banco de dados resetado com sucesso! Categorias atualizadas.")

def get_pdf_info(file_path):
    """Extract basic information from PDF file."""
    try:
        reader = PdfReader(file_path)
        return {'page_count': len(reader.pages)}
    except Exception as e:
        print(f"Error reading PDF info: {e}")
        return {'page_count': 0}

def get_file_hash(file_path):
    """Generate MD5 hash of file for duplicate detection."""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

@app.route('/')
def index():
    """Página inicial mostrando todos os arquivos PDF."""
    view_mode = request.args.get('view', 'list')  # Padrão alterado para 'list'
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, filename, original_name, song_name, artist, category, liturgical_time, 
               musical_key, youtube_link, file_size, upload_date, page_count, description FROM pdf_files
        ORDER BY upload_date DESC
    ''')
    files_raw = cursor.fetchall()
    
    # Enriquecer cada arquivo com suas múltiplas categorias e tempos litúrgicos
    files = []
    for file_data in files_raw:
        file_id = file_data[0]
        
        # Obter todas as categorias do arquivo
        cursor.execute('''
            SELECT c.name 
            FROM categories c
            JOIN file_categories fc ON c.id = fc.category_id
            WHERE fc.file_id = ?
            ORDER BY c.name
        ''', (file_id,))
        file_categories = [row[0] for row in cursor.fetchall()]
        
        # Se não tem categorias nas tabelas de relacionamento, usar a categoria principal
        if not file_categories and file_data[5]:  # file_data[5] é category
            file_categories = [file_data[5]]
        
        # Obter todos os tempos litúrgicos do arquivo
        cursor.execute('''
            SELECT lt.name 
            FROM liturgical_times lt
            JOIN file_liturgical_times flt ON lt.id = flt.liturgical_time_id
            WHERE flt.file_id = ?
            ORDER BY lt.name
        ''', (file_id,))
        file_liturgical_times = [row[0] for row in cursor.fetchall()]
        
        # Se não tem tempos nas tabelas de relacionamento, usar o tempo principal
        if not file_liturgical_times and file_data[6]:  # file_data[6] é liturgical_time
            file_liturgical_times = [file_data[6]]
        
        # Adicionar as listas ao tuple original
        files.append(file_data + (file_categories, file_liturgical_times))
    
    cursor.execute('SELECT name FROM categories ORDER BY name')
    categories = [row[0] for row in cursor.fetchall()]
    
    cursor.execute('''
        SELECT ml.id, ml.name, ml.created_date, ml.updated_date,
               COUNT(mli.id) as file_count
        FROM merge_lists ml
        LEFT JOIN merge_list_items mli ON ml.id = mli.merge_list_id
        GROUP BY ml.id, ml.name, ml.created_date, ml.updated_date
        ORDER BY ml.updated_date DESC
    ''')
    merge_lists = cursor.fetchall()
    
    conn.close()
    return render_template('index.html', files=files, categories=categories, 
                         liturgical_times=get_liturgical_times(), merge_lists=merge_lists, 
                         view_mode=view_mode)

@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    """Upload PDF files with metadata including categories and liturgical times."""
    if request.method == 'POST':
        upload_mode = request.form.get('upload_mode', 'single')
        
        if upload_mode == 'bulk':
            # Processar upload em lote
            if 'file' not in request.files:
                return 'Nenhum arquivo selecionado', 400
            
            file = request.files['file']
            song_name = request.form.get('song_name', '').strip()
            artist = request.form.get('artist', '').strip()
            new_artist = request.form.get('new_artist', '').strip()
            
            # Processar múltiplas categorias e tempos litúrgicos
            selected_categories = request.form.getlist('categories')
            selected_liturgical_times = request.form.getlist('liturgical_times')
            
            musical_key = request.form.get('musical_key', '')
            youtube_link = request.form.get('youtube_link', '')
            description = request.form.get('description', '')
            
            # Usar primeira categoria como principal (para compatibilidade)
            category = selected_categories[0] if selected_categories else 'Diversos'
            liturgical_time = selected_liturgical_times[0] if selected_liturgical_times else ''
            
            # Criar novo artista se especificado
            if new_artist and not artist:
                if create_artist(new_artist):
                    artist = new_artist
                else:
                    # Se artista já existe, usar o existente
                    artist = new_artist
            
            if file.filename == '' or file.filename is None:
                return 'Nenhum arquivo selecionado', 400
            
            if not file.filename.lower().endswith('.pdf'):
                return 'Arquivo deve ser PDF', 400
                
            try:
                # Gerar nome do arquivo baseado nas informações
                final_filename = generate_filename(song_name, artist, secure_filename(file.filename))
                
                temp_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
                file.save(temp_path)
                
                file_hash = get_file_hash(temp_path)
                conn = sqlite3.connect(DATABASE)
                cursor = conn.cursor()
                cursor.execute('SELECT filename FROM pdf_files WHERE file_hash = ?', (file_hash,))
                existing = cursor.fetchone()
                
                if existing:
                    os.remove(temp_path)
                    conn.close()
                    return f'Arquivo já existe: {existing[0]}', 400
                
                category_folder = os.path.join(ORGANIZED_FOLDER, category)
                os.makedirs(category_folder, exist_ok=True)
                
                # Garantir nome único
                counter = 1
                base_name = os.path.splitext(final_filename)[0]
                final_path = os.path.join(category_folder, final_filename)
                
                while os.path.exists(final_path):
                    final_filename = f"{base_name}_{counter}.pdf"
                    final_path = os.path.join(category_folder, final_filename)
                    counter += 1
                
                shutil.move(temp_path, final_path)
                
                pdf_info = get_pdf_info(final_path)
                file_size = os.path.getsize(final_path)
                
                cursor.execute('''
                    INSERT INTO pdf_files 
                    (filename, original_name, song_name, artist, category, liturgical_time, musical_key, youtube_link, file_path, file_size, file_hash, page_count, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (final_filename, file.filename, song_name, artist, category, liturgical_time, musical_key, youtube_link, final_path, file_size, file_hash, pdf_info['page_count'], description))
                
                file_id = cursor.lastrowid
                
                # Adicionar múltiplas categorias
                for category in selected_categories:
                    if category.strip():
                        # Primeiro criar a categoria se não existir
                        cursor.execute('INSERT OR IGNORE INTO categories (name) VALUES (?)', (category.strip(),))
                        # Depois obter o ID e criar o relacionamento
                        cursor.execute('SELECT id FROM categories WHERE name = ?', (category.strip(),))
                        category_id = cursor.fetchone()[0]
                        cursor.execute('INSERT OR IGNORE INTO file_categories (file_id, category_id) VALUES (?, ?)', 
                                     (file_id, category_id))
                
                # Adicionar múltiplos tempos litúrgicos
                for liturgical_time in selected_liturgical_times:
                    if liturgical_time.strip():
                        # Primeiro criar o tempo litúrgico se não existir
                        cursor.execute('INSERT OR IGNORE INTO liturgical_times (name) VALUES (?)', (liturgical_time.strip(),))
                        # Depois obter o ID e criar o relacionamento
                        cursor.execute('SELECT id FROM liturgical_times WHERE name = ?', (liturgical_time.strip(),))
                        liturgical_id = cursor.fetchone()[0]
                        cursor.execute('INSERT OR IGNORE INTO file_liturgical_times (file_id, liturgical_time_id) VALUES (?, ?)', 
                                     (file_id, liturgical_id))
                
                conn.commit()
                conn.close()
                
                return f'Upload realizado com sucesso - ID: {file_id}', 200
                
            except Exception as e:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return f'Erro no upload: {str(e)}', 500
        
        else:
            # Modo single upload (comportamento original)
            if 'file' not in request.files:
                flash('Nenhum arquivo selecionado')
                return redirect(request.url)
            
            file = request.files['file']
            song_name = request.form.get('song_name', '').strip()
            artist = request.form.get('artist', '').strip()
            new_artist = request.form.get('new_artist', '').strip()
            
            # Processar múltiplas categorias e tempos litúrgicos
            selected_categories = request.form.getlist('categories')
            selected_liturgical_times = request.form.getlist('liturgical_times')
            
            # Usar primeira categoria como principal (para compatibilidade)
            category = selected_categories[0] if selected_categories else 'Diversos'
            liturgical_time = selected_liturgical_times[0] if selected_liturgical_times else ''
            
            musical_key = request.form.get('musical_key', '')
            youtube_link = request.form.get('youtube_link', '')
            description = request.form.get('description', '')
            
            # Criar novo artista se especificado
            if new_artist and not artist:
                if create_artist(new_artist):
                    artist = new_artist
                    flash(f'Novo artista "{new_artist}" criado!')
                else:
                    flash(f'Artista "{new_artist}" já existe')
                    artist = new_artist
            
            if file.filename == '' or file.filename is None:
                flash('Nenhum arquivo selecionado')
                return redirect(request.url)
                
            if file and file.filename.lower().endswith('.pdf'):
                # Gerar nome do arquivo baseado nas informações
                final_filename = generate_filename(song_name, artist, secure_filename(file.filename))
                
                temp_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
                file.save(temp_path)
                
                file_hash = get_file_hash(temp_path)
                conn = sqlite3.connect(DATABASE)
                cursor = conn.cursor()
                cursor.execute('SELECT filename FROM pdf_files WHERE file_hash = ?', (file_hash,))
                existing = cursor.fetchone()
                
                if existing:
                    os.remove(temp_path)
                    flash(f'Arquivo já existe: {existing[0]}')
                    conn.close()
                    return redirect(url_for('index'))
                
                category_folder = os.path.join(ORGANIZED_FOLDER, category)
                os.makedirs(category_folder, exist_ok=True)
                
                # Garantir nome único
                counter = 1
                base_name = os.path.splitext(final_filename)[0]
                final_path = os.path.join(category_folder, final_filename)
                
                while os.path.exists(final_path):
                    final_filename = f"{base_name}_{counter}.pdf"
                    final_path = os.path.join(category_folder, final_filename)
                    counter += 1
                
                shutil.move(temp_path, final_path)
                
                pdf_info = get_pdf_info(final_path)
                file_size = os.path.getsize(final_path)
                
                cursor.execute('''
                    INSERT INTO pdf_files 
                    (filename, original_name, song_name, artist, category, liturgical_time, musical_key, youtube_link, file_path, file_size, file_hash, page_count, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (final_filename, file.filename, song_name, artist, category, liturgical_time, musical_key, youtube_link, final_path, file_size, file_hash, pdf_info['page_count'], description))
                
                file_id = cursor.lastrowid
                
                # Adicionar múltiplas categorias
                for category in selected_categories:
                    if category.strip():
                        # Primeiro criar a categoria se não existir
                        cursor.execute('INSERT OR IGNORE INTO categories (name) VALUES (?)', (category.strip(),))
                        # Depois obter o ID e criar o relacionamento
                        cursor.execute('SELECT id FROM categories WHERE name = ?', (category.strip(),))
                        category_id = cursor.fetchone()[0]
                        cursor.execute('INSERT OR IGNORE INTO file_categories (file_id, category_id) VALUES (?, ?)', 
                                     (file_id, category_id))
                
                # Adicionar múltiplos tempos litúrgicos
                for liturgical_time in selected_liturgical_times:
                    if liturgical_time.strip():
                        # Primeiro criar o tempo litúrgico se não existir
                        cursor.execute('INSERT OR IGNORE INTO liturgical_times (name) VALUES (?)', (liturgical_time.strip(),))
                        # Depois obter o ID e criar o relacionamento
                        cursor.execute('SELECT id FROM liturgical_times WHERE name = ?', (liturgical_time.strip(),))
                        liturgical_id = cursor.fetchone()[0]
                        cursor.execute('INSERT OR IGNORE INTO file_liturgical_times (file_id, liturgical_time_id) VALUES (?, ?)', 
                                     (file_id, liturgical_id))
                
                conn.commit()
                conn.close()
                
                flash(f'Arquivo enviado com sucesso: {final_filename}')
                return redirect(url_for('index'))
            else:
                flash('Por favor, envie um arquivo PDF válido')
    
    return render_template('upload.html', categories=get_categories(), liturgical_times=get_liturgical_times(), 
                         musical_keys=get_musical_keys(), artists=get_artists())

@app.route('/merge', methods=['GET', 'POST'])
def merge_pdfs():
    """Merge multiple PDF files into one."""
    if request.method == 'POST':
        selected_files = request.form.getlist('selected_files')
        output_name = request.form.get('output_name', 'merged_document.pdf')
        
        if not selected_files or len(selected_files) < 2:
            flash('É necessário selecionar pelo menos 2 arquivos para mesclar')
            return redirect(url_for('index'))
        
        try:
            writer = PdfWriter()
            
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            
            for file_id in selected_files:
                cursor.execute('SELECT file_path FROM pdf_files WHERE id = ?', (file_id,))
                result = cursor.fetchone()
                if result and os.path.exists(result[0]):
                    reader = PdfReader(result[0])
                    for page in reader.pages:
                        writer.add_page(page)
            
            conn.close()
            
            merged_folder = os.path.join(ORGANIZED_FOLDER, 'Merged')
            os.makedirs(merged_folder, exist_ok=True)
            
            counter = 1
            base_name = os.path.splitext(output_name)[0]
            final_output = output_name
            output_path = os.path.join(merged_folder, final_output)
            
            while os.path.exists(output_path):
                final_output = f"{base_name}_{counter}.pdf"
                output_path = os.path.join(merged_folder, final_output)
                counter += 1
            
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            file_hash = get_file_hash(output_path)
            file_size = os.path.getsize(output_path)
            pdf_info = get_pdf_info(output_path)
            
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO pdf_files 
                (filename, original_name, category, file_path, file_size, file_hash, page_count, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (final_output, final_output, 'Merged', output_path, file_size, file_hash, pdf_info['page_count'], 'Merged PDF document'))
            
            conn.commit()
            conn.close()
            
            flash(f'Files merged successfully: {final_output}')
            return redirect(url_for('index'))
            
        except Exception as e:
            flash(f'Error merging files: {str(e)}')
    
    return render_template('merge.html')

@app.route('/merge_lists')
def merge_lists():
    """Gerenciar listas de fusão."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT ml.id, ml.name, ml.created_date, ml.updated_date,
               COUNT(mli.id) as file_count
        FROM merge_lists ml
        LEFT JOIN merge_list_items mli ON ml.id = mli.merge_list_id
        GROUP BY ml.id, ml.name, ml.created_date, ml.updated_date
        ORDER BY ml.updated_date DESC
    ''')
    lists = cursor.fetchall()
    
    conn.close()
    return render_template('merge_lists.html', lists=lists)

@app.route('/create_merge_list', methods=['POST'])
def create_merge_list():
    """Criar nova lista de fusão."""
    list_name = request.form.get('list_name', '').strip()
    selected_files = request.form.getlist('selected_files')
    
    if not list_name:
        flash('Nome da lista é obrigatório')
        return redirect(url_for('index'))
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Criar lista
    cursor.execute('INSERT INTO merge_lists (name) VALUES (?)', (list_name,))
    list_id = cursor.lastrowid
    
    # Adicionar arquivos selecionados
    for i, file_id in enumerate(selected_files):
        cursor.execute('''
            INSERT INTO merge_list_items (merge_list_id, pdf_file_id, order_position)
            VALUES (?, ?, ?)
        ''', (list_id, file_id, i + 1))
    
    conn.commit()
    conn.close()
    
    flash(f'Lista "{list_name}" criada com sucesso!')
    return redirect(url_for('edit_merge_list', list_id=list_id))

@app.route('/edit_merge_list/<int:list_id>')
def edit_merge_list(list_id):
    """Editar lista de fusão ou criar nova lista se list_id=0."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    if list_id == 0:
        # Criar nova lista
        merge_list = (0, "Nova Lista de Música")
        list_files = []
    else:
        # Obter informações da lista existente
        cursor.execute('SELECT id, name FROM merge_lists WHERE id = ?', (list_id,))
        merge_list = cursor.fetchone()
        
        if not merge_list:
            flash('Lista não encontrada')
            return redirect(url_for('merge_lists'))
        
        # Obter arquivos da lista
        cursor.execute('''
            SELECT mli.id, mli.order_position, pf.id as file_id, pf.filename, 
                   pf.original_name, pf.category, pf.page_count
            FROM merge_list_items mli
            JOIN pdf_files pf ON mli.pdf_file_id = pf.id
            WHERE mli.merge_list_id = ?
            ORDER BY mli.order_position
        ''', (list_id,))
        list_files = cursor.fetchall()
    
    # Obter todos os arquivos para adicionar com informações para filtros
    cursor.execute('''
        SELECT id, filename, original_name, song_name, artist, category, liturgical_time 
        FROM pdf_files ORDER BY filename
    ''')
    all_files_raw = cursor.fetchall()
    
    # Enriquecer cada arquivo com suas múltiplas categorias e tempos litúrgicos
    all_files = []
    for file_data in all_files_raw:
        file_id = file_data[0]
        
        # Obter todas as categorias do arquivo
        cursor.execute('''
            SELECT c.name 
            FROM categories c
            JOIN file_categories fc ON c.id = fc.category_id
            WHERE fc.file_id = ?
            ORDER BY c.name
        ''', (file_id,))
        file_categories = [row[0] for row in cursor.fetchall()]
        
        # Se não tem categorias nas tabelas de relacionamento, usar a categoria principal
        if not file_categories and file_data[5]:  # file_data[5] é category
            file_categories = [file_data[5]]
        
        # Obter todos os tempos litúrgicos do arquivo
        cursor.execute('''
            SELECT lt.name 
            FROM liturgical_times lt
            JOIN file_liturgical_times flt ON lt.id = flt.liturgical_time_id
            WHERE flt.file_id = ?
            ORDER BY lt.name
        ''', (file_id,))
        file_liturgical_times = [row[0] for row in cursor.fetchall()]
        
        # Se não tem tempos nas tabelas de relacionamento, usar o tempo principal
        if not file_liturgical_times and file_data[6]:  # file_data[6] é liturgical_time
            file_liturgical_times = [file_data[6]]
        
        # Adicionar as listas ao tuple original
        all_files.append(file_data + (file_categories, file_liturgical_times))
    
    # Obter categorias e tempos litúrgicos para filtros
    cursor.execute('SELECT name FROM categories ORDER BY name')
    categories = [row[0] for row in cursor.fetchall()]
    
    conn.close()
    return render_template('edit_merge_list.html', merge_list=merge_list, 
                         list_files=list_files, all_files=all_files,
                         categories=categories, liturgical_times=get_liturgical_times())

@app.route('/add_to_merge_list/<int:list_id>', methods=['POST'])
def add_to_merge_list(list_id):
    """Adicionar arquivo à lista de fusão."""
    file_id = request.form.get('file_id')
    
    if not file_id:
        flash('Nenhum arquivo selecionado')
        return redirect(url_for('edit_merge_list', list_id=list_id))
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Obter próxima posição
    cursor.execute('SELECT MAX(order_position) FROM merge_list_items WHERE merge_list_id = ?', (list_id,))
    max_pos = cursor.fetchone()[0] or 0
    
    # Adicionar arquivo
    cursor.execute('''
        INSERT INTO merge_list_items (merge_list_id, pdf_file_id, order_position)
        VALUES (?, ?, ?)
    ''', (list_id, file_id, max_pos + 1))
    
    # Atualizar data da lista
    cursor.execute('UPDATE merge_lists SET updated_date = CURRENT_TIMESTAMP WHERE id = ?', (list_id,))
    
    conn.commit()
    conn.close()
    
    flash('Arquivo adicionado à lista')
    return redirect(url_for('edit_merge_list', list_id=list_id))

@app.route('/remove_from_merge_list/<int:item_id>', methods=['POST'])
def remove_from_merge_list(item_id):
    """Remover arquivo da lista de fusão."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Obter list_id antes de deletar
    cursor.execute('SELECT merge_list_id FROM merge_list_items WHERE id = ?', (item_id,))
    result = cursor.fetchone()
    
    if result:
        list_id = result[0]
        cursor.execute('DELETE FROM merge_list_items WHERE id = ?', (item_id,))
        cursor.execute('UPDATE merge_lists SET updated_date = CURRENT_TIMESTAMP WHERE id = ?', (list_id,))
        conn.commit()
        flash('Arquivo removido da lista')
    else:
        flash('Item não encontrado')
        list_id = None
    
    conn.close()
    
    if list_id:
        return redirect(url_for('edit_merge_list', list_id=list_id))
    else:
        return redirect(url_for('merge_lists'))

@app.route('/reorder_merge_list/<int:list_id>', methods=['POST'])
def reorder_merge_list(list_id):
    """Reordenar arquivos na lista de fusão."""
    item_order = request.form.getlist('item_order')
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    for i, item_id in enumerate(item_order):
        cursor.execute('''
            UPDATE merge_list_items 
            SET order_position = ? 
            WHERE id = ? AND merge_list_id = ?
        ''', (i + 1, item_id, list_id))
    
    cursor.execute('UPDATE merge_lists SET updated_date = CURRENT_TIMESTAMP WHERE id = ?', (list_id,))
    conn.commit()
    conn.close()
    
    flash('Ordem dos arquivos atualizada')
    return redirect(url_for('edit_merge_list', list_id=list_id))

@app.route('/merge_from_list/<int:list_id>', methods=['POST'])
def merge_from_list(list_id):
    """Mesclar arquivos de uma lista e baixar diretamente."""
    output_name = request.form.get('output_name', 'Lista Mesclada')
    
    if not output_name.lower().endswith('.pdf'):
        output_name += '.pdf'
    
    output_name = secure_filename(output_name)
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Obter arquivos da lista em ordem
    cursor.execute('''
        SELECT pf.file_path, pf.filename
        FROM merge_list_items mli
        JOIN pdf_files pf ON mli.pdf_file_id = pf.id
        WHERE mli.merge_list_id = ?
        ORDER BY mli.order_position
    ''', (list_id,))
    
    files_to_merge = cursor.fetchall()
    conn.close()
    
    if len(files_to_merge) < 2:
        flash('É necessário pelo menos 2 arquivos para mesclar')
        return redirect(url_for('edit_merge_list', list_id=list_id))
    
    try:
        writer = PdfWriter()
        
        # Mesclar PDFs
        for file_path, filename in files_to_merge:
            if os.path.exists(file_path):
                reader = PdfReader(file_path)
                for page in reader.pages:
                    writer.add_page(page)
        
        # Criar arquivo temporário para download
        import tempfile
        temp_dir = tempfile.gettempdir()
        temp_output = os.path.join(temp_dir, output_name)
        
        with open(temp_output, 'wb') as output_file:
            writer.write(output_file)
        
        # Retornar arquivo para download e limpar depois
        def remove_file():
            try:
                os.remove(temp_output)
            except:
                pass
        
        response = send_file(temp_output, as_attachment=True, download_name=output_name)
        response.call_on_close(remove_file)
        
        return response
        
    except Exception as e:
        flash(f'Erro ao mesclar arquivos: {str(e)}')
        return redirect(url_for('edit_merge_list', list_id=list_id))

@app.route('/delete_merge_list/<int:list_id>', methods=['POST'])
def delete_merge_list(list_id):
    """Deletar lista de fusão."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT name FROM merge_lists WHERE id = ?', (list_id,))
    result = cursor.fetchone()
    
    if result:
        list_name = result[0]
        cursor.execute('DELETE FROM merge_lists WHERE id = ?', (list_id,))
        conn.commit()
        flash(f'Lista "{list_name}" deletada')
    else:
        flash('Lista não encontrada')
    
    conn.close()
    return redirect(url_for('merge_lists'))

@app.route('/duplicate_merge_list/<int:list_id>', methods=['POST'])
def duplicate_merge_list(list_id):
    """Duplicar lista de fusão."""
    new_list_name = request.form.get('new_list_name', '').strip()
    
    if not new_list_name:
        flash('Nome da nova lista é obrigatório')
        return redirect(url_for('merge_lists'))
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Verificar se a lista original existe
    cursor.execute('SELECT name FROM merge_lists WHERE id = ?', (list_id,))
    original_list = cursor.fetchone()
    
    if not original_list:
        flash('Lista original não encontrada')
        conn.close()
        return redirect(url_for('merge_lists'))
    
    try:
        # Criar nova lista
        cursor.execute('INSERT INTO merge_lists (name) VALUES (?)', (new_list_name,))
        new_list_id = cursor.lastrowid
        
        # Copiar todos os itens da lista original
        cursor.execute('''
            INSERT INTO merge_list_items (merge_list_id, pdf_file_id, order_position)
            SELECT ?, pdf_file_id, order_position
            FROM merge_list_items
            WHERE merge_list_id = ?
            ORDER BY order_position
        ''', (new_list_id, list_id))
        
        conn.commit()
        flash(f'Lista "{new_list_name}" criada como cópia de "{original_list[0]}"')
        
        # Redirecionar para a nova lista
        return redirect(url_for('edit_merge_list', list_id=new_list_id))
        
    except Exception as e:
        conn.rollback()
        flash(f'Erro ao duplicar lista: {str(e)}')
    finally:
        conn.close()
    
    return redirect(url_for('merge_lists'))

@app.route('/categories')
def manage_categories():
    """Manage categories."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM categories ORDER BY name')
    categories = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    return render_template('categories.html', categories=categories)

@app.route('/add_category', methods=['POST'])
def add_category():
    """Add a new category."""
    category_name = request.form.get('category_name', '').strip()
    
    if category_name:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO categories (name) VALUES (?)', (category_name,))
            conn.commit()
            flash(f'Category added: {category_name}')
        except sqlite3.IntegrityError:
            flash(f'Category already exists: {category_name}')
        conn.close()
    
    return redirect(url_for('manage_categories'))

@app.route('/reset_db')
def reset_db_route():
    """Rota para resetar o banco de dados (apenas para desenvolvimento)."""
    reset_database()
    flash('Banco de dados resetado com sucesso!')
    return redirect(url_for('index'))

@app.route('/add_song_to_list/<int:file_id>/<int:list_id>', methods=['POST'])
def add_song_to_list(file_id, list_id):
    """Adicionar uma música individual à uma lista existente."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Verificar se a música já está na lista
    cursor.execute('''
        SELECT id FROM merge_list_items 
        WHERE merge_list_id = ? AND pdf_file_id = ?
    ''', (list_id, file_id))
    
    if cursor.fetchone():
        flash('Esta música já está na lista')
    else:
        # Obter próxima posição
        cursor.execute('SELECT MAX(order_position) FROM merge_list_items WHERE merge_list_id = ?', (list_id,))
        max_pos = cursor.fetchone()[0] or 0
        
        # Adicionar música
        cursor.execute('''
            INSERT INTO merge_list_items (merge_list_id, pdf_file_id, order_position)
            VALUES (?, ?, ?)
        ''', (list_id, file_id, max_pos + 1))
        
        # Atualizar data da lista
        cursor.execute('UPDATE merge_lists SET updated_date = CURRENT_TIMESTAMP WHERE id = ?', (list_id,))
        
        # Obter nome da música e da lista para feedback
        cursor.execute('SELECT song_name, original_name FROM pdf_files WHERE id = ?', (file_id,))
        music = cursor.fetchone()
        
        cursor.execute('SELECT name FROM merge_lists WHERE id = ?', (list_id,))
        list_name = cursor.fetchone()[0]
        
        music_name = music[0] or music[1]
        flash(f'"{music_name}" adicionada à lista "{list_name}"')
    
    conn.commit()
    conn.close()
    
    # Retornar para a página anterior
    return redirect(request.referrer or url_for('index'))

@app.route('/add_multiple_to_list/<int:list_id>', methods=['POST'])
def add_multiple_to_list(list_id):
    """Adicionar múltiplas músicas a uma lista existente."""
    file_ids = request.form.getlist('file_ids')
    
    if not file_ids:
        flash('Nenhuma música selecionada')
        return redirect(request.referrer or url_for('index'))
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Obter próxima posição
    cursor.execute('SELECT MAX(order_position) FROM merge_list_items WHERE merge_list_id = ?', (list_id,))
    max_pos = cursor.fetchone()[0] or 0
    
    added_count = 0
    for file_id in file_ids:
        # Verificar se a música já está na lista
        cursor.execute('''
            SELECT id FROM merge_list_items 
            WHERE merge_list_id = ? AND pdf_file_id = ?
        ''', (list_id, file_id))
        
        if not cursor.fetchone():
            max_pos += 1
            cursor.execute('''
                INSERT INTO merge_list_items (merge_list_id, pdf_file_id, order_position)
                VALUES (?, ?, ?)
            ''', (list_id, file_id, max_pos))
            added_count += 1
    
    # Atualizar data da lista
    cursor.execute('UPDATE merge_lists SET updated_date = CURRENT_TIMESTAMP WHERE id = ?', (list_id,))
    
    # Obter nome da lista para feedback
    cursor.execute('SELECT name FROM merge_lists WHERE id = ?', (list_id,))
    list_name = cursor.fetchone()[0]
    
    conn.commit()
    conn.close()
    
    if added_count > 0:
        flash(f'{added_count} música(s) adicionada(s) à lista "{list_name}"')
    else:
        flash('Todas as músicas selecionadas já estão na lista')
    
    return redirect(request.referrer or url_for('index'))

@app.route('/api/merge_lists')
def api_merge_lists():
    """API para obter listas de fusão."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, name FROM merge_lists ORDER BY updated_date DESC')
    lists = cursor.fetchall()
    
    conn.close()
    
    return jsonify([{'id': row[0], 'name': row[1]} for row in lists])

@app.route('/api/get_youtube_link/<int:file_id>')
def api_get_youtube_link(file_id):
    """API para obter link do YouTube de um arquivo."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT youtube_link FROM pdf_files WHERE id = ?', (file_id,))
    result = cursor.fetchone()
    
    conn.close()
    
    if result and result[0]:
        return jsonify({'success': True, 'youtube_link': result[0]})
    else:
        return jsonify({'success': False, 'message': 'Link do YouTube não encontrado'})

def remove_accents_sql(text):
    """Função auxiliar para remover acentos usando SQL REPLACE."""
    if not text:
        return text
    
    # Dicionário de caracteres acentuados para não acentuados
    replacements = {
        'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', 'ñ': 'n',
        'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
        'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
        'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Ç': 'C', 'Ñ': 'N'
    }
    
    result = text
    for accented, plain in replacements.items():
        result = result.replace(accented, plain)
    
    return result

@app.route('/api/search_suggestions')
def api_search_suggestions():
    """API para busca de sugestões (autocomplete) baseado em fuzzy search."""
    query = request.args.get('q', '').strip()
    
    if not query or len(query) < 2:
        return jsonify({'suggestions': []})
    
    # Normalizar query removendo acentos
    normalized_query = remove_accents_sql(query.lower())
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Buscar todos os arquivos e fazer filtragem em Python para melhor controle
    cursor.execute('''
        SELECT id, filename, song_name, artist, musical_key
        FROM pdf_files 
        ORDER BY song_name, artist
    ''')
    
    all_results = cursor.fetchall()
    conn.close()
    
    # Filtrar e ordenar em Python com busca fuzzy sem acentos
    matches = []
    for row in all_results:
        file_id, filename, song_name, artist, musical_key = row
        
        # Normalizar campos para busca
        norm_song = remove_accents_sql((song_name or '').lower())
        norm_artist = remove_accents_sql((artist or '').lower())
        norm_filename = remove_accents_sql((filename or '').lower())
        
        # Verificar se a query está contida em algum campo
        priority = 0
        if normalized_query in norm_song:
            priority = 1 if norm_song.startswith(normalized_query) else 2
        elif normalized_query in norm_artist:
            priority = 3 if norm_artist.startswith(normalized_query) else 4
        elif normalized_query in norm_filename:
            priority = 5
        
        if priority > 0:
            matches.append((priority, row))
    
    # Ordenar por prioridade e pegar os 10 primeiros
    matches.sort(key=lambda x: x[0])
    results = [match[1] for match in matches[:10]]
    
    suggestions = []
    for row in results:
        suggestions.append({
            'id': row[0],
            'filename': row[1],
            'song_name': row[2],
            'artist': row[3],
            'musical_key': row[4]
        })
    
    return jsonify({'suggestions': suggestions})

@app.route('/api/search_artists')
def api_search_artists():
    """API para busca de artistas com autocomplete."""
    query = request.args.get('q', '').strip()
    
    if not query or len(query) < 1:
        return jsonify({'artists': []})
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Buscar artistas que começam com ou contêm a query
    search_query = f'%{query}%'
    cursor.execute('''
        SELECT name FROM artists 
        WHERE LOWER(name) LIKE LOWER(?)
        ORDER BY 
            CASE 
                WHEN LOWER(name) LIKE LOWER(?) THEN 1
                ELSE 2
            END,
            name
        LIMIT 20
    ''', (search_query, f'{query}%'))
    
    results = cursor.fetchall()
    conn.close()
    
    artists = [row[0] for row in results]
    return jsonify({'artists': artists})

@app.route('/api/check_duplicate', methods=['POST'])
def api_check_duplicate():
    """API para verificar se um arquivo é duplicado baseado no hash."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Arquivo deve ser PDF'}), 400
        
        print(f"[DEBUG] Verificando duplicado para arquivo: {file.filename}")
        
        # Abordagem mais segura para Windows - usar tempfile.mkstemp
        temp_fd, temp_path = tempfile.mkstemp(suffix='.pdf')
        try:
            print(f"[DEBUG] Salvando arquivo temporário: {temp_path}")
            
            # Fechar o file descriptor e salvar o arquivo
            os.close(temp_fd)
            file.save(temp_path)
            
            print(f"[DEBUG] Calculando hash do arquivo...")
            file_hash = get_file_hash(temp_path)
            print(f"[DEBUG] Hash calculado: {file_hash}")
            
        finally:
            # Tentar remover o arquivo temporário com retry
            for attempt in range(3):
                try:
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                        print(f"[DEBUG] Arquivo temporário removido (tentativa {attempt + 1})")
                    break
                except PermissionError:
                    if attempt < 2:  # Não é a última tentativa
                        print(f"[DEBUG] Erro ao remover arquivo temporário, tentando novamente em 0.1s...")
                        time.sleep(0.1)
                    else:
                        print(f"[WARNING] Não foi possível remover arquivo temporário: {temp_path}")
        
        # Verificar se hash já existe no banco
        print(f"[DEBUG] Consultando banco de dados...")
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, filename, song_name, artist, category, upload_date 
            FROM pdf_files 
            WHERE file_hash = ?
        ''', (file_hash,))
        
        existing_file = cursor.fetchone()
        conn.close()
        
        if existing_file:
            file_id, filename, song_name, artist, category, upload_date = existing_file
            print(f"[DEBUG] Arquivo duplicado encontrado: ID {file_id} - {filename}")
            return jsonify({
                'isDuplicate': True,
                'existingFile': {
                    'id': file_id,
                    'filename': filename,
                    'song_name': song_name or filename,
                    'artist': artist or 'Não informado',
                    'category': category,
                    'upload_date': upload_date
                }
            })
        else:
            print(f"[DEBUG] Arquivo não é duplicado")
            return jsonify({'isDuplicate': False})
            
    except Exception as e:
        print(f"[ERROR] Erro na API check_duplicate: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro ao processar arquivo: {str(e)}'}), 500

@app.route('/admin/scan_files')
def admin_scan_files():
    """Rota administrativa para escanear e corrigir arquivos."""
    if not is_admin_logged():
        flash('Esta funcionalidade só está disponível para administradores')
        return redirect(url_for('index'))
    
    changes = scan_and_fix_files()
    
    if changes:
        flash(f'{len(changes)} arquivo(s) foram corrigidos!')
        for change in changes:
            flash(f"ID {change['id']}: {change['old_filename']} → {change['new_filename']}")
    else:
        flash('Todos os arquivos já estão organizados corretamente!')
    
    return redirect(url_for('index'))

@app.route('/admin/debug_files')
def admin_debug_files():
    """Rota para debug detalhado dos arquivos e banco de dados."""
    if not is_admin_logged():
        flash('Esta funcionalidade só está disponível para administradores')
        return redirect(url_for('index'))
    
    print("\n" + "="*80)
    print("INÍCIO DO DEBUG DETALHADO")
    print("="*80)
    
    # Verificar estrutura do banco
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    print("\n[DEBUG] Verificando estrutura do banco de dados...")
    cursor.execute("SELECT COUNT(*) FROM pdf_files")
    total_files = cursor.fetchone()[0]
    print(f"[DEBUG] Total de arquivos no banco: {total_files}")
    
    if total_files == 0:
        print("[DEBUG] PROBLEMA: Nenhum arquivo encontrado no banco de dados!")
        flash('PROBLEMA: Nenhum arquivo encontrado no banco de dados!')
        conn.close()
        return redirect(url_for('index'))
    
    # Listar todos os arquivos no banco
    cursor.execute('''
        SELECT id, filename, song_name, artist, category, file_path 
        FROM pdf_files 
        ORDER BY id
    ''')
    files = cursor.fetchall()
    
    print(f"\n[DEBUG] Listando todos os {len(files)} arquivos:")
    for i, (file_id, filename, song, artist, category, path) in enumerate(files):
        print(f"\n[DEBUG] Arquivo {i+1}:")
        print(f"  ID: {file_id}")
        print(f"  Nome: {filename}")
        print(f"  Música: '{song}' (len={len(song) if song else 0})")
        print(f"  Artista: '{artist}' (len={len(artist) if artist else 0})")
        print(f"  Categoria: {category}")
        print(f"  Caminho: {path}")
        print(f"  Arquivo existe: {os.path.exists(path) if path else False}")
        
        # Gerar nome ideal
        ideal_name = generate_filename(song, artist, filename)
        print(f"  Nome ideal: {ideal_name}")
        print(f"  Precisa renomear: {filename != ideal_name}")
        
        # Verificar diretório
        if path:
            current_dir = os.path.dirname(path)
            expected_dir = os.path.join(ORGANIZED_FOLDER, category)
            print(f"  Diretório atual: {current_dir}")
            print(f"  Diretório esperado: {expected_dir}")
            print(f"  Precisa mover: {os.path.normpath(current_dir) != os.path.normpath(expected_dir)}")
    
    conn.close()
    
    # Verificar estrutura de pastas
    print(f"\n[DEBUG] Verificando estrutura de pastas em: {ORGANIZED_FOLDER}")
    if os.path.exists(ORGANIZED_FOLDER):
        for root, dirs, files in os.walk(ORGANIZED_FOLDER):
            level = root.replace(ORGANIZED_FOLDER, '').count(os.sep)
            indent = ' ' * 2 * level
            print(f"{indent}{os.path.basename(root)}/")
            subindent = ' ' * 2 * (level + 1)
            for file in files:
                file_path = os.path.join(root, file)
                print(f"{subindent}{file} ({os.path.getsize(file_path)} bytes)")
    else:
        print(f"[DEBUG] PROBLEMA: Diretório {ORGANIZED_FOLDER} não existe!")
    
    print("\n" + "="*80)
    print("FIM DO DEBUG DETALHADO")
    print("="*80 + "\n")
    
    flash('Debug detalhado executado! Verifique o console/logs para informações completas.')
    return redirect(url_for('index'))

@app.route('/admin/clean_database', methods=['GET', 'POST'])
def admin_clean_database():
    """Rota administrativa para limpar banco e arquivos (APENAS DEV)."""
    if not is_admin_logged():
        flash('Esta funcionalidade só está disponível para administradores')
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        confirmation = request.form.get('confirmation', '')
        if confirmation == 'CONFIRMAR_LIMPEZA':
            success, message = clean_database_and_files()
            if success:
                flash(message, 'success')
            else:
                flash(message, 'error')
            return redirect(url_for('index'))
        else:
            flash('Confirmação incorreta. Operação cancelada.')
    
    return render_template('admin_clean.html')

@app.route('/admin/create_entries', methods=['POST'])
def admin_create_entries():
    """Criar novas categorias, artistas ou tempos litúrgicos via API."""
    entry_type = request.form.get('type')
    name = request.form.get('name', '').strip()
    description = request.form.get('description', '').strip()
    
    if not name:
        return jsonify({'success': False, 'message': 'Nome é obrigatório'})
    
    success = False
    if entry_type == 'category':
        success = create_category(name, description)
    elif entry_type == 'artist':
        success = create_artist(name, description)
    elif entry_type == 'liturgical_time':
        success = create_liturgical_time(name, description)
    
    if success:
        return jsonify({'success': True, 'message': f'{entry_type} "{name}" criado com sucesso'})
    else:
        return jsonify({'success': False, 'message': f'{entry_type} "{name}" já existe'})

@app.route('/admin/login')
def admin_login():
    """Página de login do admin."""
    if is_admin_logged():
        return redirect(url_for('index'))
    
    if not admin_password_exists():
        return redirect(url_for('admin_create_password'))
    
    return render_template('admin_login.html')

@app.route('/admin/create-password')
def admin_create_password():
    """Página para criar senha do admin na primeira vez."""
    if admin_password_exists():
        return redirect(url_for('admin_login'))
    
    return render_template('admin_create_password.html')

@app.route('/admin/authenticate', methods=['POST'])
def admin_authenticate():
    """Processar login do admin."""
    password = request.form.get('password')
    
    if not password:
        flash('Senha é obrigatória')
        return redirect(url_for('admin_login'))
    
    if verify_admin_password(password):
        session['admin_logged'] = True
        flash('Login realizado com sucesso!')
        return redirect(url_for('index'))
    else:
        flash('Senha incorreta')
        return redirect(url_for('admin_login'))

@app.route('/admin/create-password-action', methods=['POST'])
def admin_create_password_action():
    """Processar criação de senha do admin."""
    password = request.form.get('password')
    confirm_password = request.form.get('confirm_password')
    
    if not password or not confirm_password:
        flash('Todos os campos são obrigatórios')
        return redirect(url_for('admin_create_password'))
    
    if len(password) < 6:
        flash('A senha deve ter pelo menos 6 caracteres')
        return redirect(url_for('admin_create_password'))
    
    if password != confirm_password:
        flash('As senhas não coincidem')
        return redirect(url_for('admin_create_password'))
    
    try:
        create_admin_password(password)
        session['admin_logged'] = True
        flash('Senha criada com sucesso! Você agora está logado como administrador.')
        return redirect(url_for('index'))
    except Exception as e:
        flash(f'Erro ao criar senha: {str(e)}')
        return redirect(url_for('admin_create_password'))

@app.route('/admin/logout')
def admin_logout():
    """Logout do admin."""
    session.pop('admin_logged', None)
    flash('Logout realizado com sucesso')
    return redirect(url_for('index'))

def get_merge_lists():
    """Obter todas as listas de fusão para usar nos templates."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT id, name FROM merge_lists ORDER BY updated_date DESC')
    lists = cursor.fetchall()
    conn.close()
    return lists

@app.context_processor
def inject_globals():
    """Injetar variáveis globais nos templates."""
    return {
        'is_admin_logged': is_admin_logged(),
        'get_merge_lists': get_merge_lists
    }

# Adicionar filtro personalizado para strftime
@app.template_filter('strftime')
def datetime_filter(dt, format='%Y-%m-%d %H:%M:%S'):
    """Filtro personalizado para formatação de data/hora."""
    from datetime import datetime
    if dt == 'now':
        dt = datetime.now()
    elif isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except:
            dt = datetime.now()
    return dt.strftime(format)

@app.route('/download_merged_list/<int:list_id>', methods=['POST'])
def download_merged_list(list_id):
    """Baixar lista de PDFs unidos como um único arquivo."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Obter informações da lista
    cursor.execute('SELECT name FROM merge_lists WHERE id = ?', (list_id,))
    list_info = cursor.fetchone()
    
    if not list_info:
        flash('Lista não encontrada')
        return redirect(url_for('merge_lists'))
    
    list_name = list_info[0]
    
    # Obter arquivos da lista em ordem
    cursor.execute('''
        SELECT pf.file_path, pf.filename
        FROM merge_list_items mli
        JOIN pdf_files pf ON mli.pdf_file_id = pf.id
        WHERE mli.merge_list_id = ? AND pf.file_path IS NOT NULL
        ORDER BY mli.order_position
    ''', (list_id,))
    files = cursor.fetchall()
    conn.close()
    
    if not files:
        flash('Nenhum arquivo válido encontrado na lista')
        return redirect(url_for('edit_merge_list', list_id=list_id))
    
    try:
        from tempfile import NamedTemporaryFile
        from pypdf import PdfWriter, PdfReader
        import tempfile
        import time
        
        # Criar arquivo temporário
        temp_file = NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_path = temp_file.name
        temp_file.close()
        
        writer = PdfWriter()
        
        # Adicionar páginas de cada arquivo
        for file_path, filename in files:
            if os.path.exists(file_path):
                try:
                    reader = PdfReader(file_path)
                    for page in reader.pages:
                        writer.add_page(page)
                except Exception as e:
                    flash(f'Erro ao processar {filename}: {str(e)}')
                    continue
        
        # Salvar arquivo mesclado
        with open(temp_path, 'wb') as output_file:
            writer.write(output_file)
        
        # Gerar nome do arquivo final
        safe_list_name = sanitize_filename(list_name)
        final_filename = f"{safe_list_name}.pdf"
        
        def remove_file():
            try:
                os.unlink(temp_path)
            except:
                pass
        
        response = send_file(
            temp_path,
            as_attachment=True,
            download_name=final_filename,
            mimetype='application/pdf'
        )
        
        response.call_on_close(remove_file)
        return response
        
    except Exception as e:
        flash(f'Erro ao criar arquivo mesclado: {str(e)}')
        return redirect(url_for('edit_merge_list', list_id=list_id))

@app.route('/rename_merge_list/<int:list_id>', methods=['POST'])
def rename_merge_list_route(list_id):
    """Renomear lista de fusão."""
    new_name = request.form.get('new_name', '').strip()
    
    if not new_name:
        flash('Nome não pode estar vazio')
        return redirect(url_for('edit_merge_list', list_id=list_id))
    
    if rename_merge_list(list_id, new_name):
        flash(f'Lista renomeada para "{new_name}" com sucesso!')
    else:
        flash('Erro ao renomear lista')
    
    return redirect(url_for('edit_merge_list', list_id=list_id))

@app.route('/admin/modal_auth', methods=['POST'])
def admin_modal_auth():
    """Autenticação admin via modal."""
    action = request.form.get('action')
    password = request.form.get('password')
    
    if not password:
        return jsonify({'success': False, 'message': 'Senha não informada'})
    
    # Verificar se precisa criar senha
    if not admin_password_exists():
        create_admin_password(password)
        session['admin_logged'] = True
        return jsonify({'success': True, 'message': 'Senha criada e acesso liberado'})
    
    # Verificar senha existente
    if verify_admin_password(password):
        session['admin_logged'] = True
        return jsonify({'success': True, 'message': 'Acesso liberado'})
    else:
        return jsonify({'success': False, 'message': 'Senha incorreta'})

@app.route('/delete/<int:file_id>', methods=['POST'])
def delete_file(file_id):
    """Deletar arquivo PDF."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT file_path, filename FROM pdf_files WHERE id = ?', (file_id,))
    result = cursor.fetchone()
    
    if result:
        file_path, filename = result
        
        # Deletar arquivo do sistema
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Deletar do banco de dados
        cursor.execute('DELETE FROM pdf_files WHERE id = ?', (file_id,))
        conn.commit()
        
        flash(f'Arquivo deletado: {filename}')
    else:
        flash('Arquivo não encontrado')
    
    conn.close()
    return redirect(url_for('index'))

@app.route('/update_music/<int:file_id>', methods=['POST'])
def update_music(file_id):
    """Atualizar informações da música."""
    song_name = request.form.get('song_name', '').strip()
    artist = request.form.get('artist', '').strip()
    new_artist = request.form.get('new_artist', '').strip()
    musical_key = request.form.get('musical_key', '')
    youtube_link = request.form.get('youtube_link', '')
    description = request.form.get('description', '')
    
    # Criar novo artista se especificado
    if new_artist and not artist:
        if create_artist(new_artist):
            artist = new_artist
            flash(f'Novo artista "{new_artist}" criado!')
        else:
            flash(f'Artista "{new_artist}" já existe')
            artist = new_artist
    
    # Processar categorias múltiplas
    selected_categories = request.form.getlist('categories')
    new_categories = request.form.getlist('new_categories')
    
    # Processar tempos litúrgicos múltiplos
    selected_liturgical_times = request.form.getlist('liturgical_times')
    new_liturgical_times = request.form.getlist('new_liturgical_times')
    
    # Adicionar novas categorias ao banco se não existirem
    for new_cat in new_categories:
        if new_cat.strip():
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute('INSERT OR IGNORE INTO categories (name) VALUES (?)', (new_cat.strip(),))
            conn.commit()
            conn.close()
            selected_categories.append(new_cat.strip())
    
    # Adicionar novos tempos litúrgicos ao banco se não existirem
    for new_time in new_liturgical_times:
        if new_time.strip():
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute('INSERT OR IGNORE INTO liturgical_times (name) VALUES (?)', (new_time.strip(),))
            conn.commit()
            conn.close()
            selected_liturgical_times.append(new_time.strip())
    
    # Usar a primeira categoria como categoria principal (para compatibilidade)
    primary_category = selected_categories[0] if selected_categories else 'Diversos'
    primary_liturgical_time = selected_liturgical_times[0] if selected_liturgical_times else ''
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Atualizar informações básicas da música
    cursor.execute('''
        UPDATE pdf_files 
        SET song_name = ?, artist = ?, category = ?, liturgical_time = ?, 
            musical_key = ?, youtube_link = ?, description = ?
        WHERE id = ?
    ''', (song_name, artist, primary_category, primary_liturgical_time, 
          musical_key, youtube_link, description, file_id))
    
    # Limpar categorias e tempos litúrgicos existentes
    cursor.execute('DELETE FROM file_categories WHERE file_id = ?', (file_id,))
    cursor.execute('DELETE FROM file_liturgical_times WHERE file_id = ?', (file_id,))
    
    # Adicionar múltiplas categorias
    for category in selected_categories:
        if category.strip():
            # Primeiro criar a categoria se não existir
            cursor.execute('INSERT OR IGNORE INTO categories (name) VALUES (?)', (category.strip(),))
            # Depois obter o ID e criar o relacionamento
            cursor.execute('SELECT id FROM categories WHERE name = ?', (category.strip(),))
            category_id = cursor.fetchone()[0]
            cursor.execute('INSERT OR IGNORE INTO file_categories (file_id, category_id) VALUES (?, ?)', 
                         (file_id, category_id))
    
    # Adicionar múltiplos tempos litúrgicos
    for liturgical_time in selected_liturgical_times:
        if liturgical_time.strip():
            # Primeiro criar o tempo litúrgico se não existir
            cursor.execute('INSERT OR IGNORE INTO liturgical_times (name) VALUES (?)', (liturgical_time.strip(),))
            # Depois obter o ID e criar o relacionamento
            cursor.execute('SELECT id FROM liturgical_times WHERE name = ?', (liturgical_time.strip(),))
            liturgical_id = cursor.fetchone()[0]
            cursor.execute('INSERT OR IGNORE INTO file_liturgical_times (file_id, liturgical_time_id) VALUES (?, ?)', 
                         (file_id, liturgical_id))
    
    conn.commit()
    conn.close()
    
    flash('Informações da música atualizadas com sucesso!')
    return redirect(url_for('music_details', file_id=file_id))

@app.route('/search')
def search():
    """Buscar arquivos PDF com paginação."""
    query = request.args.get('q', '')
    category = request.args.get('category', '')
    liturgical_time = request.args.get('liturgical_time', '')
    view_mode = request.args.get('view', 'card')  # card or list
    
    # Paginação
    page = max(1, int(request.args.get('page', 1)))
    per_page = int(request.args.get('per_page', 10))  # Padrão 10 por página
    
    # Validar per_page
    if per_page not in [10, 25, 50]:
        per_page = 10
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Construir query base com JOINs para filtros de categoria e tempo litúrgico
    base_query = '''
        SELECT DISTINCT pf.id, pf.filename, pf.original_name, pf.song_name, pf.artist, pf.category, pf.liturgical_time, 
               pf.musical_key, pf.youtube_link, pf.file_size, pf.upload_date, pf.page_count, pf.description, pf.file_path
        FROM pdf_files pf
    '''
    
    count_query = 'SELECT COUNT(DISTINCT pf.id) FROM pdf_files pf'
    
    joins = []
    where_conditions = ['1=1']
    params = []
    
    # JOIN para filtro de categoria (usando tanto coluna principal quanto relacionamento)
    if category:
        joins.append('LEFT JOIN file_categories fc ON pf.id = fc.file_id')
        joins.append('LEFT JOIN categories c ON fc.category_id = c.id')
        where_conditions.append('(pf.category = ? OR c.name = ?)')
        params.extend([category, category])
    
    # JOIN para filtro de tempo litúrgico (usando tanto coluna principal quanto relacionamento)
    if liturgical_time:
        joins.append('LEFT JOIN file_liturgical_times flt ON pf.id = flt.file_id')
        joins.append('LEFT JOIN liturgical_times lt ON flt.liturgical_time_id = lt.id')
        where_conditions.append('(pf.liturgical_time = ? OR lt.name = ?)')
        params.extend([liturgical_time, liturgical_time])
    
    # Adicionar JOINs às queries
    if joins:
        join_clause = ' ' + ' '.join(joins)
        base_query += join_clause
        count_query += join_clause
    
    # Adicionar WHERE
    where_clause = ' WHERE ' + ' AND '.join(where_conditions)
    base_query += where_clause
    count_query += where_clause
    
    if query:
        search_condition = ''' AND (
            LOWER(pf.song_name) LIKE LOWER(?) OR 
            LOWER(pf.artist) LIKE LOWER(?) OR 
            LOWER(pf.filename) LIKE LOWER(?) OR 
            LOWER(pf.description) LIKE LOWER(?)
        )'''
        base_query += search_condition
        count_query += search_condition
        search_param = f'%{query}%'
        params.extend([search_param, search_param, search_param, search_param])
    
    # Obter contagem total
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()[0]
    
    # Calcular paginação
    total_pages = (total_count + per_page - 1) // per_page
    offset = (page - 1) * per_page
    
    # Adicionar ordenação e limite
    base_query += ' ORDER BY upload_date DESC LIMIT ? OFFSET ?'
    params.extend([per_page, offset])
    
    # Executar query principal
    cursor.execute(base_query, params)
    files = cursor.fetchall()
    
    # Obter dados para filtros usando as tabelas de relacionamento
    cursor.execute('''
        SELECT DISTINCT c.name 
        FROM categories c
        WHERE c.id IN (
            SELECT category_id FROM file_categories
            UNION
            SELECT id FROM categories WHERE name IN (SELECT DISTINCT category FROM pdf_files WHERE category IS NOT NULL)
        )
        ORDER BY c.name
    ''')
    categories = [row[0] for row in cursor.fetchall()]
    
    cursor.execute('''
        SELECT DISTINCT lt.name 
        FROM liturgical_times lt
        WHERE lt.id IN (
            SELECT liturgical_time_id FROM file_liturgical_times
            UNION
            SELECT id FROM liturgical_times WHERE name IN (SELECT DISTINCT liturgical_time FROM pdf_files WHERE liturgical_time IS NOT NULL)
        )
        ORDER BY lt.name
    ''')
    liturgical_times = [row[0] for row in cursor.fetchall()]
    
    conn.close()
    
    # Obter listas de fusão para dropdowns
    merge_lists = get_merge_lists()
    
    # Dados de paginação
    pagination = {
        'page': page,
        'per_page': per_page,
        'total': total_count,
        'total_pages': total_pages,
        'has_prev': page > 1,
        'has_next': page < total_pages,
        'prev_num': page - 1 if page > 1 else None,
        'next_num': page + 1 if page < total_pages else None,
        'pages': list(range(max(1, page - 2), min(total_pages + 1, page + 3)))
    }
    
    return render_template('search_results.html', 
                         files=files, 
                         query=query, 
                         selected_category=category,
                         selected_liturgical=liturgical_time,
                         categories=categories, 
                         liturgical_times=liturgical_times,
                         merge_lists=merge_lists,
                         view_mode=view_mode,
                         pagination=pagination)

@app.route('/view/<int:file_id>')
def view_file(file_id):
    """Servir arquivo PDF para visualização."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT file_path, filename FROM pdf_files WHERE id = ?', (file_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result and os.path.exists(result[0]):
        return send_file(result[0], as_attachment=False, download_name=result[1])
    
    flash('Arquivo não encontrado')
    return redirect(url_for('index'))

@app.route('/details/<int:file_id>')
def music_details(file_id):
    """Mostrar detalhes completos da música."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, filename, original_name, song_name, artist, category, liturgical_time, 
               musical_key, youtube_link, file_size, upload_date, page_count, description, file_path
        FROM pdf_files WHERE id = ?
    ''', (file_id,))
    music = cursor.fetchone()
    conn.close()
    
    if not music:
        flash('Música não encontrada')
        return redirect(url_for('index'))
    
    return render_template('music_details.html', music=music, categories=get_categories(), 
                         liturgical_times=get_liturgical_times(), musical_keys=get_musical_keys(), artists=get_artists())

@app.route('/download/<int:file_id>')
def download_file(file_id):
    """Download específico de arquivo PDF."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT file_path, filename FROM pdf_files WHERE id = ?', (file_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result and os.path.exists(result[0]):
        return send_file(result[0], as_attachment=True, download_name=result[1])
    
    flash('Arquivo não encontrado')
    return redirect(url_for('index'))

@app.route('/api/generate_report')
@app.route('/api/generate_report/<int:list_id>')
def api_generate_report(list_id=None):
    """API para gerar relatório simples de lista de músicas."""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        if list_id:
            # Gerar relatório de uma lista específica
            cursor.execute('SELECT name FROM merge_lists WHERE id = ?', (list_id,))
            list_info = cursor.fetchone()
            
            if not list_info:
                return jsonify({
                    'success': False,
                    'message': 'Lista não encontrada'
                }), 404
            
            list_name = list_info[0]
            
            # Buscar músicas da lista ordenadas por posição
            cursor.execute('''
                SELECT pf.song_name, pf.artist, pf.youtube_link, pf.filename
                FROM merge_list_items mli
                JOIN pdf_files pf ON mli.pdf_file_id = pf.id
                WHERE mli.merge_list_id = ?
                ORDER BY mli.order_position
            ''', (list_id,))
            
            files = cursor.fetchall()
            
        else:
            # Gerar relatório de todas as músicas
            cursor.execute('''
                SELECT song_name, artist, youtube_link, filename
                FROM pdf_files 
                ORDER BY song_name, artist
            ''')
            
            files = cursor.fetchall()
        
        conn.close()
        
        if not files:
            return jsonify({
                'success': False,
                'message': 'Nenhuma música encontrada'
            })
        
        # Gerar lista simples de músicas
        report_lines = []
        
        for song_name, artist, youtube_link, filename in files:
            # Usar song_name se disponível, senão usar filename
            music_title = song_name if song_name and song_name.strip() else filename.replace('.pdf', '')
            artist_name = artist if artist and artist.strip() else 'Não informado'
            
            # Formato básico: "Música - Artista"
            if youtube_link and youtube_link.strip():
                # Formato com YouTube: "Música - Artista - Link do YouTube"
                line = f"{music_title} - {artist_name} - {youtube_link}"
            else:
                # Formato sem YouTube: "Música - Artista"
                line = f"{music_title} - {artist_name}"
            
            report_lines.append(line)
        
        # Juntar todas as linhas
        report_content = "\n".join(report_lines)
        
        return jsonify({
            'success': True,
            'report': report_content
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao gerar relatório: {str(e)}'
        }), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000) 