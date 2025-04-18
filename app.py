from flask import Flask, render_template, redirect, request, jsonify, g
import sqlite3
from datetime import datetime

app = Flask(__name__)

DATABASE = 'routine.db'

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Criar tabela de categorias se não existir
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                name TEXT PRIMARY KEY,
                total_hours REAL DEFAULT 0,
                ideal_hours REAL DEFAULT 0
            )
        ''')
        
        # Criar tabela de eventos se não existir
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT,
                hours REAL,
                description TEXT,
                date TEXT,
                FOREIGN KEY (category) REFERENCES categories (name)
            )
        ''')
        
        # Verificar se já existem categorias
        cursor.execute('SELECT COUNT(*) FROM categories')
        count = cursor.fetchone()[0]
        
        # Se não houver categorias, inserir as categorias padrão
        if count == 0:
            categories = [
                ('Saúde', 0, 10),
                ('Carreira', 0, 40),
                ('Relacionamentos', 0, 10),
                ('Desenvolvimento Pessoal', 0, 5),
                ('Finanças', 0, 3),
                ('Espiritualidade', 0, 3),
                ('Lazer', 0, 21),
                ('Contribuição', 0, 3)
            ]
            cursor.executemany('INSERT INTO categories (name, total_hours, ideal_hours) VALUES (?, ?, ?)', categories)
        
        db.commit()
        print("Banco de dados inicializado com sucesso!")
        
    except Exception as e:
        print(f"Erro ao inicializar banco de dados: {e}")
        if 'db' in g:
            g.db.rollback()
        raise

# Inicializar o banco de dados na inicialização do app
with app.app_context():
    init_db()

@app.route('/')
def index():
    db = get_db()
    cursor = db.cursor()
    
    # Buscar todas as categorias com suas horas
    cursor.execute('''SELECT name, total_hours, ideal_hours 
                 FROM categories 
                 ORDER BY name''')
    categories = [{'name': row[0], 
                  'total_hours': row[1], 
                  'ideal_hours': row[2]} 
                 for row in cursor.fetchall()]
    
    # Buscar todos os eventos
    cursor.execute('''SELECT id, category, hours, description, date 
                 FROM events''')
    events = [{'id': row[0], 
               'category': row[1], 
               'hours': row[2], 
               'description': row[3], 
               'date': row[4]} 
              for row in cursor.fetchall()]
    
    return render_template('index.html', 
                         categories=categories, 
                         events=events)

@app.route('/add_event', methods=['POST'])
def add_event():
    try:
        data = request.get_json()
        
        # Validar os dados recebidos
        if not all(key in data for key in ['category', 'hours', 'description', 'date']):
            return jsonify({'success': False, 'message': 'Dados incompletos'}), 400
            
        db = get_db()
        cursor = db.cursor()
        
        # Inserir o evento no banco de dados
        cursor.execute('''
            INSERT INTO events (category, hours, description, date)
            VALUES (?, ?, ?, ?)
        ''', (data['category'], data['hours'], data['description'], data['date']))
        
        # Obter o ID do evento recém-inserido
        event_id = cursor.lastrowid
        
        # Atualizar as horas totais da categoria
        cursor.execute('''
            UPDATE categories 
            SET total_hours = total_hours + ? 
            WHERE name = ?
        ''', (data['hours'], data['category']))
        
        # Commit das alterações
        db.commit()
        
        # Retornar sucesso com o ID do evento
        return jsonify({
            'success': True,
            'event_id': event_id,
            'message': 'Evento adicionado com sucesso'
        })
        
    except sqlite3.Error as e:
        # Em caso de erro no banco de dados
        if 'db' in g:
            g.db.rollback()
        return jsonify({
            'success': False,
            'message': f'Erro no banco de dados: {str(e)}'
        }), 500
        
    except Exception as e:
        # Em caso de outros erros
        return jsonify({
            'success': False,
            'message': f'Erro inesperado: {str(e)}'
        }), 500

@app.route('/get_categories')
def get_categories():
    db = get_db()
    cursor = db.cursor()
    
    # Buscar categorias com horas reais e ideais
    cursor.execute('''SELECT name, total_hours, ideal_hours 
                 FROM categories 
                 ORDER BY name''')
    
    categories = [{'name': row[0], 
                  'total_hours': row[1], 
                  'ideal_hours': row[2]} 
                 for row in cursor.fetchall()]
    
    return jsonify(categories)

@app.route('/delete_event', methods=['POST'])
def delete_event():
    try:
        data = request.json
        event_id = data['event_id']
        category = data['category']
        hours = float(data['hours'])
        
        db = get_db()
        cursor = db.cursor()
        
        # Deletar o evento
        cursor.execute('DELETE FROM events WHERE id = ?', (event_id,))
        
        # Atualizar o total de horas da categoria
        cursor.execute('''UPDATE categories 
                    SET total_hours = total_hours - ?
                    WHERE name = ?''', (hours, category))
        
        db.commit()
        
        # Buscar o novo total de horas
        cursor.execute('SELECT total_hours FROM categories WHERE name = ?', (category,))
        new_total = cursor.fetchone()[0]
        
        return jsonify({
            'success': True,
            'message': 'Evento removido com sucesso',
            'new_total': new_total
        })
    except Exception as e:
        if 'db' in g:
            g.db.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/get_events')
def get_events():
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('''SELECT id, category, hours, description, date 
                 FROM events''')
    events = [{'id': row[0], 'category': row[1], 'hours': row[2], 
               'description': row[3], 'date': row[4]} 
              for row in cursor.fetchall()]
    
    return jsonify(events)

@app.route('/update_ideal_hours', methods=['POST'])
def update_ideal_hours():
    try:
        data = request.json
        category = data['category']
        ideal_hours = float(data['ideal_hours'])
        
        db = get_db()
        cursor = db.cursor()
        
        # Atualizar as horas ideais da categoria
        cursor.execute('''UPDATE categories 
                    SET ideal_hours = ?
                    WHERE name = ?''', (ideal_hours, category))
        
        db.commit()
        
        # Buscar o total de horas reais atual
        cursor.execute('''SELECT total_hours 
                    FROM categories 
                    WHERE name = ?''', (category,))
        real_hours = cursor.fetchone()[0]
        
        return jsonify({
            'success': True,
            'message': 'Horas ideais atualizadas com sucesso',
            'real_hours': real_hours,
            'ideal_hours': ideal_hours
        })
    except Exception as e:
        if 'db' in g:
            g.db.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

if __name__ == '__main__':
    app.run(debug=True)