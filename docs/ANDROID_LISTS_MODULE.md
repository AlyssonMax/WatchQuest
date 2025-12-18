# Módulo de Listas Audiovisuais - Especificação Android

Este documento detalha a implementação do módulo de gerenciamento de listas de filmes/séries seguindo **Clean Architecture** e **MVVM**. Ele foi atualizado para refletir a lógica de "Patches" implementada no protótipo React.

## 1. Domain Layer (Domínio)

A camada central, agnóstica a frameworks.

### Models (`domain/model/`)

```kotlin
enum class MediaType { MOVIE, SERIES, ANIMATION, UNKNOWN }
enum class PrivacyLevel { PUBLIC, PRIVATE, FOLLOWERS_ONLY }
enum class WatchStatus { UNWATCHED, WATCHING, WATCHED }

data class Media(
    val remoteId: String, // IMDB ID
    val title: String,
    val year: String,
    val posterUrl: String,
    val type: MediaType,
    val durationMinutes: Int, 
    val rating: Double,
    val plot: String,
    val availableOn: List<String> = emptyList() // Netflix, Prime, etc.
)

data class ListItem(
    val id: String = java.util.UUID.randomUUID().toString(),
    val media: Media,
    val addedAt: Long = System.currentTimeMillis(),
    val status: WatchStatus = WatchStatus.UNWATCHED,
    val progressMinutes: Int = 0
)

data class BadgeReward(
    val id: String,
    val name: String,
    val iconUrl: String, // URL do PNG do Patch
    val description: String
)

data class MediaList(
    val id: String = java.util.UUID.randomUUID().toString(),
    val ownerId: String,
    val ownerName: String,
    val ownerAvatarUrl: String,
    val title: String,
    val description: String,
    val privacy: PrivacyLevel,
    val items: List<ListItem> = emptyList(),
    val badgeReward: BadgeReward? = null, // O Patch associado a esta lista
    val reactions: List<Reaction> = emptyList()
)
```

### Repository Interface (`domain/repository/MediaRepository.kt`)

```kotlin
interface MediaRepository {
    // Integração Externa (OMDb)
    suspend fun searchMedia(query: String): Flow<Resource<List<Media>>>
    
    // Gerenciamento de Listas
    suspend fun createList(
        name: String, 
        description: String, 
        privacy: PrivacyLevel, 
        patchImage: File? // Upload do Patch
    ): Resource<String>

    suspend fun getMyLists(): Flow<Resource<List<MediaList>>>
    
    // GetListById deve fundir o estado da lista com o progresso do usuário logado (SSOT)
    suspend fun getListById(listId: String): Flow<Resource<MediaList>>
    
    // Manipulação de Itens e Progresso
    suspend fun updateItemStatus(listId: String, mediaId: String, status: WatchStatus): Resource<Unit>
    suspend fun updateItemProgress(listId: String, mediaId: String, minutes: Int): Resource<Unit>
}
```

---

## 2. Data Layer (Dados)

### Lógica de Progresso (Melhoria Proposta)

No protótipo React, o cálculo de progresso é feito no cliente (`calculateListProgress`). No Android, idealmente, usamos **Room Relations** ou um **Query Interactor**.

**Estratégia Local (Room):**
Teremos uma tabela `user_media_progress` separada das listas. Quando carregamos uma `MediaList`, fazemos um *Left Join* com `user_media_progress` para preencher o `status` e `progressMinutes` de cada item baseado no usuário logado.

```kotlin
@Entity(tableName = "user_media_progress", primaryKeys = ["userId", "mediaId"])
data class UserMediaProgressEntity(
    val userId: String,
    val mediaId: String,
    val status: WatchStatus,
    val minutesWatched: Int
)
```

### Mapper de Progresso
Ao converter `ListEntity` para `MediaList` (Domínio), o repositório deve injetar o progresso do usuário atual nos itens.

---

## 3. Presentation Layer (UI)

### Visualização de Patches (`presentation/components/PatchIcon.kt`)

A lógica visual implementada no React (Silhueta escura com porcentagem vs. Colorido completo) deve ser replicada no Compose:

```kotlin
@Composable
fun PatchIcon(
    iconUrl: String,
    progress: Int, // 0 a 100
    onClick: () -> Unit
) {
    val isLocked = progress < 100
    
    Box(contentAlignment = Alignment.Center, modifier = Modifier.clickable { onClick() }) {
        // Imagem do Patch
        AsyncImage(
            model = iconUrl,
            contentDescription = null,
            modifier = Modifier
                .size(64.dp)
                .then(
                    if (isLocked) {
                        Modifier
                            .graphicsLayer { saturation = 0f } // Grayscale
                            .alpha(0.8f) // Opacidade reduzida
                            .drawWithContent {
                                drawContent()
                                // Sobreposição escura
                                drawRect(Color.Black.copy(alpha = 0.6f)) 
                            }
                    } else Modifier
                )
        )

        // Porcentagem (Apenas se bloqueado/em progresso)
        if (isLocked) {
            Text(
                text = "$progress%",
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.shadow(4.dp)
            )
        }
    }
}
```

### Detalhes da Lista (`presentation/lists/ListDetailScreen.kt`)

Deve observar o estado. Se `progress == 100` e `badgeReward != null`, exibir o banner "PATCH EARNED" no topo da lista. Este banner deve conter o ícone do patch, título dourado e mensagem de parabéns.