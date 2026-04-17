# Design: Arquitetura do Dispatcher Corrigido

## Diagrama de Roteamento Final

```mermaid
flowchart TD
    A["📱 WhatsApp Message In"] --> B["resolveContext()"]
    
    B --> C{"senderRole == admin?"}
    
    C -- "✅ Admin" --> D{"Modo /teste?"}
    D -- "Sim" --> SDR["Forçar rota SDR"]
    D -- "Não" --> E["processAdminLogic → Amorim AI"]
    
    C -- "❌ Lead" --> SDR
    
    SDR --> F{"Workflow SDR ativo?"}
    
    F -- "Sim + trigger match" --> H["🚀 processSDRFlow - Motor de Grafo"]
    H --> K["sendChatwootMessage"]
    
    F -- "Não" --> M{"Tem Deal aberto?"}
    M -- "Sim" --> N["buildPrompt + agentLoop"]
    N --> K
    
    M -- "Não" --> T["🆕 TRIAGEM INTELIGENTE"]
    T --> T1["IA conversa naturalmente"]
    T1 --> T2{"Identificou necessidade?"}
    T2 -- "Não ainda" --> T3["Responde e aguarda próxima msg"]
    T2 -- "Sim!" --> T4["Cria Deal no CRM"]
    T4 --> T5["Escala pro admin - alerta WhatsApp"]
    T5 --> T6["Resposta contextual natural ao cliente"]
    T6 --> T7["🔇 AUTO-MUTE do cliente<br/>+ Label 'off' no Chatwoot"]
    T7 --> K
    
    style T fill:#6c5ce7,color:#fff
    style T7 fill:#e17055,color:#fff
    style H fill:#00b894,color:#fff
```

## Ciclo de Vida do Lead (Sem Workflow)

```mermaid
sequenceDiagram
    participant L as Lead (WhatsApp)
    participant D as Dispatcher
    participant AI as LLM (Triagem)
    participant CRM as Supabase CRM
    participant A as Admin (WhatsApp)
    
    L->>D: "Oi, bom dia!"
    D->>AI: Modo Triagem - conversa natural
    AI-->>D: "Olá! Tudo bem? Em que posso te ajudar?"
    D->>L: Resposta natural
    
    L->>D: "Quero uma cotação de seguro auto"
    D->>AI: Triagem + lista de pipelines/produtos
    AI-->>D: classification: { pipeline: "Auto", stage: "Qualificação", product: "Seguro Auto" }
    
    D->>CRM: Cria Deal (Auto > Qualificação > Seguro Auto)
    D->>CRM: Cria evento "AI auto-triagem"
    D->>A: 🔔 "Novo lead: João quer seguro auto. Já cadastrado no funil Auto > Qualificação"
    D->>L: "Legal! Vou verificar as melhores opções pra você. Um consultor já vai te atender 😊"
    D->>CRM: SET ai_muted_until = permanente
    D->>CW: Aplica label "off" na conversa
    
    Note over D,L: IA silenciada. Próximas msgs do lead são ignoradas pela IA.
    Note over A: Admin assume conversa manualmente no Chatwoot.
```

## Normalização de Telefone Corrigida

```mermaid
flowchart LR
    A["Sender: +5511979699832"] --> B["Remove +55 → 11979699832"]
    C["DB: 11979699832"] --> D["Normaliza → 11979699832"]
    B --> E{"Match 11 digs?"}
    E -- "Sim ✅" --> F["admin"]
    E -- "Não" --> G{"Match 10 digs?"}
    G -- "Sim ✅" --> F
    G -- "Não ❌" --> H["lead"]
```

## Roteamento por Cenário

| Quem | Workflow SDR? | Deal? | Resultado |
|---|---|---|---|
| Admin | Irrelevante | Irrelevante | → Amorim AI |
| Admin /teste | Sim | Irrelevante | → processSDRFlow |
| Lead | Sim + match | Irrelevante | → processSDRFlow |
| Lead | Não | Sim | → buildPrompt (stage settings) |
| Lead | Não | Não | → **Triagem** → Deal → Escala → Mute |

## Validação Gatilho Único

```mermaid
flowchart TD
    A["Salvar workflow ativo"] --> B{"Outro ativo com mesmo público?"}
    B -- "Sim" --> C["Desativa anterior + Toast"]
    B -- "Não" --> D["Salva OK"]
    C --> D
```
