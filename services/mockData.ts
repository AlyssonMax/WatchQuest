import { Badge, ListItem, MediaList, Movie, PrivacyLevel, User, WatchStatus, UserRole, BadgeType, ListCategory } from '../types';

// SYSTEM ACHIEVEMENTS DEFINITIONS (Generic App Themed)
export const SYSTEM_BADGES = {
    // LIST CREATION
    CREATOR_NOVICE: { id: 'ach_creator_1', name: 'Novice Creator', description: 'Created your first list. Welcome to the club!', icon: 'fa-plus-circle', type: BadgeType.OFFICIAL },
    CREATOR_MASTER: { id: 'ach_creator_5', name: 'Master Curator', description: 'Created 5 lists. You have an eye for quality.', icon: 'fa-layer-group', type: BadgeType.OFFICIAL },
    
    // MOVIES ADDED (Library Builder)
    LIB_BUILDER_10: { id: 'ach_lib_10', name: 'Library Builder', description: 'Added 10 movies to your lists.', icon: 'fa-film', type: BadgeType.OFFICIAL },
    
    // SOCIAL (Likes Given)
    SOCIAL_FAN: { id: 'ach_social_5', name: 'Social Fan', description: 'Reacted to 5 different lists. Spread the love!', icon: 'fa-heart', type: BadgeType.OFFICIAL },
    
    // INFLUENCER (Followers)
    INFLUENCER_10: { id: 'ach_inf_10', name: 'Influencer', description: 'Reached 10 followers. People are watching!', icon: 'fa-star', type: BadgeType.OFFICIAL },
    
    // VETERAN (Time)
    VETERAN_1Y: { id: 'ach_vet_1y', name: 'Veteran', description: 'Member for over 1 year. Thank you for staying.', icon: 'fa-medal', type: BadgeType.OFFICIAL },
};

// Mock Current User (Michael Scott)
export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Michael Scott',
  handle: '@worlds_best_boss',
  email: 'michael.scott@dundermifflin.com',
  password: '123',
  role: UserRole.USER, 
  avatar: 'https://ui-avatars.com/api/?name=Michael+Scott&background=000&color=fff',
  coverImage: 'https://placehold.co/800x400/1e293b/FFFFFF/png?text=Dunder+Mifflin+Scranton',
  bio: 'Regional Manager. Philanthropist. Screenwriter. Improv Student. I love inside jokes. I\'d love to be a part of one someday.',
  country: 'USA',
  privacy: PrivacyLevel.PUBLIC,
  followers: 420, 
  following: 5,
  followingIds: ['u2', 'u3', 'u4'],
  followedListIds: ['l1'], 
  joinedAt: Date.now() - (1000 * 60 * 60 * 24 * 365 * 10), // 10 years ago
  badges: [
    {
      id: 'b1',
      name: 'World\'s Best Boss',
      description: 'Bought the mug himself.',
      icon: 'fa-mug-hot',
      type: BadgeType.OFFICIAL,
      earnedDate: '2005-03-24',
    }
  ],
  watchedMovieIds: ['m1', 'm2', 'm3'], 
  watchingMovieIds: [],
  watchProgress: {},
  notificationSettings: {
    likes: true,
    comments: true,
    follows: true,
    mentions: true
  }
};

// Admin User (Dwight Schrute)
export const ADMIN_USER: User = {
    id: 'admin1',
    name: 'Dwight Schrute',
    handle: '@beet_king',
    email: 'dwight@badgepatch.com',
    password: 'admin',
    role: UserRole.ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=Dwight+Schrute&background=d97706&color=fff',
    bio: 'Assistant Regional Manager. Owner of Schrute Farms. Black belt in Goju-Ryu Karate. I am faster than 80% of all snakes.',
    country: 'Schrute Farms',
    privacy: PrivacyLevel.PUBLIC,
    followers: 9999,
    following: 0,
    followingIds: [],
    followedListIds: [],
    joinedAt: Date.now() - (1000 * 60 * 60 * 24 * 400),
    badges: [],
    watchedMovieIds: [],
    watchingMovieIds: [],
    watchProgress: {},
    notificationSettings: {
        likes: true,
        comments: true,
        follows: true,
        mentions: true
    }
};

