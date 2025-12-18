import React, { useState, useRef, useEffect } from 'react';
import { MediaList, Movie, PrivacyLevel, ListCategory } from '../types';
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
    // List Core Data
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ListCategory>(ListCategory.GENERAL);
    const [privacy, setPrivacy] = useState<PrivacyLevel>(PrivacyLevel.PUBLIC);
    
    // Patch / Trophy Data
    const [patchImage, setPatchImage] = useState<string>('');
    const patchInputRef = useRef<HTMLInputElement>(null);

    // Similarity Check Data
    const [similarLists, setSimilarLists] = useState<MediaList[]>([]);
    
    // Movie Selection Data
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Movie[]>([]); 
    const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);

    // Manual Entry States
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
                const results = await db.searchGlobalMovies(searchQuery);
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        };
        const timeoutId = setTimeout(performSearch, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleAddMovie = (movie: Movie) => {
        if (!selectedMovies.find(m => m.id === movie.id)) {
            setSelectedMovies([...selectedMovies, movie]);
        }
        setSearchQuery('');
        setSearchResults([]);
        setShowManual(false);
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
        
        // 1. Logic Check: Does this movie already exist in Global DB?
        // This prevents duplicate entries (e.g., "Inception" vs "Inception")
        const existing = await db.searchGlobalMovies(customTitle);
        const exactMatch = existing.find(m => m.title.toLowerCase() === customTitle.toLowerCase());

        if (exactMatch) {
            if (confirm(`We found "${exactMatch.title}" (${exactMatch.year}) in the database. Use that instead?`)) {
                handleAddMovie(exactMatch);
                // Reset form
                setCustomTitle('');
                setCustomYear('');
                setCustomPoster('');
                setCustomStreamings([]);
                return;
            }
        }

        // 2. Create New
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
            availableOn: customStreamings // Added streaming options
        };

        handleAddMovie(newMovie);
        setCustomTitle('');
        setCustomYear('');
        setCustomPoster('');
        setCustomStreamings([]);
    };

    const handleRemoveMovie = (id: string) => {
        setSelectedMovies(selectedMovies.filter(m => m.id !== id));
    };

    const handleSave = async () => {
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
        <div className="p-4 h-full flex flex-col">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create List</h2>
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
                        className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500 transition-colors flex items-center"
                    >
                        {isSaving ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
                        Save
                    </button>
                </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pb-20">
                {/* 1. Basic Info & Similarity Alert */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">List Details</label>
                    <input 
                        type="text" 
                        placeholder="List Title (e.g. Summer Vibes)" 
                        className="w-full bg-gray-800 text-white p-3 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    
                    {/* SIMILARITY ALERT */}
                    {similarLists.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 animate-fade-in">
                            <p className="text-xs text-yellow-500 font-bold mb-2">
                                <i className="fas fa-exclamation-triangle mr-1"></i> Similar lists found:
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {similarLists.map(l => (
                                    <div key={l.id} className="bg-gray-900 p-2 rounded border border-gray-700 min-w-[120px]">
                                        <p className="text-xs font-bold truncate">{l.title}</p>
                                        <p className="text-[10px] text-gray-500 truncate">by {l.creatorName}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <textarea 
                        placeholder="Short description..." 
                        className="w-full bg-gray-800 text-white p-3 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors h-24 resize-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* 2. Categorization */}
                <div>
                     <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 block">Theme / Category</label>
                     <div className="grid grid-cols-2 gap-2">
                         <select 
                            className="bg-gray-800 border border-gray-700 text-sm rounded-lg p-3 text-white outline-none w-full"
                            value={category}
                            onChange={(e) => setCategory(e.target.value as ListCategory)}
                        >
                            {Object.values(ListCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                         <select 
                            className="bg-gray-800 border border-gray-700 text-sm rounded-lg p-3 text-white outline-none w-full"
                            value={privacy}
                            onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
                        >
                            <option value={PrivacyLevel.PUBLIC}>Public</option>
                            <option value={PrivacyLevel.FOLLOWERS}>Followers Only</option>
                            <option value={PrivacyLevel.PRIVATE}>Private</option>
                        </select>
                     </div>
                </div>

                {/* 3. Patch / Trophy Upload */}
                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 block">
                        Completion Patch <span className="text-[10px] font-normal text-gray-500">(PNG Only)</span>
                    </label>
                    <div className="flex items-center space-x-4 bg-gray-800 p-3 rounded-xl border border-gray-700">
                        <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden border border-gray-600 border-dashed relative">
                            {patchImage ? (
                                <img src={patchImage} className="w-full h-full object-contain" />
                            ) : (
                                <i className="fas fa-medal text-gray-600 text-2xl"></i>
                            )}
                            {patchImage && (
                                <button onClick={() => setPatchImage('')} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <i className="fas fa-times text-white"></i>
                                </button>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-300 mb-2">Upload a trophy/pin for users who complete this list.</p>
                            <input 
                                type="file" 
                                ref={patchInputRef} 
                                className="hidden" 
                                accept="image/png" 
                                onChange={handlePatchUpload}
                            />
                            <button 
                                onClick={() => patchInputRef.current?.click()}
                                className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Upload PNG
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4. Movie Selection */}
                <div className="relative space-y-3 pt-4 border-t border-gray-700">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Content</label>
                    
                    <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
                        <button 
                            onClick={() => setShowManual(false)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${!showManual ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                        >
                            Search Global DB
                        </button>
                        <button 
                            onClick={() => setShowManual(true)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${showManual ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                        >
                            Add Custom
                        </button>
                    </div>

                    {!showManual ? (
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-3.5 text-gray-500"></i>
                            <input 
                                type="text" 
                                placeholder="Search existing movies..." 
                                className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute w-full mt-2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto">
                                    {searchResults.map(movie => (
                                        <div 
                                            key={movie.id} 
                                            onClick={() => handleAddMovie(movie)}
                                            className="p-3 flex items-center space-x-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700/50 last:border-0"
                                        >
                                            <img src={movie.poster} className="w-10 h-14 object-cover rounded" />
                                            <div>
                                                <p className="font-bold text-sm">{movie.title}</p>
                                                <p className="text-xs text-gray-400">{movie.year}</p>
                                            </div>
                                            <div className="ml-auto">
                                                <i className="fas fa-plus-circle text-purple-500"></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 space-y-3">
                             <input 
                                type="text" 
                                placeholder="Movie Title" 
                                className="w-full bg-gray-900 text-white p-2 rounded-lg border border-gray-600 text-sm focus:border-purple-500 outline-none"
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                            />
                             <div className="flex space-x-2">
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        placeholder="Poster URL" 
                                        className="w-full bg-gray-900 text-white p-2 rounded-lg border border-gray-600 text-sm"
                                        value={customPoster.length > 50 ? 'Image Uploaded' : customPoster}
                                        readOnly={customPoster.startsWith('data:')}
                                        onChange={(e) => setCustomPoster(e.target.value)}
                                    />
                                </div>
                                <input 
                                    type="file" 
                                    ref={posterInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handlePosterUpload}
                                />
                                <button onClick={() => posterInputRef.current?.click()} className="bg-gray-700 px-3 rounded-lg border border-gray-600 text-gray-300">
                                    <i className="fas fa-upload"></i>
                                </button>
                                <input 
                                    type="number" 
                                    placeholder="Year" 
                                    className="w-20 bg-gray-900 text-white p-2 rounded-lg border border-gray-600 text-sm"
                                    value={customYear}
                                    onChange={(e) => setCustomYear(e.target.value)}
                                />
                            </div>

                            {/* Streaming Options */}
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2 block">Available On</label>
                                <div className="flex flex-wrap gap-2">
                                    {STREAMING_SERVICES.map(service => (
                                        <button
                                            key={service.id}
                                            onClick={() => toggleStreaming(service.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                                customStreamings.includes(service.id)
                                                    ? `${service.color} border-transparent text-white`
                                                    : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400'
                                            }`}
                                        >
                                            {service.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                             <button 
                                onClick={handleAddCustomMovie}
                                disabled={!customTitle}
                                className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Add Custom Movie
                            </button>
                        </div>
                    )}
                </div>

                {/* Selected Movies List */}
                <div className="space-y-3 pt-2">
                    {selectedMovies.map((movie) => (
                        <div key={movie.id} className="flex items-center bg-gray-800/50 p-2 rounded-lg border border-gray-700 animate-fade-in">
                            <img src={movie.poster} className="w-12 h-16 rounded object-cover" />
                            <div className="ml-3 flex-1">
                                <h4 className="font-medium text-sm">{movie.title}</h4>
                                <div className="flex items-center space-x-2 mt-1">
                                     <span className="text-xs text-gray-400">{movie.year}</span>
                                     {movie.availableOn && movie.availableOn.length > 0 && (
                                         <div className="flex -space-x-1">
                                            {movie.availableOn.slice(0, 3).map(sid => {
                                                const s = STREAMING_SERVICES.find(serv => serv.id === sid);
                                                return s ? (
                                                    <div key={sid} className={`w-3 h-3 rounded-full ${s.color} border border-gray-800`} title={s.label}></div>
                                                ) : null;
                                            })}
                                         </div>
                                     )}
                                </div>
                            </div>
                            <button 
                                onClick={() => handleRemoveMovie(movie.id)}
                                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    ))}
                    {selectedMovies.length === 0 && (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                            <p className="text-sm">No movies added yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};