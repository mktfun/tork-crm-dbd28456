import os
import json
import psycopg2
from psycopg2.extras import execute_values
from pypdf import PdfReader
from openai import OpenAI

# Configurações do Banco de Dados Supabase
DB_URL = "postgresql://postgres.jaouwhckqqnaxqyfvgyq:Mktfunil8563*@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# No ambiente Manus, o cliente OpenAI é pré-configurado para acessar o Gemini
client = OpenAI()

def get_embedding(text):
    """Gera embeddings usando o modelo Gemini-2.5-Flash via interface OpenAI"""
    try:
        # No ambiente Manus, usamos gemini-2.5-flash para tudo, inclusive embeddings
        # O sistema mapeia automaticamente para a funcionalidade correta
        response = client.embeddings.create(
            input=[text.replace("\n", " ")],
            model="gemini-2.5-flash"
        )
        return response.data[0].embedding
    except Exception as e:
        # Se falhar, tentamos o modelo genérico de embedding que o sistema suporta
        try:
            response = client.embeddings.create(
                input=[text.replace("\n", " ")],
                model="text-embedding-3-small"
            )
            return response.data[0].embedding
        except Exception as e2:
            print(f"Erro ao gerar embedding: {e2}")
            return None

def process_pdf(file_path, source, category, title):
    """Extrai texto do PDF e divide em fragmentos (chunks)"""
    print(f"Processando: {title} ({source})")
    try:
        reader = PdfReader(file_path)
        full_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"
        
        chunk_size = 2000
        overlap = 200
        chunks = []
        for i in range(0, len(full_text), chunk_size - overlap):
            chunk = full_text[i:i + chunk_size]
            if len(chunk.strip()) > 100:
                chunks.append(chunk)
        
        return chunks
    except Exception as e:
        print(f"Erro ao processar PDF {file_path}: {e}")
        return []

def save_to_supabase(chunks, source, category, title):
    """Salva os fragmentos e seus embeddings no banco de dados Supabase"""
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        data = []
        # Processar os primeiros 30 chunks para cada manual
        limit = min(len(chunks), 30)
        print(f"  -> Gerando embeddings para {limit} fragmentos...")
        
        for i in range(limit):
            chunk = chunks[i]
            embedding = get_embedding(chunk)
            if embedding:
                data.append((source, category, title, chunk, embedding))
            
            if (i + 1) % 10 == 0:
                print(f"     Progresso: {i+1}/{limit}")
        
        if data:
            print(f"  -> Inserindo {len(data)} registros no banco de dados...")
            execute_values(cur, 
                "INSERT INTO ai_knowledge (source, category, title, content, embedding) VALUES %s",
                data
            )
            conn.commit()
            print(f"✅ Sucesso: {len(data)} fragmentos salvos para {title}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Erro ao salvar no banco: {e}")

if __name__ == "__main__":
    manuals = [
        {"path": "/home/ubuntu/insurance_manuals/porto_auto_2025.pdf", "source": "Porto Seguro", "category": "Auto", "title": "Condições Gerais Porto Seguro Auto 2025"},
        {"path": "/home/ubuntu/insurance_manuals/azul_residencial.pdf", "source": "Azul Seguros", "category": "Residencial", "title": "Condições Gerais Azul Residencial"},
        {"path": "/home/ubuntu/insurance_manuals/unimed_rcp.pdf", "source": "Seguros Unimed", "category": "RC Profissional", "title": "Condições Gerais RC Profissional Fisioterapeuta"}
    ]
    
    for m in manuals:
        if os.path.exists(m["path"]):
            chunks = process_pdf(m["path"], m["source"], m["category"], m["title"])
            if chunks:
                save_to_supabase(chunks, m["source"], m["category"], m["title"])
        else:
            print(f"❌ Arquivo não encontrado: {m['path']}")
