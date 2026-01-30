import os
import json
import psycopg2
from psycopg2.extras import execute_values
from pypdf import PdfReader

# Configurações do Banco de Dados Supabase
DB_URL = "postgresql://postgres.jaouwhckqqnaxqyfvgyq:Mktfunil8563*@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

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
    """Salva os fragmentos no banco de dados Supabase"""
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        data = []
        print(f"  -> Preparando {len(chunks)} fragmentos...")
        
        for chunk in chunks:
            data.append((source, category, title, chunk))
        
        if data:
            print(f"  -> Inserindo {len(data)} registros no banco de dados...")
            execute_values(cur, 
                "INSERT INTO ai_knowledge (source, category, title, content) VALUES %s",
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
        {"path": "/home/ubuntu/insurance_manuals/bradesco_residencial.pdf", "source": "Bradesco Seguros", "category": "Residencial", "title": "Condições Gerais Bradesco Residencial 2025"}
    ]
    
    for m in manuals:
        if os.path.exists(m["path"]):
            chunks = process_pdf(m["path"], m["source"], m["category"], m["title"])
            if chunks:
                save_to_supabase(chunks, m["source"], m["category"], m["title"])
        else:
            print(f"❌ Arquivo não encontrado: {m['path']}")
