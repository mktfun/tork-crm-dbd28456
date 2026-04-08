# Master Spec: 041 Immersive Workspace & Layout Normalization

## 1. Visão Geral
Esta especificação resolve o problema crítico de "tela esmagada" no SDR Builder e unifica a experiência de layout do Tork CRM. Vamos remover as restrições de largura global que estão causando cortes e comportamentos anômalos (como a barra cinza lateral) e garantir que ferramentas de Canvas ocupem 100% do espaço, enquanto páginas de dados mantenham sua elegância centralizada.

## 2. Diagnóstico Visual (Baseado em Imagens)
- **Problema A:** O `RootLayout` possui um `max-w-[1600px]` e paddings fixos que "enjaulam" o Builder.
- **Problema B:** Ao abrir o Simulador ou a Sidebar, o container interno do Builder sofre um re-layout que o empurra para a esquerda, revelando o fundo cinza do container pai.
- **Problema C:** O `TabsContent` do Radix UI (usado no Dashboard de Automação) não tem `height: 100%` por padrão, fazendo com que o Builder "flutue" sem altura definida.

## 3. Solução Proposta

### 3.1 Anatomia do Novo Layout (`RootLayout.tsx`)
O layout raiz deixará de impor margens. Ele entregará um `main` totalmente limpo (`w-screen h-screen overflow-hidden`).
- Isso permitirá que o Kanban e o SDR Builder encostem nas bordas da tela.

### 3.2 Blindagem das Páginas de Lista
Para não quebrar a estética das outras telas (Clientes, Dashboard, etc.), vamos criar um componente de wrapper (ou aplicar classes) que re-introduz o padding e o limite de 1600px especificamente nelas.

### 3.3 SDR Builder em Tela Cheia
- Ajustar `AIAutomationDashboard.tsx` para que cada aba (`TabsContent`) force `h-full w-full flex flex-col`.
- Ajustar `SDRBuilder.tsx` para usar `flex-1` real, garantindo que o `reactFlowWrapper` ocupe cada pixel disponível abaixo do menu superior.
- Corrigir a posição `absolute` do Simulador e da Sidebar de Propriedades para que eles não causem "scroll-jump" (pulos de rolagem).

## 4. User Stories
- **US1:** Como Usuário, quero que o SDR Builder ocupe toda a largura e altura do meu navegador, permitindo ver fluxos grandes sem cortes.
- **US2:** Como Usuário, ao abrir o simulador de chat, quero que ele sobreponha o canvas suavemente sem "empurrar" o desenho dos blocos para o lado.
- **US3:** Como Usuário, quero que as telas de Clientes e Apólices continuem centralizadas e com margens bonitas.

## 5. Plano de Execução
1. **RootLayout:** Limpar margens e larguras.
2. **Normalização:** Aplicar paddings internos nas páginas `Dashboard.tsx`, `Clients.tsx`, `Policies.tsx`, `FinanceiroERP.tsx`.
3. **Builder Fix:** Forçar altura máxima e remover limites de largura no Dashboard de Automação e no Canvas do SDR.
