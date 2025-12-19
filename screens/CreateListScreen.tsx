
import React, { useState, useRef, useEffect } from 'react';
import { MediaList, Movie, PrivacyLevel, ListCategory, MediaType } from '../types';
import { db } from '../services/db';
import { compressImage, processPatchImage } from '../services/imageUtils';

const STREAMING_SERVICES = [
    { id: 'Netflix', label: 'Netflix', color: 'bg-red-600' },
    { id: 'Prime Video', label: 'Prime', color: 'bg-blue-500' },
    { id: 'Disney+', label: 'Disney+', color: 'bg-blue-900' },
    { id: 'HBO Max', label: 'Max', color: 'bg-purple-700' },
    { id: 'Hulu', label: 'Hulu', color: 'bg-green-500' },
    { id: 'Apple TV+', label: 'AppleTV', color: 'bg-gray-800' },
];

export const CreateListScreen: React.FC<{ onSave: () => void; onCancel: () => void }> = ({ onSave, onCancel }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ListCategory>(ListCategory.GENERAL);
    const [privacy, setPrivacy] = useState<PrivacyLevel>(PrivacyLevel.PUBLIC);
    
    const [patchImage, setPatchImage] = useState<string>('');
    const patchInputRef = useRef<HTMLInputElement>(null);

    const [similarLists, setSimilarLists] = useState<MediaList[]>([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Movie[]>([]); 
    const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const [showManual, setShowManual] = useState(false);
    const [customTitle, setCustomTitle] = useState('');
    const [customYear, setCustomYear] = useState('');
    const [customPoster, setCustomPoster] = useState('');
    const [customStreamings, setCustomStreamings] = useState<string[]>([]);
    
    const posterInputRef = useRef<HTMLInputElement>(null);

    // --- REAL TIME SIMILARITY CHECK ---
    useEffect(() => {
        const checkSimilarity = async () => {
            if (title.length > 3) {
                const results = await db.findSimilarLists(title);
                setSimilarLists(results);
            } else {
                setSimilarLists([]);
            }
        };
        const timeoutId = setTimeout(checkSimilarity, 500);
        return () => clearTimeout(timeoutId);
    }, [title]);

    // --- GLOBAL MOVIE SEARCH ---
    useEffect(() => {
        const performSearch = async () => {
            if (searchQuery.length > 1) {
                setIsSearching(true);
                try {
                    const results = await db.searchGlobalMovies(searchQuery);
                    setSearchResults(results);
                } catch (e) {
                    console.error("Search failed", e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        };
        const timeoutId = setTimeout(performSearch, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleAddMovie = (movie: Movie) => {
        if (!selectedMovies.find(m => m.id === movie.id)) {
            setSelectedMovies([...selectedMovies, movie]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setCustomPoster(compressed);
            } catch (err) {
                alert("Could not process image");
            }
        }
    };

    const handlePatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await processPatchImage(file);
                setPatchImage(compressed);
            } catch (err: any) {
                alert(err.message || "Could not process patch. Ensure it is PNG.");
            }
        }
    };

    const toggleStreaming = (serviceId: string) => {
        if (customStreamings.includes(serviceId)) {
            setCustomStreamings(customStreamings.filter(s => s !== serviceId));
        } else {
            setCustomStreamings([...customStreamings, serviceId]);
        }
    };

    const handleAddCustomMovie = async () => {
        if (!customTitle) return;
        
        const posterUrl = customPoster.trim() 
            ? customPoster 
            : `https://placehold.co/300x450/374151/FFFFFF/png?text=${encodeURIComponent(customTitle)}`;

        const newMovie: Movie = {
            id: `custom_${Date.now()}`,
            title: customTitle,
            year: parseInt(customYear) || new Date().getFullYear(),
            duration: '?? min',
            poster: posterUrl,
            rating: 0,
            synopsis: 'User added content.',
            availableOn: customStreamings,
            type: MediaType.MOVIE
        };

        handleAddMovie(newMovie);
        setCustomTitle('');
        setCustomYear('');
        setCustomPoster('');
        setCustomStreamings([]);
        setShowManual(false);
    };

    const handleRemoveMovie = (id: string) => {
        setSelectedMovies(selectedMovies.filter(m => m.id !== id));
    };

    const handleSave = async () => {
        if (!title || selectedMovies.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            await db.createList(title, description, selectedMovies, privacy, category, patchImage);
            onSave();
        } catch (e) {
            alert('Error creating list. Storage might be full.');
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 h-full flex flex-col bg-gray-900 overflow-hidden">
             {/* HEADER COM BOTÃO DE SALVAR */}
             <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-900 z-50 py-2 border-b border-gray-800">
                <h2 className="text-xl font-bold">Create List</h2>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!title || selectedMovies.length === 0 || isSaving}
                        className="bg-purple-600 text-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500 transition-all shadow-lg active:scale-95 flex items-center"
                    >
                        {isSaving ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
                        Save List
                    </button>
                </div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pb-24 scrollbar-hide">
                {/* 1. Basic Info */}
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="List Title (e.g. Summer Vibes)" 
                        className="w-full bg-gray-800 text-white p-4 rounded-2xl border border-gray-700 focus:border-purple-500 focus:outline-none transition-all"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    
                    {similarLists.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 animate-fade-in">
                            <p className="text-[10px] text-yellow-500 font-black uppercase mb-2">
                                <i className="fas fa-exclamation-triangle mr-1"></i> Similar lists found:
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {similarLists.map(l => (
                                    <div key={l.id} className="bg-gray-900 p-2 rounded-lg border border-gray-800 min-w-[140px]">
                                        <p className="text-[11px] font-bold truncate text-white">{l.title}</p>
                                        <p className="text-[9px] text-gray-500 truncate">by {l.creatorName}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <textarea 
                        placeholder="What is this collection about?" 
                        className="w-full bg-gray-800 text-white p-4 rounded-2xl border border-gray-700 focus:border-purple-500 focus:outline-none transition-all h-24 resize-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* 2. Categorization */}
                <div className="grid grid-cols-2 gap-3">
                    <select 
                        className="bg-gray-800 border border-gray-700 text-sm rounded-xl p-3 text-white outline-none w-full"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ListCategory)}
                    >
                        {Object.values(ListCategory).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select 
                        className="bg-gray-800 border border-gray-700 text-sm rounded-xl p-3 text-white outline-none w-full"
                        value={privacy}
                        onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
                    >
                        <option value={PrivacyLevel.PUBLIC}>Public</option>
                        <option value={PrivacyLevel.FOLLOWERS}>Followers Only</option>
                        <option value={PrivacyLevel.PRIVATE}>Private</option>
                    </select>
                </div>

                {/* 3. Patch Reward */}
                <div>
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 block">Completion Patch</label>
                    <div className="flex items-center space-x-4 bg-gray-800 p-4 rounded-2xl border border-gray-700">
                        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-700 border-dashed relative">
                            {patchImage ? (
                                <img src={patchImage} className="w-full h-full object-contain p-1" />
                            ) : (
                                <i className="fas fa-medal text-gray-700 text-2xl"></i>
                            )}
                        </div>
                        <div className="flex-1">
                            <input 
                                type="file" 
                                ref={patchInputRef} 
                                className="hidden" 
                                accept="image/png" 
                                onChange={handlePatchUpload}
                            />
                            <button 
                                onClick={() => patchInputRef.current?.click()}
                                className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full font-black uppercase tracking-widest"
                            >
                                {patchImage ? 'Change PNG' : 'Upload PNG'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4. Add Content Section */}
                <div className="pt-4 border-t border-gray-800">
                    <div className="flex bg-gray-800 p-1.5 rounded-2xl border border-gray-700 mb-4">
                        <button 
                            onClick={() => setShowManual(false)}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!showManual ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                        >
                            Global Search
                        </button>
                        <button 
                            onClick={() => setShowManual(true)}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${showManual ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                        >
                            Manual Entry
                        </button>
                    </div>

                    {!showManual ? (
                        <div className="relative">
                            <div className="relative">
                                <i className={`fas ${isSearching ? 'fa-circle-notch fa-spin' : 'fa-search'} absolute left-4 top-4 text-gray-500`}></i>
                                <input 
                                    type="text" 
                                    placeholder="Search movies or series..." 
                                    className="w-full bg-gray-800 text-white pl-12 pr-4 py-4 rounded-2xl border border-gray-700 focus:border-purple-500 focus:outline-none transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            {/* DROPDOWN DE RESULTADOS DE BUSCA */}
                            {searchResults.length > 0 && (
                                <div className="absolute w-full mt-2 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto">
                                    {searchResults.map(movie => (
                                        <div 
                                            key={movie.id} 
                                            onClick={() => handleAddMovie(movie)}
                                            className="p-3 flex items-center space-x-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700/30 last:border-0 transition-colors"
                                        >
                                            <img src={movie.poster} className="w-10 h-14 object-cover rounded-lg shadow-md" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-white truncate">{movie.title}</p>
                                                <p className="text-[10px] text-gray-500 font-black uppercase">{movie.year} • {movie.type}</p>
                                            </div>
                                            <i className="fas fa-plus-circle text-purple-500 text-lg"></i>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 space-y-4">
                             <input 
                                type="text" 
                                placeholder="Media Title" 
                                className="w-full bg-gray-900 text-white p-3 rounded-xl border border-gray-700 text-sm outline-none"
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                            />
                             <div className="flex space-x-2">
                                <button onClick={() => posterInputRef.current?.click()} className="bg-gray-700 px-4 rounded-xl border border-gray-600 text-gray-300 active:scale-95 transition-transform flex items-center justify-center">
                                    <i className="fas fa-upload mr-2"></i> Poster
                                </button>
                                <input type="file" ref={posterInputRef} className="hidden" accept="image/*" onChange={handlePosterUpload} />
                                <input 
                                    type="number" 
                                    placeholder="Year" 
                                    className="w-24 bg-gray-900 text-white p-3 rounded-xl border border-gray-700 text-sm"
                                    value={customYear}
                                    onChange={(e) => setCustomYear(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleAddCustomMovie}
                                disabled={!customTitle}
                                className="w-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all disabled:opacity-50"
                            >
                                Add Manual Item
                            </button>
                        </div>
                    )}
                </div>

                {/* Selected Movies List */}
                <div className="space-y-3 mt-6">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest block">Collection Items ({selectedMovies.length})</label>
                    {selectedMovies.map((movie) => (
                        <div key={movie.id} className="flex items-center bg-gray-800/40 p-3 rounded-2xl border border-gray-800 animate-fade-in group">
                            <img src={movie.poster} className="w-12 h-16 rounded-lg object-cover shadow-lg" />
                            <div className="ml-4 flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-white truncate">{movie.title}</h4>
                                <p className="text-[10px] text-gray-500 font-bold">{movie.year}</p>
                            </div>
                            <button 
                                onClick={() => handleRemoveMovie(movie.id)}
                                className="p-3 text-gray-600 hover:text-red-500 transition-colors"
                            >
                                <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                        </div>
                    ))}
                    {selectedMovies.length === 0 && (
                        <div className="text-center py-12 text-gray-600 border-2 border-dashed border-gray-800 rounded-3xl">
                            <i className="fas fa-film text-3xl mb-3 opacity-20"></i>
                            <p className="text-xs uppercase font-black tracking-widest">No items added yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
