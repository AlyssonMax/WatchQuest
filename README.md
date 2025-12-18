# Badge&Patch 🎬

## Visão Geral
**Badge&Patch** é uma aplicação web social (PWA-ready) para rastreamento de filmes e séries, focada em gamificação e colecionismo. Usuários criam listas curadas, acompanham seu progresso, ganham "Patches" (conquistas específicas de listas) e "Badges" (conquistas do sistema), e interagem com a comunidade.

## 🚀 Funcionalidades Atuais

### 🎨 Gamificação & Visual (Destaque)
*   **Patches (Recompensas de Lista):**
    *   **Estado Bloqueado:** Ao visualizar uma lista incompleta, o Patch aparece como uma **silhueta escura** (grayscale/darkened) com a porcentagem de progresso centralizada em branco.
    *   **Estado Desbloqueado:** Ao atingir 100%, a imagem do Patch se revela em cores originais e a porcentagem desaparece.
*   **List Detail Banner:** Ao completar 100% de uma lista, um banner dourado **"PATCH EARNED"** aparece no topo da tela de detalhes da lista, celebrando a conquista.
*   **Progresso Centrado no Visualizador:** O progresso exibido nas listas e nos patches é sempre relativo ao **usuário logado**. Se você visitar o perfil de um amigo, verá o *seu* progresso nas listas *dele*.

### 👤 Usuário
*   **Autenticação:** Login, Registro e simulação de verificação de e-mail com código OTP.
*   **Feed Social:** Visualize listas criadas pela comunidade, reaja com emojis dinâmicos e acesse detalhes.
*   **Criação de Listas:**
    *   Busca global de filmes (Mock DB + Integração OMDB simulada).
    *   Adição manual de filmes customizados.
    *   Upload de **Patch** (PNG com transparência) como recompensa exclusiva da lista.
*   **Perfil:**
    *   Galeria de Achievements (Badges Oficiais).
    *   Coleção de Patches (Listas criadas ou completadas).
    *   Sistema de Seguidores/Seguindo.

### 🛡️ Administração
*   **Dashboard:** Painel exclusivo para usuários com role `ADMIN`.
*   **Gerenciamento Total:** Exclusão de usuários (Cascade delete), Reset de senha, Promoção de cargos.
*   **Criação de Badges:** O Admin pode criar novas conquistas globais (Badges Oficiais) fazendo upload de imagens.
*   **Moderação:** Sistema de denúncias e resolução de reports.

---

## 🛠️ Stack Tecnológica (Atual)

*   **Frontend:** React 19, TypeScript, Vite.
*   **Estilização:** Tailwind CSS (via CDN para prototipagem rápida), FontAwesome Icons.
*   **Banco de Dados:** `LocalStorage` (Simulação de backend persistente no navegador via `services/db.ts`).
*   **Imagens:** Compressão automática (JPG para capas, PNG para patches) e armazenamento em Base64.

---

## 🔮 Melhorias Propostas & Roadmap

Como o projeto atual utiliza `LocalStorage` e Base64 para imagens, ele funciona como um protótipo de alta fidelidade. Para escalar para produção, sugerimos as seguintes melhorias:

### 1. Migração de Backend
*   **Problema:** `LocalStorage` tem limite de ~5MB. Imagens em Base64 lotam isso rapidamente.
*   **Solução:** Migrar para **Firebase** ou **Supabase**.
    *   *Auth:* Substituir simulação por Firebase Auth.
    *   *Database:* Substituir `db.ts` por Firestore/Postgres.
    *   *Storage:* Upload real de imagens para S3/Firebase Storage (retornando URLs em vez de Base64).

### 2. Otimização de Performance
*   **Virtualização:** Implementar `react-window` nas telas de Feed e Listas para renderizar apenas os itens visíveis, melhorando a performance em listas com +100 filmes.
*   **Code Splitting:** Configurar *Lazy Loading* nas rotas (`screens/`) para reduzir o tamanho do bundle inicial.

### 3. Refinamento de UX
*   **Skeleton Loading:** Substituir os spinners de "Loading..." por esqueletos pulsantes (Shimmer effect) para uma sensação de carregamento mais fluida.
*   **PWA Install Prompt:** Adicionar botão explícito para instalação do PWA em iOS/Android.

---

## 📂 Estrutura do Projeto

*   **`src/services/db.ts`**: O "Coração" do app. Contém toda a lógica de negócio, cálculo de progresso e persistência simulada.
*   **`src/screens/ProfileScreen.tsx`**: Contém a lógica visual crítica dos Patches (silhueta vs cor).
*   **`src/screens/ListViewScreen.tsx`**: Contém a lógica de atualização de status de filmes e o banner de conquista.

---

## 🔐 Credenciais de Demonstração

### Conta Admin
*   **User/Email:** `@admin` ou `admin@badgepatch.com`
*   **Senha:** `admin`

### Conta Usuário Padrão
*   **User/Email:** `@alex_watch` ou `alex@demo.com`
*   **Senha:** `123`
