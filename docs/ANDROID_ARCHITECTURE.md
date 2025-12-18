# Arquitetura Android Nativa - Badge&Patch

Este documento define a arquitetura técnica para a versão nativa Android do aplicativo **Badge&Patch**, focando em escalabilidade, testabilidade e robustez.

## 🏗️ Visão Geral da Arquitetura

Adotaremos o padrão **Clean Architecture** combinado com **MVVM (Model-View-ViewModel)**. O objetivo é separar as regras de negócio da interface do usuário e da manipulação de dados externos, facilitando a troca de APIs, bancos de dados ou frameworks de UI sem impactar o núcleo do app.

### Princípios Chave
1.  **Separação de Preocupações (SoC):** Cada camada tem uma responsabilidade única.
2.  **Direção da Dependência:** As dependências apontam sempre para dentro (Domain Layer). A camada de Domínio não sabe nada sobre Data ou Presentation.
3.  **Fonte Única da Verdade (SSOT):** O Repositório coordena os dados, garantindo que a UI receba dados consistentes (cache local vs nuvem).

---

## 📂 Estrutura de Pastas (Android Studio)

A estrutura de pacotes será organizada por **Camadas (Layers)** e, internamente, por **Funcionalidades (Features)** quando necessário.

```text
com.badgepatch.app
├── core/                   # Utilitários compartilhados, Extensions, Constantes
│   ├── di/                 # Injeção de Dependência (Hilt Modules)
│   ├── network/            # Configuração Retrofit/OkHttp
│   └── util/               # Resource, ResultWrappers
│
├── domain/                 # [CAMADA MAIS INTERNA] - Pure Kotlin
│   ├── model/              # Entidades de negócio (Ex: Movie, UserProfile)
│   ├── repository/         # Interfaces dos Repositórios
│   └── usecase/            # Regras de negócio unitárias (Ex: AddMovieToListUseCase)
│
├── data/                   # [CAMADA DE DADOS]
│   ├── local/              # Room Database (DAOs, Entities)
│   ├── remote/             # Retrofit Interfaces, DTOs (Data Transfer Objects)
│   ├── repository/         # Implementação das interfaces do Domain
│   └── mapper/             # Conversores (DTO <-> Domain <-> Entity)
│
└── presentation/           # [CAMADA DE UI]
    ├── theme/              # Jetpack Compose Theme (Colors, Type)
    ├── components/         # Widgets reutilizáveis (MovieCard, BadgeIcon)
    ├── home/               # Feature: Home
    │   ├── HomeViewModel.kt
    │   ├── HomeScreen.kt
    │   └── HomeState.kt
    ├── lists/              # Feature: Lists
    └── profile/            # Feature: Profile
```

---

## 🧠 Detalhamento das Camadas

### 1. Domain Layer (Domínio)
Esta é a camada central. Não possui dependências de Android (Context, View, etc.).

*   **Models:** Classes de dados puras (`data class`). Ex: `Movie`, `MediaList`.
*   **Repository Interfaces:** Contratos que definem *o que* pode ser feito com os dados, mas não *como*.
    *   Ex: `interface MovieRepository { suspend fun searchMovies(query: string): Flow<Resource<List<Movie>>> }`
*   **Use Cases (Interactors):** Encapsulam uma regra de negócio específica. Seguem o padrão de comando.
    *   Ex: `ToggleWatcherStatusUseCase`. Ele recebe o repositório no construtor, valida se o usuário pode alterar o status, chama o repositório e recalcula o progresso da lista.

### 2. Data Layer (Dados)
Responsável por fornecer dados para o Domínio.

*   **Data Sources:**
    *   *Remote:* Retrofit Service chamando a API OMDb ou Backend próprio. Usa DTOs (Ex: `OmdbSearchResponse`).
    *   *Local:* Room Database para cache offline. Usa Entities (Ex: `MovieEntity`).
*   **Repository Implementation:** Implementa a interface do Domínio. Decide se busca do cache local ou da rede.
    *   *Estratégia:* "Offline-First". Tenta mostrar dados locais imediatamente enquanto busca atualização na rede.
*   **Mappers:** Funções cruciais que transformam `NetworkDTO` em `DomainModel` e `DomainModel` em `LocalEntity`. Isso impede que mudanças na API quebrem a UI.

### 3. Presentation Layer (Apresentação)
Responsável por desenhar a tela e gerenciar o estado da UI.

*   **Technology:** Jetpack Compose (UI Declarativa).
*   **ViewModel:** Estende `ViewModel`.
    *   Recebe `UseCases` via Injeção de Dependência.
    *   Expõe o estado da UI através de `StateFlow` ou `SharedFlow`.
    *   Não segura referências a Views/Context (evita Memory Leaks).
*   **State Management:** Cada tela deve ter uma `data class` representando seu estado completo.
    *   Ex: `data class HomeUiState(val isLoading: Boolean, val lists: List<MediaList>, val error: String?)`.

---

## 🔄 Fluxo de Dados (Data Flow)

Exemplo: **Usuário busca um filme para adicionar a uma lista.**

1.  **UI (CreateListScreen):** Usuário digita "Inception" e dispara evento `onSearch("Inception")`.
2.  **ViewModel (CreateListViewModel):** Recebe o evento e lança uma corrotina.
    *   Atualiza estado para `isLoading = true`.
    *   Chama `searchMoviesUseCase("Inception")`.
3.  **Use Case (SearchMoviesUseCase):** Pode aplicar regras (ex: validar se a string não está vazia) e chama `repository.search("Inception")`.
4.  **Repository (MovieRepositoryImpl):**
    *   Verifica se há cache válido.
    *   Chama `apiService.search("Inception")`.
    *   Recebe JSON, converte DTO para Domain Model.
    *   Salva no banco local (opcional/cache).
    *   Retorna `Result.Success(List<Movie>)`.
5.  **ViewModel:** Recebe o resultado.
    *   Atualiza `_uiState` com a lista de filmes e `isLoading = false`.
6.  **UI (Compose):** Observa a mudança no `StateFlow` e redesenha a lista de resultados automaticamente.

---

## 🛡️ Decisões Técnicas e Padrões

### Stack Recomendada
*   **Linguagem:** Kotlin.
*   **UI:** Jetpack Compose (Material 3).
*   **Injeção de Dependência:** Hilt (Dagger). Essencial para testabilidade e gestão de escopo.
*   **Async:** Coroutines & Flow.
*   **Rede:** Retrofit + OkHttp + Moshi/Gson.
*   **Banco Local:** Room.
*   **Imagens:** Coil (Melhor integração com Compose).

### Tratamento de Erros (Error Handling)
Utilizar uma classe selada (`Sealed Class`) genérica para envelopar respostas entre Data e Domain:

```kotlin
sealed class Resource<T>(val data: T? = null, val message: String? = null) {
    class Success<T>(data: T) : Resource<T>(data)
    class Error<T>(message: String, data: T? = null) : Resource<T>(data, message)
    class Loading<T> : Resource<T>()
}
```

### Escalabilidade
*   **Modularização:** O projeto está estruturado para que, no futuro, `features` possam ser extraídas para módulos Gradle separados (`:feature:home`, `:feature:profile`), reduzindo tempo de build e permitindo times dedicados.
*   **Design System:** Criação de um módulo `:core:ui` contendo componentes base (Botões, Inputs, Tipografia) para garantir consistência visual em todo o app.

---

Este documento serve como a especificação técnica oficial para o desenvolvimento da versão Android do Badge&Patch.
