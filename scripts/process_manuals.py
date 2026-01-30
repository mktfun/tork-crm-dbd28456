import os
import json
import requests
from pypdf import PdfReader
from openai import OpenAI

# Configurações do Banco de Dados Supabase
DB_URL = "postgresql://postgres.jaouwhckqqnaxqyfvgyq:Mktfunil8563*@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# No ambiente Manus, o cliente OpenAI é pré-configurado para acessar o Gemini via API compatível
client = OpenAI()

def get_embedding(text):
    """Gera embeddings usando o modelo Gemini-2.5-Flash"""
    text = text.replace("\n", " ")
    try:
        # No ambiente Manus, o modelo 'gemini-2.5-flash' é usado para chat, 
        # para embeddings usamos o modelo padrão que o sistema mapeia internamente.
        response = client.embeddings.create(input=[text], model="text-embedding-3-small")
        return response.data[0].embedding
    except Exception as e:
        print(f"Erro ao gerar embedding: {e}")
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
        
        # Dividir em chunks de ~2000 caracteres com overlap de 200 para manter o contexto
        chunk_size = 2000
        overlap = 200
        chunks = []
        for i in range(0, len(full_text), chunk_size - overlap):
            chunk = full_text[i:i + chunk_size]
            if len(chunk.strip()) > 100: # Ignorar fragmentos muito pequenos
                chunks.append(chunk)
        
        return chunks
    except Exception as e:
        print(f"Erro ao processar PDF {file_path}: {e}")
        return []

def save_to_supabase(chunks, source, category, title):
    """Salva os fragmentos e seus embeddings no banco de dados Supabase"""
    import psycopg2
    from psycopg2.extras import execute_values
    
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        data = []
        # Processar os primeiros 20 chunks para garantir que temos dados sem demorar demais no teste
        limit = min(len(chunks), 20)
        for i in range(limit):
            chunk = chunks[i]
            print(f"  -> Gerando embedding para fragmento {i+1}/{limit}...")
            embedding = get_embedding(chunk)
            if embedding:
                data.append((source, category, title, chunk, embedding))
        
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
    # Lista de manuais baixados anteriormente
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
                print(f"⚠️ Nenhum texto extraído de {m['path']}")
        else:
            print(f"❌ Arquivo não encontrado: {m['path']}")
