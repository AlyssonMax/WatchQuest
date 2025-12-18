import { Movie } from '../types';

const API_KEY = 'b9bd48a6'; // Demo key. In production, use process.env.
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
    Runtime: string; // "148 min"
    Poster: string;
    imdbRating: string;
    Plot: string;
    imdbID: string;
    Response: string;
}

export const omdbService = {
    async searchMovies(query: string): Promise<Movie[]> {
        try {
            // 1. Search for titles
            const searchUrl = `${BASE_URL}?s=${encodeURIComponent(query)}&type=movie&apikey=${API_KEY}`;
            const res = await fetch(searchUrl);
            const data = await res.json();

            if (data.Response === "True" && data.Search) {
                // 2. Map basic results
                // Note: OMDb search doesn't return Duration/Plot, so we might need detailed fetch 
                // for the user selected item later, but for the list, we'll map what we have.
                // To be robust, we fetch details for the top 3 to get duration/plot.
                const topResults = (data.Search as OmdbSearchResult[]).slice(0, 3);
                
                const detailedPromises = topResults.map(async (item) => {
                     const detailUrl = `${BASE_URL}?i=${item.imdbID}&apikey=${API_KEY}`;
                     const detailRes = await fetch(detailUrl);
                     const detailData = await detailRes.json() as OmdbDetailResult;
                     return detailData;
                });

                const detailedResults = await Promise.all(detailedPromises);

                return detailedResults.map(mapOmdbToMovie);
            }
            return [];
        } catch (error) {
            console.warn("OMDb API failed, falling back to local.", error);
            return [];
        }
    }
};

const mapOmdbToMovie = (data: OmdbDetailResult): Movie => {
    return {
        id: data.imdbID,
        title: data.Title,
        year: parseInt(data.Year) || new Date().getFullYear(),
        duration: data.Runtime !== "N/A" ? data.Runtime : "?? min",
        poster: data.Poster !== "N/A" ? data.Poster : "https://placehold.co/300x450?text=No+Poster",
        rating: parseFloat(data.imdbRating) || 0,
        synopsis: data.Plot !== "N/A" ? data.Plot : "No description available.",
        availableOn: [] // OMDb doesn't provide streaming info
    };
};