// Additional Mock Users
export const ADDITIONAL_USERS: User[] = [
    {
        id: 'u2',
        name: 'Jim Halpert',
        handle: '@big_tuna',
        email: 'jim@dundermifflin.com',
        password: '123',
        role: UserRole.USER,
        avatar: 'https://ui-avatars.com/api/?name=Jim+Halpert&background=3b82f6&color=fff',
        bio: 'Paper salesman. I like pranks and receptionists.',
        country: 'USA',
        privacy: PrivacyLevel.PUBLIC,
        followers: 105,
        following: 2,
        followingIds: ['u1', 'u3'],
        followedListIds: [],
        joinedAt: Date.now() - (1000 * 60 * 60 * 24 * 60),
        badges: [],
        watchedMovieIds: [],
        watchingMovieIds: [],
        watchProgress: {},
        notificationSettings: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true
        }
    },
    {
        id: 'u3',
        name: 'Pam Beesly',
        handle: '@pamcasso',
        email: 'pam@dundermifflin.com',
        password: '123',
        role: UserRole.USER,
        avatar: 'https://ui-avatars.com/api/?name=Pam+Beesly&background=ec4899&color=fff',
        bio: 'Receptionist turned Sales turned Office Administrator. Artist.',
        country: 'USA',
        privacy: PrivacyLevel.PUBLIC,
        followers: 200,
        following: 10,
        followingIds: ['u2'],
        followedListIds: [],
        joinedAt: Date.now(),
        badges: [],
        watchedMovieIds: [],
        watchingMovieIds: [],
        watchProgress: {},
        notificationSettings: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true
        }
    },
    {
        id: 'u4',
        name: 'Ryan Howard',
        handle: '@wunderkind',
        email: 'ryan@dundermifflin.com',
        password: '123',
        role: UserRole.USER,
        avatar: 'https://ui-avatars.com/api/?name=Ryan+Howard&background=6366f1&color=fff',
        bio: 'MBA. Started the fire. Former VP. Bowling alley employee.',
        country: 'USA',
        privacy: PrivacyLevel.PUBLIC,
        followers: 1000,
        following: 0,
        followingIds: [],
        followedListIds: [],
        joinedAt: Date.now(),
        badges: [],
        watchedMovieIds: [],
        watchingMovieIds: [],
        watchProgress: {},
        notificationSettings: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true
        }
    },
    {
        id: 'u5',
        name: 'Kelly Kapoor',
        handle: '@business_bitch',
        email: 'kelly@dundermifflin.com',
        password: '123',
        role: UserRole.USER,
        avatar: 'https://ui-avatars.com/api/?name=Kelly+Kapoor&background=f472b6&color=fff',
        bio: 'Customer Service. I have a lot of questions. Number one: how dare you?',
        country: 'USA',
        privacy: PrivacyLevel.PUBLIC,
        followers: 5000,
        following: 100,
        followingIds: ['u4'],
        followedListIds: [],
        joinedAt: Date.now(),
        badges: [],
        watchedMovieIds: [],
        watchingMovieIds: [],
        watchProgress: {},
        notificationSettings: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true
        }
    },
    {
        id: 'u6',
        name: 'Stanley Hudson',
        handle: '@pretzel_day',
        email: 'stanley@dundermifflin.com',
        password: '123',
        role: UserRole.USER,
        avatar: 'https://ui-avatars.com/api/?name=Stanley+Hudson&background=374151&color=fff',
        bio: 'Did I stutter? I want my pretzel.',
        country: 'USA',
        privacy: PrivacyLevel.PUBLIC,
        followers: 2,
        following: 0,
        followingIds: [],
        followedListIds: [],
        joinedAt: Date.now(),
        badges: [],
        watchedMovieIds: [],
        watchingMovieIds: [],
        watchProgress: {},
        notificationSettings: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true
        }
    },
    {
        id: 'u7',
        name: 'Creed Bratton',
        handle: '@creed_thoughts',
        email: 'creed@dundermifflin.com',
        password: '123',
        role: UserRole.USER,
        avatar: 'https://ui-avatars.com/api/?name=Creed+Bratton&background=1f2937&color=fff',
        bio: 'www.creedthoughts.gov.www/creedthoughts',
        country: 'Unknown',
        privacy: PrivacyLevel.PUBLIC,
        followers: 666,
        following: 0,
        followingIds: [],
        followedListIds: [],
        joinedAt: Date.now(),
        badges: [],
        watchedMovieIds: [],
        watchingMovieIds: [],
        watchProgress: {},
        notificationSettings: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true
        }
    },
    {
        id: 'u8',
        name: 'Kevin Malone',
        handle: '@cookie_monster',
        email: 'kevin@dundermifflin.com',
        password: '123',
        role: UserRole.USER,
        avatar: 'https://ui-avatars.com/api/?name=Kevin+Malone&background=10b981&color=fff',
        bio: 'Accountant. Drummer for Scrantonicity. Winner of the 2002 $2,500 No-Limit Deuce-to-Seven Draw Tournament.',
        country: 'USA',
        privacy: PrivacyLevel.PUBLIC,
        followers: 69,
        following: 3,
        followingIds: [],
        followedListIds: [],
        joinedAt: Date.now(),
        badges: [],
        watchedMovieIds: [],
        watchingMovieIds: [],
        watchProgress: {},
        notificationSettings: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true
        }
    },
    {
        id: 'u9',
        name: 'Angela Martin',
        handle: '@sprinkles_mom',
        email: 'angela@dundermifflin.com',
        password: '123',
        role: UserRole.USER,
        avatar: 'https://ui-avatars.com/api/?name=Angela+Martin&background=fcd34d&color=000',
        bio: 'Head of Accounting. I don\'t like being judged by someone who wears open-toed shoes.',
        country: 'USA',
        privacy: PrivacyLevel.PUBLIC,
        followers: 12,
        following: 0,
        followingIds: ['admin1'],
        followedListIds: [],
        joinedAt: Date.now(),
        badges: [],
        watchedMovieIds: [],
        watchingMovieIds: [],
        watchProgress: {},
        notificationSettings: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true
        }
    }
];

