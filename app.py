import os
import sqlite3
import shutil
from datetime import datetime
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, flash
from werkzeug.utils import secure_filename
import pypdf
from pypdf import PdfReader, PdfWriter
import hashlib
import mimetypes

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

# Categorias padrão (partes da missa)
DEFAULT_CATEGORIES = [
    'Entrada', 'Ato penitencial', 'Glória', 'Salmo', 'Aclamação', 
    'Ofertório', 'Santo', 'Cordeiro', 'Comunhão', 'Pós Comunhão', 
    'Final', 'Diversos', 'Maria', 'Espírito Santo'
]

# Tempos litúrgicos
LITURGICAL_TIMES = [
    'Tempo Comum', 'Quaresma', 'Advento', 'Natal'
]

# Tons musicais
MUSICAL_KEYS = [
    # Tons maiores
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    # Tons menores
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
]

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
    
    # Adicionar colunas se não existirem (para compatibilidade)
    try:
        cursor.execute('ALTER TABLE pdf_files ADD COLUMN liturgical_time TEXT')
    except sqlite3.OperationalError:
        pass
    
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
    
    for category in DEFAULT_CATEGORIES:
        cursor.execute('INSERT OR IGNORE INTO categories (name) VALUES (?)', (category,))
    
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
    """Painel principal mostrando todos os arquivos PDF."""
    view_mode = request.args.get('view', 'card')  # 'card' ou 'list'
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, filename, original_name, song_name, artist, category, liturgical_time, 
               musical_key, youtube_link, file_size, upload_date, page_count, description 
        FROM pdf_files ORDER BY upload_date DESC
    ''')
    files = cursor.fetchall()
    
    cursor.execute('SELECT name FROM categories ORDER BY name')
    categories = [row[0] for row in cursor.fetchall()]
    
    cursor.execute('SELECT id, name FROM merge_lists ORDER BY updated_date DESC')
    merge_lists = cursor.fetchall()
    
    conn.close()
    return render_template('index.html', files=files, categories=categories, 
                         liturgical_times=LITURGICAL_TIMES, merge_lists=merge_lists, view_mode=view_mode)

@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    """Gerenciar upload e organização de arquivos."""
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('Nenhum arquivo selecionado')
            return redirect(request.url)
        
        file = request.files['file']
        song_name = request.form.get('song_name', '').strip()
        artist = request.form.get('artist', '').strip()
        category = request.form.get('category', 'Diversos')
        liturgical_time = request.form.get('liturgical_time', '')
        musical_key = request.form.get('musical_key', '')
        youtube_link = request.form.get('youtube_link', '')
        description = request.form.get('description', '')
        
        if file.filename == '' or file.filename is None:
            flash('Nenhum arquivo selecionado')
            return redirect(request.url)
        
        if file and file.filename.lower().endswith('.pdf'):
            filename = secure_filename(file.filename)
            
            temp_path = os.path.join(UPLOAD_FOLDER, filename)
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
            
            counter = 1
            base_name = os.path.splitext(filename)[0]
            final_filename = filename
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
            
            conn.commit()
            conn.close()
            
            flash(f'Arquivo enviado com sucesso: {final_filename}')
            return redirect(url_for('index'))
        else:
            flash('Por favor, envie um arquivo PDF válido')
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM categories ORDER BY name')
    categories = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    return render_template('upload.html', categories=categories, liturgical_times=LITURGICAL_TIMES, musical_keys=MUSICAL_KEYS)

@app.route('/search')
def search():
    """Buscar arquivos PDF por nome, categoria, tempo litúrgico ou descrição."""
    query = request.args.get('q', '').strip()
    category_filter = request.args.get('category', '')
    liturgical_filter = request.args.get('liturgical_time', '')
    
    if not query and not category_filter and not liturgical_filter:
        return redirect(url_for('index'))
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    sql = '''SELECT id, filename, original_name, song_name, artist, category, liturgical_time, 
             musical_key, youtube_link, file_size, upload_date, page_count, description FROM pdf_files WHERE 1=1'''
    params = []
    
    if query:
        sql += ' AND (filename LIKE ? OR original_name LIKE ? OR song_name LIKE ? OR artist LIKE ? OR description LIKE ?)'
        search_term = f'%{query}%'
        params.extend([search_term, search_term, search_term, search_term, search_term])
    
    if category_filter:
        sql += ' AND category = ?'
        params.append(category_filter)
    
    if liturgical_filter:
        sql += ' AND liturgical_time = ?'
        params.append(liturgical_filter)
    
    sql += ' ORDER BY upload_date DESC'
    
    cursor.execute(sql, params)
    files = cursor.fetchall()
    
    cursor.execute('SELECT name FROM categories ORDER BY name')
    categories = [row[0] for row in cursor.fetchall()]
    
    conn.close()
    return render_template('search_results.html', files=files, categories=categories, 
                         liturgical_times=LITURGICAL_TIMES, query=query, 
                         selected_category=category_filter, selected_liturgical=liturgical_filter)

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
    
    return render_template('music_details.html', music=music)

@app.route('/merge', methods=['GET', 'POST'])
def merge_pdfs():
    """Merge multiple PDF files into one."""
    if request.method == 'POST':
        selected_files = request.form.getlist('selected_files')
        output_name = request.form.get('output_name', 'merged_document.pdf')
        
        if len(selected_files) < 2:
            flash('Please select at least 2 files to merge')
            return redirect(request.url)
        
        if not output_name.lower().endswith('.pdf'):
            output_name += '.pdf'
        
        output_name = secure_filename(output_name)
        
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
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT id, filename, original_name, category, page_count FROM pdf_files ORDER BY filename')
    files = cursor.fetchall()
    conn.close()
    
    return render_template('merge.html', files=files)

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
    """Editar lista de fusão."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Obter informações da lista
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
    
    # Obter todos os arquivos para adicionar
    cursor.execute('SELECT id, filename, original_name, category FROM pdf_files ORDER BY filename')
    all_files = cursor.fetchall()
    
    conn.close()
    return render_template('edit_merge_list.html', merge_list=merge_list, 
                         list_files=list_files, all_files=all_files)

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
    """Mesclar arquivos de uma lista."""
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
    
    if len(files_to_merge) < 2:
        flash('É necessário pelo menos 2 arquivos para mesclar')
        conn.close()
        return redirect(url_for('edit_merge_list', list_id=list_id))
    
    try:
        writer = PdfWriter()
        
        # Mesclar PDFs
        for file_path, filename in files_to_merge:
            if os.path.exists(file_path):
                reader = PdfReader(file_path)
                for page in reader.pages:
                    writer.add_page(page)
        
        # Salvar PDF mesclado
        merged_folder = os.path.join(ORGANIZED_FOLDER, 'Mesclados')
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
        
        # Adicionar ao banco
        file_hash = get_file_hash(output_path)
        file_size = os.path.getsize(output_path)
        pdf_info = get_pdf_info(output_path)
        
        cursor.execute('''
            INSERT INTO pdf_files 
            (filename, original_name, category, liturgical_time, file_path, file_size, file_hash, page_count, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (final_output, final_output, 'Mesclados', '', output_path, file_size, file_hash, pdf_info['page_count'], 'Arquivo mesclado de lista'))
        
        conn.commit()
        conn.close()
        
        flash(f'Arquivos mesclados com sucesso: {final_output}')
        return redirect(url_for('index'))
        
    except Exception as e:
        flash(f'Erro ao mesclar arquivos: {str(e)}')
        conn.close()
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

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000) 