
import React, { useState, useRef, useEffect } from 'react';
import { MediaList, Movie, PrivacyLevel, ListCategory, MediaType, Season } from '../types';
import { db } from '../services/db';
import { compressImage, processPatchImage } from '../services/imageUtils';

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
    const [searchError, setSearchError] = useState('');

    const [showManual, setShowManual] = useState(false);
    const [customTitle, setCustomTitle] = useState('');
    const [customYear, setCustomYear] = useState('');
    const [customPoster, setCustomPoster] = useState('');
    const [customType, setCustomType] = useState<MediaType>(MediaType.MOVIE);
    
    const [customSeasons, setCustomSeasons] = useState<Season[]>([{ seasonNumber: 1, episodesCount: 1 }]);
    
    const posterInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        const performSearch = async () => {
            if (searchQuery.length > 1) {
                setIsSearching(true);
                setSearchError('');
                try {
                    const results = await db.searchGlobalMovies(searchQuery);
                    setSearchResults(results);
                } catch (e: any) {
                    setSearchError(e.message || "Search failed");
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setSearchError('');
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

    const handleSeasonChange = (index: number, episodes: number) => {
        const updated = [...customSeasons];
        updated[index].episodesCount = Math.max(1, episodes);
        setCustomSeasons(updated);
    };

    const addSeasonField = () => {
        setCustomSeasons([...customSeasons, { seasonNumber: customSeasons.length + 1, episodesCount: 1 }]);
    };

    const removeSeasonField = () => {
        if (customSeasons.length > 1) {
            setCustomSeasons(customSeasons.slice(0, -1));
        }
    };

    const handleAddCustomMovie = async () => {
        if (!customTitle) return;
        
        const isSeries = customType !== MediaType.MOVIE;
        const posterUrl = customPoster.trim() 
            ? customPoster 
            : `https://placehold.co/300x450/374151/FFFFFF/png?text=${encodeURIComponent(customTitle)}`;

        const newMovie: Movie = {
            id: `custom_${Date.now()}`,
            title: customTitle,
            year: parseInt(customYear) || new Date().getFullYear(),
            duration: isSeries ? `${customSeasons.length} Seasons` : '120 min',
            poster: posterUrl,
            rating: 0,
            synopsis: 'User added content.',
            availableOn: [],
            type: customType,
            totalSeasons: isSeries ? customSeasons.length : undefined,
            seasonsData: isSeries ? customSeasons : undefined
        };

        handleAddMovie(newMovie);
        setCustomTitle('');
        setCustomYear('');
        setCustomPoster('');
        setCustomType(MediaType.MOVIE);
        setCustomSeasons([{ seasonNumber: 1, episodesCount: 1 }]);
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
             <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-900 z-50 py-2 border-b border-gray-800">
                <h2 className="text-xl font-bold">Create List</h2>
                <div className="flex items-center space-x-2">
                    <button onClick={onCancel} className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                    <button 
                        onClick={handleSave}
                        disabled={!title || selectedMovies.length === 0 || isSaving}
                        className="bg-purple-600 text-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest disabled:opacity-50 hover:bg-purple-500 shadow-lg active:scale-95 transition-all"
                    >
                        {isSaving ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
                        Save List
                    </button>
                </div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pb-24 scrollbar-hide">
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="List Title" 
                        className="w-full bg-gray-800 text-white p-4 rounded-2xl border border-gray-700 focus:border-purple-500 focus:outline-none transition-all"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <textarea 
                        placeholder="Collection description..." 
                        className="w-full bg-gray-800 text-white p-4 rounded-2xl border border-gray-700 focus:border-purple-500 focus:outline-none h-24 resize-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    {/* PATCH REWARD UPLOAD SECTION */}
                    <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700 border-dashed">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest">Completion Patch</h3>
                                <p className="text-[10px] text-gray-500">Reward given to users who complete this list.</p>
                            </div>
                            {patchImage && (
                                <button onClick={() => setPatchImage('')} className="text-red-500 text-[10px] font-bold">Remove</button>
                            )}
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div 
                                onClick={() => patchInputRef.current?.click()}
                                className="w-16 h-16 rounded-full bg-gray-900 border-2 border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-purple-500 transition-all overflow-hidden"
                            >
                                {patchImage ? (
                                    <img src={patchImage} className="w-full h-full object-contain p-1" />
                                ) : (
                                    <i className="fas fa-plus text-gray-600"></i>
                                )}
                            </div>
                            <div className="flex-1">
                                <button 
                                    onClick={() => patchInputRef.current?.click()}
                                    className="text-[10px] font-black uppercase tracking-widest bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    {patchImage ? 'Change Image' : 'Upload PNG Patch'}
                                </button>
                                <p className="text-[8px] text-gray-600 mt-1 uppercase">Transparency recommended (PNG only)</p>
                            </div>
                        </div>
                        <input type="file" ref={patchInputRef} className="hidden" accept="image/png" onChange={handlePatchUpload} />
                    </div>
                </div>

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
                                    placeholder="Search for movies or series..." 
                                    className="w-full bg-gray-800 text-white pl-12 pr-4 py-4 rounded-2xl border border-gray-700 focus:border-purple-500 outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {searchError && <p className="text-red-500 text-xs mt-2 px-2 italic">{searchError}</p>}
                            
                            {searchResults.length > 0 && (
                                <div className="absolute w-full mt-2 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto scrollbar-hide">
                                    {searchResults.map(media => (
                                        <div 
                                            key={media.id} 
                                            onClick={() => handleAddMovie(media)}
                                            className="p-3 flex items-center space-x-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition-colors"
                                        >
                                            <img src={media.poster} className="w-10 h-14 object-cover rounded-lg shadow-md" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-white truncate">{media.title}</p>
                                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">{media.year} • {media.type}</p>
                                            </div>
                                            <i className="fas fa-plus-circle text-purple-500"></i>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 space-y-4 animate-fade-in">
                             <div className="flex space-x-2">
                                <select 
                                    className="flex-1 bg-gray-900 text-white p-3 rounded-xl border border-gray-700 text-sm outline-none"
                                    value={customType}
                                    onChange={(e) => setCustomType(e.target.value as MediaType)}
                                >
                                    {Object.values(MediaType).map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <input 
                                    type="number" 
                                    placeholder="Year" 
                                    className="w-24 bg-gray-900 text-white p-3 rounded-xl border border-gray-700 text-sm"
                                    value={customYear}
                                    onChange={(e) => setCustomYear(e.target.value)}
                                />
                             </div>
                             
                             <input 
                                type="text" 
                                placeholder="Media Title" 
                                className="w-full bg-gray-900 text-white p-3 rounded-xl border border-gray-700 text-sm outline-none"
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                            />

                             {customType !== MediaType.MOVIE && (
                                 <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50 space-y-3">
                                     <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Seasons Configuration</span>
                                        <div className="flex space-x-1">
                                            <button onClick={removeSeasonField} className="w-6 h-6 bg-red-900/20 text-red-500 rounded flex items-center justify-center text-[10px]"><i className="fas fa-minus"></i></button>
                                            <button onClick={addSeasonField} className="w-6 h-6 bg-green-900/20 text-green-500 rounded flex items-center justify-center text-[10px]"><i className="fas fa-plus"></i></button>
                                        </div>
                                     </div>
                                     <div className="max-h-32 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                                        {customSeasons.map((s, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
                                                <span className="text-[10px] font-bold text-gray-400">Season {s.seasonNumber}</span>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[9px] text-gray-600 uppercase font-black">Episodes:</span>
                                                    <input 
                                                        type="number" 
                                                        value={s.episodesCount} 
                                                        onChange={(e) => handleSeasonChange(idx, parseInt(e.target.value))}
                                                        className="w-12 bg-black text-white text-center rounded border border-gray-700 text-[10px] p-1 focus:border-purple-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                     </div>
                                 </div>
                             )}

                             <div className="flex space-x-2">
                                <button onClick={() => posterInputRef.current?.click()} className="flex-1 bg-gray-700 py-3 rounded-xl border border-gray-600 text-gray-300 active:scale-95 transition-transform flex items-center justify-center text-[10px] font-black uppercase tracking-widest">
                                    <i className="fas fa-upload mr-2"></i> {customPoster ? 'Image Uploaded' : 'Upload Poster'}
                                </button>
                                <input type="file" ref={posterInputRef} className="hidden" accept="image/*" onChange={handlePosterUpload} />
                            </div>
                            <button 
                                onClick={handleAddCustomMovie}
                                disabled={!customTitle}
                                className="w-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-purple-900/20 active:scale-[0.98]"
                            >
                                Add To List
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-3 mt-6">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest block">Collection Items ({selectedMovies.length})</label>
                    {selectedMovies.map((media) => (
                        <div key={media.id} className="flex items-center bg-gray-800/40 p-3 rounded-2xl border border-gray-800 group animate-fade-in-up">
                            <img src={media.poster} className="w-12 h-16 rounded-lg object-cover shadow-lg" />
                            <div className="ml-4 flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-white truncate">{media.title}</h4>
                                <div className="flex items-center space-x-2">
                                    <span className="text-[9px] bg-gray-900 px-1.5 py-0.5 rounded text-gray-500 font-bold uppercase">{media.type}</span>
                                    <span className="text-[10px] text-gray-500 font-bold">{media.year}</span>
                                </div>
                            </div>
                            <button onClick={() => handleRemoveMovie(media.id)} className="p-3 text-gray-600 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
