# Módulo de Usuários e Perfil - Especificação Android

Este documento detalha a implementação do módulo de usuários. Atualizado para refletir a estrutura de dados do protótipo React atual.

## 1. Domain Layer (Domínio)

### Models (`domain/model/User.kt`)

```kotlin
enum class UserRole { USER, ADMIN }

enum class BadgeType { OFFICIAL, COMMUNITY }

data class Badge(
    val id: String,
    val name: String,
    val icon: String, // FontAwesome class ou URL
    val description: String,
    val type: BadgeType, // OFFICIAL (Sistema) ou COMMUNITY (Patches de Listas)
    val earnedDate: String,
    val relatedListId: String? = null
)

data class User(
    val id: String,
    val name: String,
    val handle: String,
    val bio: String,
    val avatarUrl: String,
    val coverImageUrl: String?,
    val role: UserRole,
    
    // Stats
    val followersCount: Int,
    val followingCount: Int,
    val joinedAt: Long,
    
    // Conquistas (Lista unificada)
    val badges: List<Badge> = emptyList(), 
    
    // Estado Relacional (Contexto do Viewer)
    val isFollowing: Boolean = false
)
```

### Use Cases (`domain/usecase/user/`)

#### `GetProfileDataUseCase.kt`
Este caso de uso é específico para a tela de Perfil. Ele precisa agregar:
1.  Dados do Usuário.
2.  **Achievements:** Filtrar `user.badges` onde `type == OFFICIAL`.
3.  **Patches Conquistados:** Filtrar `user.badges` onde `type == COMMUNITY`.
4.  **Patches Criados (Coleção):** Buscar listas criadas pelo usuário e calcular o progresso do *viewer* atual sobre elas.

---

## 2. Data Layer (Dados)

### Repository Implementation (`data/repository/UserRepositoryImpl.kt`)

Diferente do React onde usamos um JSON gigante, no Android usaremos tabelas relacionais no Room.

**Tabelas Sugeridas:**
*   `users`
*   `badges` (Definições de badges oficiais e customizados)
*   `user_badges` (Join table: userId, badgeId, earnedDate)
*   `user_relations` (followerId, followingId)

### Estratégia de "Meus Dados"
O Repositório deve expor um `Flow<User>` específico para o usuário logado (`SessionManager`), garantindo que alterações de perfil (avatar, bio) sejam refletidas instantaneamente em todo o app.

---

## 3. Presentation Layer (UI)

### Profile Screen Logic

A lógica visual de separar "Achievements" (Troféus do sistema) de "Patches" (Listas) deve ser mantida na UI.

```kotlin
// Exemplo de lógica no Composable ViewModel
val officialBadges = user.badges.filter { it.type == BadgeType.OFFICIAL }
val communityPatches = user.badges.filter { it.type == BadgeType.COMMUNITY }

// Para a lista de "Patches", mesclamos:
// 1. communityPatches (Conquistados de outros) -> Status: 100%
// 2. Lists Created by User -> Status: Progresso do Viewer atual
```

### Melhoria Proposta: Otimização de Imagens
No protótipo React, usamos Base64. No Android, **DEVEMOS** usar uma biblioteca como **Coil** ou **Glide**.
*   O campo `avatarUrl` deve aceitar URLs remotas (S3/Firebase).
*   Uploads devem ser feitos para um Storage Service, retornando a URL para salvar no banco, evitando o bloqueio da UI com processamento de Base64 pesado.