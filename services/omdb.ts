
import { Movie, MediaType, Season, Episode } from '../types';

const API_KEY = 'b9bd48a6'; 
const BASE_URL = 'https://www.omdbapi.com/';

interface OmdbSearchResult {
    Title: string;
    Year: string;
    imdbID: string;
    Type: string;
    Poster: string;
}

interface OmdbDetailResult {
    Title: string;
    Year: string;
    Runtime: string;
    Poster: string;
    imdbRating: string;
    Plot: string;
    imdbID: string;
    Type: string; // 'movie' ou 'series'
    totalSeasons?: string;
    Response: string;
}

interface OmdbSeasonResult {
    Title: string;
    Season: string;
    totalSeasons: string;
    Episodes: {
        Title: string;
        Released: string;
        Episode: string;
        imdbRating: string;
        imdbID: string;
    }[];
    Response: string;
}

export const omdbService = {
    async searchMovies(query: string): Promise<Movie[]> {
        try {
            const searchUrl = `${BASE_URL}?s=${encodeURIComponent(query)}&apikey=${API_KEY}`;
            const res = await fetch(searchUrl);
            const data = await res.json();

            if (data.Response === "True" && data.Search) {
                const topResults = (data.Search as OmdbSearchResult[]).slice(0, 5);
                const detailedResults = await Promise.all(
                    topResults.map(async (item) => {
                        const detailUrl = `${BASE_URL}?i=${item.imdbID}&apikey=${API_KEY}`;
                        const detailRes = await fetch(detailUrl);
                        return await detailRes.json() as OmdbDetailResult;
                    })
                );
                return detailedResults.map(mapOmdbToMedia);
            }
            return [];
        } catch (error) {
            console.error("OMDb API Error:", error);
            throw new Error("Erro de conexão com OMDb.");
        }
    },

    /**
     * Busca episódios de uma temporada específica (Lazy Loading)
     */
    async getSeasonEpisodes(seriesId: string, seasonNumber: number): Promise<Episode[]> {
        try {
            const url = `${BASE_URL}?i=${seriesId}&Season=${seasonNumber}&apikey=${API_KEY}`;
            const res = await fetch(url);
            const data = await res.json() as OmdbSeasonResult;

            if (data.Response === "True" && data.Episodes) {
                return data.Episodes.map(ep => ({
                    episodeNumber: parseInt(ep.Episode) || 0,
                    watched: false
                })).filter(ep => ep.episodeNumber > 0);
            }
            return [];
        } catch (error) {
            console.error("OMDb Season Fetch Error:", error);
            return [];
        }
    }
};

const mapOmdbToMedia = (data: OmdbDetailResult): Movie => {
    // Normaliza o tipo para evitar falhas com 'Series' vs 'series'
    const omdbType = data.Type?.toLowerCase();
    const isSeries = omdbType === 'series' || omdbType === 'episode';
    
    // Trata ano: "2019–2023" ou "2019-" -> extrai o primeiro ano numérico (2019)
    const yearMatch = data.Year.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

    // Garante que séries tenham pelo menos 1 temporada no metadado para habilitar o seletor na UI
    const rawSeasons = parseInt(data.totalSeasons || "1");
    const seasonsCount = isSeries ? (isNaN(rawSeasons) ? 1 : Math.max(1, rawSeasons)) : undefined;
    
    // Inicializa temporadas como um esqueleto (Skeleton) para Lazy Loading posterior
    const seasonsData: Season[] | undefined = (isSeries && seasonsCount) ? 
        Array.from({ length: seasonsCount }, (_, i) => ({
            seasonNumber: i + 1,
            episodesCount: 0 // Será preenchido quando a temporada for carregada na ListViewScreen
        })) : undefined;

    return {
        id: data.imdbID,
        title: data.Title,
        year: year,
        // Séries exibem o número de temporadas em vez de duração em minutos
        duration: isSeries ? `${seasonsCount} Seasons` : (data.Runtime !== "N/A" ? data.Runtime : "?? min"),
        poster: data.Poster !== "N/A" ? data.Poster : "https://placehold.co/300x450?text=No+Poster",
        rating: parseFloat(data.imdbRating) || 0,
        synopsis: data.Plot !== "N/A" ? data.Plot : "No description available.",
        availableOn: [],
        type: isSeries ? MediaType.SERIES : MediaType.MOVIE,
        totalSeasons: seasonsCount,
        seasonsData: seasonsData
    };
};
