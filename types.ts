
export enum MediaType {
  MOVIE = 'Movie',
  SERIES = 'Series',
  ANIME = 'Anime',
  CARTOON = 'Cartoon',
}

export enum PrivacyLevel {
  PUBLIC = 'Public',
  FOLLOWERS = 'Followers Only',
  PRIVATE = 'Private',
}

export enum WatchStatus {
  UNWATCHED = 'Unwatched',
  WATCHING = 'Watching',
  WATCHED = 'Watched',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum BadgeType {
  OFFICIAL = 'official',
  COMMUNITY = 'community',
}

export enum ListCategory {
  GENERAL = 'General',
  GENRE = 'Genre Based',
  ART_DIRECTOR = 'Art Director Focus',
  ACTOR_FOCUS = 'Actor Focus',
  CHALLENGE = 'Challenge',
}

export enum ReportReason {
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  INCORRECT_INFO = 'INCORRECT_INFO',
  SPAM = 'SPAM',
  OTHER = 'OTHER',
}

export interface Episode {
  episodeNumber: number;
  watched: boolean;
  rating?: number;
}

export interface Season {
  seasonNumber: number;
  episodesCount: number; 
  episodes?: Episode[]; 
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  duration: string;
  rating: number;
  poster: string;
  synopsis: string;
  availableOn: string[];
  type: MediaType;
  totalSeasons?: number;
  seasonsData?: Season[];
}

export type Media = Movie;

export interface ListItem {
  media: Media;
  status: WatchStatus;
  progressMinutes?: number;
  currentSeason?: number;
  currentEpisode?: number;
  watchedHistory?: string[];
}

export interface Reaction {
  id: string;
  userId: string;
  emoji: string;
  timestamp: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
  replies?: Comment[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: BadgeType;
  earnedDate?: string;
  relatedListId?: string;
}

export interface MediaList {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  title: string;
  description: string;
  category: ListCategory;
  privacy: PrivacyLevel;
  items: ListItem[];
  reactions: Reaction[];
  comments: Comment[];
  badgeReward?: Badge;
}

export interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
}

export interface Strike {
  id: string;
  reason: string;
  timestamp: number;
  expiresAt: number;
  issuedByAdminId: string;
}

export interface User {
  id: string;
  name: string;
  handle: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar: string;
  coverImage?: string;
  bio: string;
  country: string;
  privacy: PrivacyLevel;
  followers: number;
  following: number;
  followingIds: string[];
  followedListIds: string[];
  joinedAt: number;
  badges: Badge[];
  watchedMovieIds: string[];
  watchingMovieIds: string[];
  watchProgress: Record<string, number>;
  notificationSettings: NotificationSettings;
  strikes: Strike[];
  isPermanentlyBanned: boolean;
  banReason?: string;
  hiddenPatchIds?: string[];
  hiddenBadgeIds?: string[];
}

export interface AdminLog {
  id: string;
  actionType: string;
  adminName: string;
  targetUserId: string;
  timestamp: number;
}

export interface BannedEmail {
  email: string;
  bannedAt: number;
  reason: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: 'list' | 'user';
  reason: ReportReason | string;
  details: string;
  timestamp: number;
  status: 'pending' | 'resolved';
  adminResponse?: string;
  respondedAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'admin_response' | 'strike_alert';
  actorId: string;
  actorName: string;
  actorAvatar: string;
  targetId?: string;
  targetPreview?: string;
  isRead: boolean;
  timestamp: number;
}

export interface ActivityItem {
  id: string;
  type: 'list_created' | 'badge_earned';
  user: User;
  timestamp: number;
  data: any;
}
