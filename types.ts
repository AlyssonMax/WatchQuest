
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
  OFFICIAL = 'official', // System achievements & Admin badges
  COMMUNITY = 'community', // "Patches" created by users for their specific lists
}

export enum ListCategory {
  GENERAL = 'General',
  GENRE = 'Genre',
  ACTOR = 'Actor',
  ACTRESS = 'Actress',
  DIRECTOR = 'Director',
  WRITER = 'Writer',
  COMPOSER = 'Composer',
  ART_DIRECTOR = 'Art Director',
  CINEMATOGRAPHER = 'Cinematographer',
  PRODUCER = 'Producer',
  EDITOR = 'Editor',
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
  targetId: string; // List ID or User ID being reported
  targetType: 'list' | 'user';
  reason: ReportReason;
  details: string;
  timestamp: number;
  status: 'pending' | 'resolved';
}

export interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
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
  followingIds: string[]; // List of IDs this user follows
  followedListIds: string[]; // List of List IDs this user has saved/followed
  joinedAt: number; // Timestamp for Veteran badges
  badges: Badge[];
  watchedMovieIds: string[]; // Global history of completed movies
  watchingMovieIds: string[]; // Global history of in-progress movies
  watchProgress: Record<string, number>; // Map of MovieID -> Minutes watched
  notificationSettings: NotificationSettings; // User preferences
}

export interface Badge {
  id: string;
  name: string;
  icon: string; // FontAwesome class OR Base64 Image URL
  type: BadgeType;
  description: string;
  earnedDate: string;
  relatedListId?: string;
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  duration: string;
  poster: string;
  rating: number;
  synopsis: string;
  availableOn?: string[];
}

export interface ListItem {
  movie: Movie;
  status: WatchStatus;
  progressMinutes: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
  replies: Comment[]; // Nested replies
}

export interface MediaList {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  title: string;
  description: string;
  category: ListCategory;
  items: ListItem[];
  badgeReward?: Badge;
  privacy: PrivacyLevel;
  reactions: Reaction[];
  comments: Comment[];
}

export interface Reaction {
  id: string;
  userId: string;
  emoji: string;
  timestamp: number;
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention';

export interface Notification {
  id: string;
  userId: string; // Recipient
  type: NotificationType;
  actorId: string; // Who triggered it
  actorName: string;
  actorAvatar: string;
  targetId?: string; // List ID or Profile ID
  targetPreview?: string; // List Title or Comment text snippet
  isRead: boolean;
  timestamp: number;
}

export interface ActivityItem {
    id: string;
    type: 'list_created' | 'badge_earned';
    user: User;
    timestamp: number;
    data: any; // MediaList or Badge
}
