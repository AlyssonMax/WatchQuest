
export enum MediaType {
  MOVIE = 'Movie',
  SERIES = 'Series',
  ANIME = 'Anime',
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

export interface Movie {
  id: string;
  title: string;
  year: number;
  duration: string;
  rating: number;
  poster: string;
  synopsis: string;
  availableOn: string[];
  // Added type and totalEpisodes for consistency with db.ts and ListViewScreen
  type: MediaType;
  totalEpisodes?: number;
}

// Added Media alias as used in db.ts
export type Media = Movie;

export interface ListItem {
  // Renamed from movie to media to align with db.ts and ListViewScreen
  media: Media;
  status: WatchStatus;
  progressMinutes?: number;
  // Added currentEpisode for episodic content
  currentEpisode?: number;
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

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  targetUserId: string;
  actionType: 'RESET_PASSWORD' | 'ISSUE_WARNING' | 'BAN_USER';
  metadata: any;
  timestamp: number;
}

export interface BannedEmail {
  email: string;
  bannedAt: number;
  reason: string;
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
}

export enum ReportReason {
  INAPPROPRIATE_CONTENT = 'Inappropriate Image/Content',
  INCORRECT_INFO = 'Incorrect Movie Information',
  SPAM = 'Spam',
  OTHER = 'Other'
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: 'list' | 'user';
  reason: ReportReason;
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