// Mock Movies (References from the show)
export const MOCK_MOVIES: Movie[] = [
  { id: 'm1', title: 'Threat Level Midnight', year: 2011, duration: '120 min', rating: 10.0, poster: 'https://placehold.co/300x450/000000/FFFFFF/png?text=Threat+Level+Midnight', synopsis: 'After secret agent Michael Scarn is forced into retirement, he is brought back to prevent Goldenface from blowing up the NHL All-Star Game.', availableOn: ['YouTube'] },
  { id: 'm2', title: 'Die Hard', year: 1988, duration: '132 min', rating: 8.2, poster: 'https://placehold.co/300x450/7f1d1d/FFFFFF/png?text=Die+Hard', synopsis: 'An NYPD officer tries to save his wife and several others taken hostage by German terrorists during a Christmas party.', availableOn: ['HBO Max'] },
  { id: 'm3', title: 'The Devil Wears Prada', year: 2006, duration: '109 min', rating: 6.9, poster: 'https://placehold.co/300x450/be185d/FFFFFF/png?text=Devil+Wears+Prada', synopsis: 'A smart but sensible new graduate lands a job as an assistant to Miranda Priestly, the demanding editor-in-chief of a high fashion magazine.', availableOn: ['Disney+', 'Hulu'] },
  { id: 'm4', title: 'Million Dollar Baby', year: 2004, duration: '132 min', rating: 8.1, poster: 'https://placehold.co/300x450/1e293b/FFFFFF/png?text=Million+Dollar+Baby', synopsis: 'A determined woman works with a hardened boxing trainer to become a professional. (Michael Scott thinks Hilary Swank is hot).', availableOn: ['Netflix'] },
  { id: 'm5', title: 'Varsity Blues', year: 1999, duration: '106 min', rating: 6.5, poster: 'https://placehold.co/300x450/1d4ed8/FFFFFF/png?text=Varsity+Blues', synopsis: 'A backup quarterback is chosen to lead a Texas football team to victory. (Featured in Movie Monday).', availableOn: ['Prime Video'] },
  { id: 'm6', title: 'Weekend at Bernie\'s', year: 1989, duration: '97 min', rating: 6.4, poster: 'https://placehold.co/300x450/f59e0b/FFFFFF/png?text=Weekend+at+Bernies', synopsis: 'Two losers try to pretend that their murdered employer is really alive.', availableOn: ['HBO Max'] },
];

