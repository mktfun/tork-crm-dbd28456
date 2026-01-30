import os
import json
import psycopg2
from psycopg2.extras import execute_values
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

# Configurações do Banco de Dados Supabase
DB_URL = "postgresql://postgres.jaouwhckqqnaxqyfvgyq:Mktfunil8563*@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Usando um modelo de embedding multilingue leve e eficiente
# 'paraphrase-multilingual-MiniLM-L12-v2' é excelente para Português
print("Carregando modelo de embedding local...")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

def get_embedding(text):
    """Gera embeddings localmente"""
    embedding = model.encode(text)
    return embedding.tolist()

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
        
        # Dividir em chunks de ~1500 caracteres (melhor para modelos MiniLM)
        chunk_size = 1500
        overlap = 150
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
        # Processar todos os chunks (agora que é local, é mais rápido e estável)
        print(f"  -> Gerando embeddings para {len(chunks)} fragmentos...")
        embeddings = model.encode(chunks)
        
        for i, chunk in enumerate(chunks):
            data.append((source, category, title, chunk, embeddings[i].tolist()))
        
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