// Mock Lists
export const MOCK_LISTS: MediaList[] = [
  {
    id: 'l1',
    creatorId: 'u1', // Michael
    creatorName: 'Michael Scott',
    creatorAvatar: 'https://ui-avatars.com/api/?name=Michael+Scott&background=000&color=fff',
    title: 'Michael\'s Screenplays',
    description: 'The greatest stories ever told. Better than Shakespeare.',
    category: ListCategory.ART_DIRECTOR,
    privacy: PrivacyLevel.PUBLIC,
    badgeReward: {
      id: 'b_scarn',
      name: 'Agent Scarn',
      description: 'Completed Michael\'s masterpiece.',
      icon: 'fa-gun', 
      type: BadgeType.COMMUNITY,
      earnedDate: '',
    },
    items: [
      { movie: MOCK_MOVIES[0], status: WatchStatus.WATCHED, progressMinutes: 120 },
      { movie: MOCK_MOVIES[1], status: WatchStatus.WATCHING, progressMinutes: 45 },
    ],
    reactions: [
      { id: 'r1', userId: 'admin1', emoji: '🔥', timestamp: Date.now() },
      { id: 'r2', userId: 'u2', emoji: '😂', timestamp: Date.now() - 100000 },
    ],
    comments: []
  },
  {
    id: 'l2',
    creatorId: 'admin1', // Dwight
    creatorName: 'Dwight Schrute',
    creatorAvatar: 'https://ui-avatars.com/api/?name=Dwight+Schrute&background=d97706&color=fff',
    title: 'Schrute Approved Films',
    description: 'Movies that teach survival, authority, and bear safety.',
    category: ListCategory.GENERAL,
    privacy: PrivacyLevel.PUBLIC,
    badgeReward: {
        id: 'b_beets',
        name: 'Beet Master',
        description: 'You have learned the way of the Schrute.',
        icon: 'fa-leaf',
        type: BadgeType.COMMUNITY,
        earnedDate: '',
    },
    items: [
      { movie: MOCK_MOVIES[5], status: WatchStatus.WATCHED, progressMinutes: 97 }, // Weekend at Bernies (He would analyze the corpse preservation)
    ],
    reactions: [
        { id: 'r3', userId: 'u9', emoji: '❤️', timestamp: Date.now() }, // Angela
    ],
    comments: []
  },
  {
    id: 'l3',
    creatorId: 'u5', // Kelly
    creatorName: 'Kelly Kapoor',
    creatorAvatar: 'https://ui-avatars.com/api/?name=Kelly+Kapoor&background=f472b6&color=fff',
    title: 'Movies Ryan Hates',
    description: 'We are going to watch these and he is going to like it.',
    category: ListCategory.GENRE,
    privacy: PrivacyLevel.FOLLOWERS,
    items: [
      { movie: MOCK_MOVIES[2], status: WatchStatus.WATCHED, progressMinutes: 109 },
    ],
    reactions: [
        { id: 'r4', userId: 'u3', emoji: '👏', timestamp: Date.now() }, // Pam
    ],
    comments: []
  }
];

// Restricting emojis to the most commonly used ones for simplicity and UX
export const AVAILABLE_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '😮'];