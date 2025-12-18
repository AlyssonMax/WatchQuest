import { MediaList, User, Reaction, ListItem, WatchStatus, PrivacyLevel, UserRole, BadgeType, ListCategory, Movie, Report, ReportReason, Comment, Notification, NotificationType, NotificationSettings, ActivityItem } from '../types';
import { CURRENT_USER, MOCK_LISTS, ADMIN_USER, MOCK_MOVIES, SYSTEM_BADGES, ADDITIONAL_USERS } from './mockData';
import { omdbService } from './omdb';

const DB_KEY = 'badge_patch_db_v8'; // Bumped version for notifications
const SESSION_KEY = 'badge_patch_session_user_id';

interface Schema {
  users: User[];
  lists: MediaList[];
  reports: Report[];
  notifications: Notification[];
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class LocalDatabase {
  private data: Schema;
  private currentUserId: string | null = null;

  constructor() {
    const stored = localStorage.getItem(DB_KEY);
    this.currentUserId = localStorage.getItem(SESSION_KEY);

    if (stored) {
      this.data = JSON.parse(stored);
      // Migration to v8 (Notifications & Settings)
      this.data.users.forEach(u => {
          if (!u.notificationSettings) {
              u.notificationSettings = { likes: true, comments: true, follows: true, mentions: true };
          }
          // Other legacy migrations
          if (!u.watchingMovieIds) u.watchingMovieIds = [];
          if (!u.joinedAt) u.joinedAt = Date.now();
          if (!u.followingIds) u.followingIds = [];
          if (!u.followedListIds) u.followedListIds = []; 
          if (!u.watchProgress) u.watchProgress = {}; 
      });
      this.data.lists.forEach(l => {
          if (!l.comments) l.comments = [];
          // Ensure comments have replies array
          const recursiveMigrate = (comments: Comment[]) => {
              comments.forEach(c => {
                  if (!c.replies) c.replies = [];
                  recursiveMigrate(c.replies);
              });
          };
          recursiveMigrate(l.comments);
      });
      if (!this.data.reports) this.data.reports = [];
      if (!this.data.notifications) this.data.notifications = [];
    } else {
      // Seed initial data
      const defaultSettings: NotificationSettings = { likes: true, comments: true, follows: true, mentions: true };
      
      this.data = {
        users: [
            { ...CURRENT_USER, followingIds: [], followedListIds: [], watchProgress: {}, notificationSettings: defaultSettings }, 
            { ...ADMIN_USER, followingIds: [], followedListIds: [], watchProgress: {}, notificationSettings: defaultSettings },
            ...ADDITIONAL_USERS.map(u => ({...u, watchProgress: {}, followedListIds: [], followingIds: u.followingIds || [], notificationSettings: defaultSettings }))
        ], 
        lists: MOCK_LISTS.map(l => ({ ...l, comments: [] })),
        reports: [],
        notifications: []
      };
      this.save();
    }
  }

  private save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
  }

  // --- NOTIFICATION SYSTEM (INTERNAL) ---
  
  private async createNotification(
      recipientId: string, 
      type: NotificationType, 
      actor: User, 
      targetId?: string, 
      targetPreview?: string
  ) {
      if (recipientId === actor.id) return; // Don't notify self
      
      const recipient = this.data.users.find(u => u.id === recipientId);
      if (!recipient) return;

      // Check User Settings
      if (!recipient.notificationSettings[type === 'mention' ? 'mentions' : type === 'like' ? 'likes' : type === 'follow' ? 'follows' : 'comments']) {
          return;
      }

      const notification: Notification = {
          id: `n_${Date.now()}_${Math.random()}`,
          userId: recipientId,
          type,
          actorId: actor.id,
          actorName: actor.name,
          actorAvatar: actor.avatar,
          targetId,
          targetPreview,
          isRead: false,
          timestamp: Date.now()
      };

      this.data.notifications.push(notification);
      this.save();
  }

  async getNotifications(): Promise<Notification[]> {
      await delay(200);
      if (!this.currentUserId) return [];
      return this.data.notifications
          .filter(n => n.userId === this.currentUserId)
          .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getUnreadNotificationCount(): Promise<number> {
      if (!this.currentUserId) return 0;
      return this.data.notifications.filter(n => n.userId === this.currentUserId && !n.isRead).length;
  }

  async markAllNotificationsRead(): Promise<void> {
      if (!this.currentUserId) return;
      this.data.notifications.forEach(n => {
          if (n.userId === this.currentUserId) n.isRead = true;
      });
      this.save();
  }

  // --- SOCIAL: FOLLOW SYSTEM ---
  
  async followUser(targetUserId: string): Promise<void> {
      await delay(300);
      if (!this.currentUserId) throw new Error("Must be logged in");
      if (this.currentUserId === targetUserId) throw new Error("Cannot follow yourself");

      const currentUserIdx = this.data.users.findIndex(u => u.id === this.currentUserId);
      const targetUserIdx = this.data.users.findIndex(u => u.id === targetUserId);

      if (currentUserIdx === -1 || targetUserIdx === -1) throw new Error("User not found");

      const currentUser = this.data.users[currentUserIdx];
      const targetUser = this.data.users[targetUserIdx];

      // Check if already following
      if (!currentUser.followingIds.includes(targetUserId)) {
          currentUser.followingIds.push(targetUserId);
          currentUser.following += 1;
          targetUser.followers += 1;

          this.data.users[currentUserIdx] = currentUser;
          this.data.users[targetUserIdx] = targetUser;
          
          // NOTIFICATION
          this.createNotification(targetUserId, 'follow', currentUser);

          this.save();
          await this.checkAchievements(targetUserId);
      }
  }

  async unfollowUser(targetUserId: string): Promise<void> {
      // ... (implementation same as before)
       await delay(300);
      if (!this.currentUserId) throw new Error("Must be logged in");

      const currentUserIdx = this.data.users.findIndex(u => u.id === this.currentUserId);
      const targetUserIdx = this.data.users.findIndex(u => u.id === targetUserId);

      if (currentUserIdx === -1 || targetUserIdx === -1) throw new Error("User not found");

      const currentUser = this.data.users[currentUserIdx];
      const targetUser = this.data.users[targetUserIdx];

      if (currentUser.followingIds.includes(targetUserId)) {
          currentUser.followingIds = currentUser.followingIds.filter(id => id !== targetUserId);
          currentUser.following = Math.max(0, currentUser.following - 1);
          targetUser.followers = Math.max(0, targetUser.followers - 1);

          this.data.users[currentUserIdx] = currentUser;
          this.data.users[targetUserIdx] = targetUser;
          
          this.save();
      }
  }

  // ... (getFollowers, getFollowing, followList, unfollowList, getFollowedLists same as before) ...
  async getFollowers(userId: string): Promise<User[]> {
      await delay(200);
      return this.data.users.filter(u => u.followingIds.includes(userId));
  }
  async getFollowing(userId: string): Promise<User[]> {
      await delay(200);
      const user = this.data.users.find(u => u.id === userId);
      if (!user) return [];
      return this.data.users.filter(u => user.followingIds.includes(u.id));
  }
  async followList(listId: string): Promise<void> {
      await delay(300);
      if (!this.currentUserId) throw new Error("Must be logged in");
      const userIdx = this.data.users.findIndex(u => u.id === this.currentUserId);
      if (userIdx === -1) throw new Error("User not found");
      const user = this.data.users[userIdx];
      if (!this.data.lists.find(l => l.id === listId)) throw new Error("List not found");
      if (!user.followedListIds.includes(listId)) {
          user.followedListIds.push(listId);
          this.data.users[userIdx] = user;
          this.save();
      }
  }
  async unfollowList(listId: string): Promise<void> {
      await delay(300);
      if (!this.currentUserId) throw new Error("Must be logged in");
      const userIdx = this.data.users.findIndex(u => u.id === this.currentUserId);
      if (userIdx === -1) throw new Error("User not found");
      const user = this.data.users[userIdx];
      if (user.followedListIds.includes(listId)) {
          user.followedListIds = user.followedListIds.filter(id => id !== listId);
          this.data.users[userIdx] = user;
          this.save();
      }
  }
  async getFollowedLists(): Promise<MediaList[]> {
      await delay(300);
      if (!this.currentUserId) return [];
      const user = await this.getCurrentUser();
      if (!user) return [];
      const rawLists = this.data.lists.filter(l => user.followedListIds.includes(l.id));
      return rawLists.map(list => {
          const listCopy = JSON.parse(JSON.stringify(list));
          if (!listCopy.comments) listCopy.comments = [];
          listCopy.items.forEach((item: ListItem) => {
              if (user.watchedMovieIds.includes(item.movie.id)) {
                  item.status = WatchStatus.WATCHED;
              } else if (user.watchingMovieIds?.includes(item.movie.id)) {
                  item.status = WatchStatus.WATCHING;
                  if (user.watchProgress && user.watchProgress[item.movie.id] !== undefined) {
                      item.progressMinutes = user.watchProgress[item.movie.id];
                  }
              }
          });
          return listCopy;
      });
  }

  // ... (getListStats, getListFollowers same as before) ...
    async getListStats(listId: string) {
      await delay(200);
      const list = this.data.lists.find(l => l.id === listId);
      if (!list) return { followers: 0, completers: 0 };
      const followers = this.data.users.filter(u => u.followedListIds.includes(listId));
      let completersCount = 0;
      followers.forEach(u => {
          const progress = this.calculateListProgress(list, u);
          if (progress === 100) completersCount++;
      });
      const creator = this.data.users.find(u => u.id === list.creatorId);
      if (creator) {
          if(this.calculateListProgress(list, creator) === 100) {
              if (!creator.followedListIds.includes(listId)) completersCount++;
          }
      }
      return { followers: followers.length, completers: completersCount };
  }
  async getListFollowers(listId: string): Promise<Array<{ user: User, progress: number }>> {
      await delay(300);
      const list = this.data.lists.find(l => l.id === listId);
      if (!list) return [];
      const followers = this.data.users.filter(u => u.followedListIds.includes(listId));
      return followers.map(u => ({ user: u, progress: this.calculateListProgress(list, u) }));
  }

  // --- SETTINGS ---
  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
      await delay(300);
      if (!this.currentUserId) throw new Error("Must be logged in");
      const idx = this.data.users.findIndex(u => u.id === this.currentUserId);
      if (idx === -1) return;
      this.data.users[idx].notificationSettings = settings;
      this.save();
  }

  // --- ACTIVITY FEED ---
  async getActivityFeed(): Promise<ActivityItem[]> {
      await delay(400);
      if (!this.currentUserId) return [];
      
      const currentUser = this.data.users.find(u => u.id === this.currentUserId);
      if (!currentUser) return [];

      const followingIds = currentUser.followingIds;
      if (followingIds.length === 0) return [];

      const feed: ActivityItem[] = [];

      // 1. Get Lists created by following users
      const followedUsersLists = this.data.lists.filter(l => followingIds.includes(l.creatorId) && l.privacy === PrivacyLevel.PUBLIC);
      
      followedUsersLists.forEach(list => {
          // Extract timestamp from ID if possible (l_timestamp) or use arbitrary recent date for mock lists
          let ts = 0;
          if (list.id.startsWith('l_')) {
              const parts = list.id.split('_');
              if (parts.length > 1 && !isNaN(parseInt(parts[1]))) {
                  ts = parseInt(parts[1]);
              }
          }
          if (ts === 0) {
              // Fallback for mock data (l1, l2) - randomize slightly in the past
              ts = Date.now() - Math.floor(Math.random() * 1000000000); 
          }

          const user = this.data.users.find(u => u.id === list.creatorId);
          if (user) {
              feed.push({
                  id: `act_list_${list.id}`,
                  type: 'list_created',
                  user: user,
                  timestamp: ts,
                  data: list
              });
          }
      });

      // 2. Get Badges earned by following users
      const followedUsers = this.data.users.filter(u => followingIds.includes(u.id));
      
      followedUsers.forEach(user => {
          user.badges.forEach(badge => {
              let ts = Date.parse(badge.earnedDate);
              if (isNaN(ts)) {
                  // Fallback if date string is weird
                  ts = Date.now() - Math.floor(Math.random() * 1000000000); 
              }
              
              feed.push({
                  id: `act_badge_${user.id}_${badge.id}`,
                  type: 'badge_earned',
                  user: user,
                  timestamp: ts,
                  data: badge
              });
          });
      });

      // Sort by newest first
      return feed.sort((a, b) => b.timestamp - a.timestamp);
  }

  // --- COMMENTS & MENTIONS ---

  async addComment(listId: string, text: string, parentCommentId?: string): Promise<MediaList> {
      await delay(300);
      const user = await this.getCurrentUser();
      if (!user) throw new Error("Must be logged in");
      
      const listIdx = this.data.lists.findIndex(l => l.id === listId);
      if (listIdx === -1) throw new Error("List not found");
      const list = this.data.lists[listIdx];
      
      const newComment: Comment = {
          id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          text: text,
          timestamp: Date.now(),
          replies: []
      };

      // Handle Nested Replies
      if (parentCommentId) {
          const findAndReply = (comments: Comment[]): boolean => {
              for (const comment of comments) {
                  if (comment.id === parentCommentId) {
                      if (!comment.replies) comment.replies = [];
                      comment.replies.push(newComment);
                      
                      // Notify Parent Comment Author
                      this.createNotification(comment.userId, 'comment', user, list.id, `Replied: ${text.substring(0, 20)}...`);
                      return true;
                  }
                  if (comment.replies && comment.replies.length > 0) {
                      if (findAndReply(comment.replies)) return true;
                  }
              }
              return false;
          };
          findAndReply(list.comments);
      } else {
          // Top level comment
          list.comments.push(newComment);
          // Notify List Creator
          this.createNotification(list.creatorId, 'comment', user, list.id, `Commented: ${text.substring(0, 20)}...`);
      }

      // Handle Mentions (@handle)
      const mentionRegex = /@(\w+)/g;
      const matches = text.match(mentionRegex);
      if (matches) {
          matches.forEach(match => {
              const handle = match.substring(1).toLowerCase(); // remove @
              const mentionedUser = this.data.users.find(u => u.handle.replace('@', '').toLowerCase() === handle);
              if (mentionedUser) {
                  this.createNotification(mentionedUser.id, 'mention', user, list.id, `Mentioned you: ${text.substring(0, 20)}...`);
              }
          });
      }
      
      this.data.lists[listIdx] = list;
      this.save();
      return list; // Return entire list to update state easily
  }
  
  async deleteComment(listId: string, commentId: string): Promise<MediaList> {
      await delay(200);
      const user = await this.getCurrentUser();
      if (!user) throw new Error("Unauthorized");
      
      const listIdx = this.data.lists.findIndex(l => l.id === listId);
      if (listIdx === -1) throw new Error("List not found");
      const list = this.data.lists[listIdx];

      const recursiveDelete = (comments: Comment[]): Comment[] => {
          return comments.filter(c => {
              if (c.id === commentId) {
                  // Check perms
                  const canDelete = c.userId === user.id || list.creatorId === user.id || user.role === UserRole.ADMIN;
                  if (!canDelete) throw new Error("Permission denied");
                  return false; // Remove
              }
              if (c.replies) {
                  c.replies = recursiveDelete(c.replies);
              }
              return true;
          });
      };

      try {
          list.comments = recursiveDelete(list.comments);
      } catch (e) {
          throw e; // Propagate permission error
      }
      
      this.data.lists[listIdx] = list;
      this.save();
      return list;
  }

  async toggleReaction(listId: string, emoji: string): Promise<Reaction[]> {
    await delay(200);
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Must be logged in");

    const listIndex = this.data.lists.findIndex(l => l.id === listId);
    if (listIndex === -1) throw new Error("List not found");

    const list = this.data.lists[listIndex];
    const existingIdx = list.reactions.findIndex(r => r.userId === user.id && r.emoji === emoji);

    if (existingIdx > -1) {
      list.reactions.splice(existingIdx, 1);
    } else {
      list.reactions.push({
        id: `r_${Date.now()}`,
        userId: user.id,
        emoji,
        timestamp: Date.now()
      });
      // Notify List Creator (only on add)
      this.createNotification(list.creatorId, 'like', user, list.id, `Reacted ${emoji} to ${list.title}`);
    }

    this.data.lists[listIndex] = list;
    await this.checkAchievements(user.id);
    this.save();
    return list.reactions;
  }

  // ... (Rest of existing methods like searchUsers, searchLists, admin methods, achievements, auth, etc.) ...
  async searchUsers(query: string): Promise<User[]> {
      await delay(300);
      if (!query) return [];
      const lowerQ = query.toLowerCase();
      return this.data.users.filter(u => 
          u.name.toLowerCase().includes(lowerQ) || 
          u.handle.toLowerCase().includes(lowerQ)
      );
  }

  async searchLists(query: string): Promise<MediaList[]> {
      await delay(300);
      if (!query) return [];
      const lowerQ = query.toLowerCase();
      return this.data.lists.filter(l => 
          l.privacy === PrivacyLevel.PUBLIC && (
              l.title.toLowerCase().includes(lowerQ) ||
              l.description.toLowerCase().includes(lowerQ) ||
              l.category.toLowerCase().includes(lowerQ)
          )
      );
  }
  
  async getAllUsers(): Promise<User[]> {
      await delay(300);
      const user = await this.getCurrentUser();
      if (!user || user.role !== UserRole.ADMIN) throw new Error("Unauthorized");
      return [...this.data.users];
  }
  
  async getDashboardStats() {
      await delay(300);
      const user = await this.getCurrentUser();
      if (!user || user.role !== UserRole.ADMIN) throw new Error("Unauthorized");
      const totalUsers = this.data.users.length;
      const totalLists = this.data.lists.length;
      const totalReports = this.data.reports.length;
      const totalReactions = this.data.lists.reduce((acc, l) => acc + l.reactions.length, 0);
      const totalComments = this.data.lists.reduce((acc, l) => acc + (l.comments?.length || 0), 0);
      const usersByRole = {
          admin: this.data.users.filter(u => u.role === UserRole.ADMIN).length,
          user: this.data.users.filter(u => u.role === UserRole.USER).length
      };
      return { totalUsers, totalLists, totalReports, totalReactions, totalComments, usersByRole };
  }

  async adminDeleteUser(targetUserId: string): Promise<void> {
      await delay(500);
      const user = await this.getCurrentUser();
      if (!user || user.role !== UserRole.ADMIN) throw new Error("Unauthorized");
      if (user.id === targetUserId) throw new Error("Cannot delete yourself");

      // 1. Remove User from main array
      this.data.users = this.data.users.filter(u => u.id !== targetUserId);

      // 2. Remove Lists created by user
      this.data.lists = this.data.lists.filter(l => l.creatorId !== targetUserId);

      // 3. Remove Reports related to user
      this.data.reports = this.data.reports.filter(r => r.targetId !== targetUserId && r.reporterId !== targetUserId);

      // 4. Clean Notifications
      this.data.notifications = this.data.notifications.filter(n => n.userId !== targetUserId && n.actorId !== targetUserId);

      // 5. Clean Followings in other users
      this.data.users.forEach(u => {
          if (u.followingIds.includes(targetUserId)) {
              u.followingIds = u.followingIds.filter(id => id !== targetUserId);
              u.following = Math.max(0, u.following - 1);
          }
      });

      // 6. Clean Reactions and Comments by this user on OTHER lists (Deep Clean)
      this.data.lists.forEach(list => {
          // Remove reactions
          list.reactions = list.reactions.filter(r => r.userId !== targetUserId);
          
          // Remove comments (Recursive)
          const cleanComments = (comments: Comment[]): Comment[] => {
              return comments.filter(c => c.userId !== targetUserId).map(c => ({
                  ...c,
                  replies: cleanComments(c.replies)
              }));
          };
          list.comments = cleanComments(list.comments);
      });

      this.save();
  }

  async adminResetPassword(targetUserId: string): Promise<string> {
      await delay(400);
      const user = await this.getCurrentUser();
      if (!user || user.role !== UserRole.ADMIN) throw new Error("Unauthorized");
      const targetIndex = this.data.users.findIndex(u => u.id === targetUserId);
      if (targetIndex === -1) throw new Error("User not found");
      const tempPassword = Math.random().toString(36).slice(-8); 
      this.data.users[targetIndex].password = tempPassword;
      this.save();
      return tempPassword;
  }

  async adminUpdateRole(targetUserId: string, newRole: UserRole): Promise<void> {
      await delay(300);
      const user = await this.getCurrentUser();
      if (!user || user.role !== UserRole.ADMIN) throw new Error("Unauthorized");
      if (user.id === targetUserId) throw new Error("Cannot change your own role");
      const targetIndex = this.data.users.findIndex(u => u.id === targetUserId);
      if (targetIndex === -1) throw new Error("User not found");
      this.data.users[targetIndex].role = newRole;
      this.save();
  }

  async submitReport(targetId: string, targetType: 'list' | 'user', reason: ReportReason, details: string): Promise<void> {
      await delay(400);
      if (!this.currentUserId) throw new Error("Must be logged in to report");
      const newReport: Report = {
          id: `rep_${Date.now()}`,
          reporterId: this.currentUserId,
          targetId,
          targetType,
          reason,
          details,
          timestamp: Date.now(),
          status: 'pending'
      };
      this.data.reports.push(newReport);
      this.save();
  }

  async getReports(): Promise<Report[]> {
      const user = await this.getCurrentUser();
      if (!user || user.role !== UserRole.ADMIN) return [];
      return [...this.data.reports].reverse();
  }

  async resolveReport(reportId: string): Promise<void> {
      const user = await this.getCurrentUser();
      if (!user || user.role !== UserRole.ADMIN) throw new Error("Unauthorized");
      const idx = this.data.reports.findIndex(r => r.id === reportId);
      if (idx !== -1) {
          this.data.reports[idx].status = 'resolved';
          this.save();
      }
  }

  async getAchievementStats(userId: string) {
      const user = this.data.users.find(u => u.id === userId);
      if (!user) throw new Error("User not found");
      const myLists = this.data.lists.filter(l => l.creatorId === userId);
      const totalMoviesAdded = myLists.reduce((acc, list) => acc + list.items.length, 0);
      let likesGiven = 0;
      this.data.lists.forEach(list => {
          if (list.reactions.some(r => r.userId === userId)) {
              likesGiven++;
          }
      });
      const daysJoined = Math.floor((Date.now() - user.joinedAt) / (1000 * 60 * 60 * 24));
      return {
          listsCreated: myLists.length,
          moviesAdded: totalMoviesAdded,
          likesGiven: likesGiven,
          followers: user.followers,
          daysJoined: daysJoined
      };
  }
  
  async checkAchievements(userId: string): Promise<User> {
      const userIndex = this.data.users.findIndex(u => u.id === userId);
      if (userIndex === -1) throw new Error("User not found");
      let user = this.data.users[userIndex];
      let hasUpdates = false;
      const stats = await this.getAchievementStats(userId);
      const grant = (badgeDef: any) => {
          if (!user.badges.find(b => b.id === badgeDef.id)) {
              user.badges.push({
                  ...badgeDef,
                  earnedDate: new Date().toLocaleDateString()
              });
              hasUpdates = true;
          }
      };
      if (stats.listsCreated >= 1) grant(SYSTEM_BADGES.CREATOR_NOVICE);
      if (stats.listsCreated >= 5) grant(SYSTEM_BADGES.CREATOR_MASTER);
      if (stats.moviesAdded >= 10) grant(SYSTEM_BADGES.LIB_BUILDER_10);
      if (stats.likesGiven >= 5) grant(SYSTEM_BADGES.SOCIAL_FAN);
      if (stats.followers >= 10) grant(SYSTEM_BADGES.INFLUENCER_10);
      if (stats.daysJoined >= 365) grant(SYSTEM_BADGES.VETERAN_1Y);
      if (hasUpdates) {
          this.data.users[userIndex] = user;
          this.save();
      }
      return user;
  }

  async registerUser(name: string, handle: string, email: string, password: string, avatarBase64?: string): Promise<User> {
    await delay(800);
    const cleanHandle = handle.trim().toLowerCase();
    const finalHandle = cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`;
    const cleanEmail = email.trim().toLowerCase();
    if (this.data.users.find(u => u.handle.toLowerCase() === finalHandle)) throw new Error("Handle already taken");
    if (this.data.users.find(u => u.email.toLowerCase() === cleanEmail)) throw new Error("Email already registered");
    const userAvatar = avatarBase64 || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7e22ce&color=fff`;
    const defaultSettings: NotificationSettings = { likes: true, comments: true, follows: true, mentions: true };
    const newUser: User = {
        id: `u_${Date.now()}`,
        name,
        handle: finalHandle, 
        email: cleanEmail,
        password: password,
        role: UserRole.USER,
        avatar: userAvatar,
        coverImage: `https://picsum.photos/800/400?random=${Date.now()}`, 
        bio: 'Just joined Badge&Patch!',
        country: 'Unknown',
        privacy: PrivacyLevel.PUBLIC,
        followers: 0,
        following: 0,
        followingIds: [],
        followedListIds: [],
        joinedAt: Date.now(),
        badges: [],
        watchedMovieIds: [],
        watchingMovieIds: [],
        watchProgress: {},
        notificationSettings: defaultSettings
    };
    this.data.users.push(newUser);
    this.save();
    this.currentUserId = newUser.id;
    localStorage.setItem(SESSION_KEY, newUser.id);
    return newUser;
  }

  async loginUser(handleOrEmail: string, password: string): Promise<User> {
      await delay(600);
      const cleanInput = handleOrEmail.trim().toLowerCase();
      const targetHandle = cleanInput.startsWith('@') ? cleanInput : `@${cleanInput}`;
      const user = this.data.users.find(u => 
        u.handle.toLowerCase() === targetHandle || 
        u.email.toLowerCase() === cleanInput
      );
      if (!user) throw new Error("User not found");
      if (user.password !== password) throw new Error("Invalid credentials");
      this.currentUserId = user.id;
      localStorage.setItem(SESSION_KEY, user.id);
      return user;
  }
  async logout(): Promise<void> {
      this.currentUserId = null;
      localStorage.removeItem(SESSION_KEY);
  }
  async getCurrentUser(): Promise<User | null> {
      if (!this.currentUserId) return null;
      return this.data.users.find(u => u.id === this.currentUserId) || null;
  }
  async createAdminBadge(name: string, description: string, icon: string) {
      const user = await this.getCurrentUser();
      if (!user || user.role !== UserRole.ADMIN) throw new Error("Unauthorized. Admins only.");
      return {
          id: `b_official_${Date.now()}`,
          name,
          description,
          icon,
          type: BadgeType.OFFICIAL,
          earnedDate: new Date().toLocaleDateString()
      };
  }
  async getUser(userId?: string): Promise<User> {
    await delay(300);
    const targetId = userId || this.currentUserId;
    if (!targetId) throw new Error("No user logged in");
    if (!userId || userId === this.currentUserId) await this.checkAchievements(targetId);
    const user = this.data.users.find(u => u.id === targetId);
    if (!user) throw new Error("User not found");
    return { ...user };
  }
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
      await delay(500);
      const index = this.data.users.findIndex(u => u.id === userId);
      if (index === -1) throw new Error("User not found");
      const updatedUser = { ...this.data.users[index], ...updates };
      this.data.users[index] = updatedUser;
      if (updates.name || updates.avatar) {
          this.data.lists = this.data.lists.map(list => {
              if (list.creatorId === userId) {
                  return { ...list, creatorName: updatedUser.name, creatorAvatar: updatedUser.avatar };
              }
              return list;
          });
      }
      this.save();
      return updatedUser;
  }
  async resetData() {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }
  async searchGlobalMovies(query: string): Promise<Movie[]> {
      const lowerQuery = query.toLowerCase();
      if (!lowerQuery) return [];
      const remoteMovies = await omdbService.searchMovies(query);
      const allMoviesMap = new Map<string, Movie>();
      MOCK_MOVIES.forEach(m => allMoviesMap.set(m.id, m));
      this.data.lists.forEach(list => {
          list.items.forEach(item => {
              if (!allMoviesMap.has(item.movie.id)) {
                  allMoviesMap.set(item.movie.id, item.movie);
              }
          });
      });
      const localResults = Array.from(allMoviesMap.values()).filter(m => 
          m.title.toLowerCase().includes(lowerQuery)
      );
      return [...remoteMovies, ...localResults];
  }
  async findSimilarLists(title: string): Promise<MediaList[]> {
      if (!title || title.length < 3) return [];
      const lowerTitle = title.toLowerCase();
      return this.data.lists.filter(l => 
          l.title.toLowerCase().includes(lowerTitle) || 
          lowerTitle.includes(l.title.toLowerCase())
      ).slice(0, 3);
  }
  async getFeed(): Promise<MediaList[]> {
    await delay(400);
    return [...this.data.lists].reverse();
  }
  async getMyLists(): Promise<MediaList[]> {
    await delay(300);
    if (!this.currentUserId) return [];
    const user = await this.getCurrentUser();
    const myLists = this.data.lists.filter(l => l.creatorId === this.currentUserId);
    if (user) {
        return myLists.map(list => {
            const listCopy = JSON.parse(JSON.stringify(list));
            if (!listCopy.comments) listCopy.comments = [];
            listCopy.items.forEach((item: ListItem) => {
                if (user.watchedMovieIds.includes(item.movie.id)) {
                    item.status = WatchStatus.WATCHED;
                } else if (user.watchingMovieIds?.includes(item.movie.id)) {
                    item.status = WatchStatus.WATCHING;
                    if (user.watchProgress && user.watchProgress[item.movie.id] !== undefined) {
                        item.progressMinutes = user.watchProgress[item.movie.id];
                    }
                }
            });
            return listCopy;
        });
    }
    return myLists;
  }
  async getUserLists(userId: string): Promise<MediaList[]> {
      await delay(300);
      const lists = this.data.lists.filter(l => l.creatorId === userId);
      if (this.currentUserId === userId) return lists;
      const currentUser = await this.getCurrentUser();
      const isFollowing = currentUser?.followingIds.includes(userId);
      return lists.filter(l => {
          if (l.privacy === PrivacyLevel.PUBLIC) return true;
          if (l.privacy === PrivacyLevel.FOLLOWERS && isFollowing) return true;
          return false;
      });
  }
  async getListById(listId: string): Promise<MediaList | null> {
      await delay(200);
      const list = this.data.lists.find(l => l.id === listId);
      if (!list) return null;
      if (!list.comments) list.comments = [];
      const user = await this.getCurrentUser();
      if (user) {
          const listForViewer = JSON.parse(JSON.stringify(list));
          listForViewer.items.forEach((item: ListItem) => {
              if (user.watchedMovieIds.includes(item.movie.id)) {
                  item.status = WatchStatus.WATCHED;
                  item.progressMinutes = parseInt(item.movie.duration) || 0;
              } else if (user.watchingMovieIds?.includes(item.movie.id)) {
                  item.status = WatchStatus.WATCHING;
                  if (user.watchProgress && user.watchProgress[item.movie.id] !== undefined) {
                        item.progressMinutes = user.watchProgress[item.movie.id];
                  }
              }
          });
          return listForViewer;
      }
      return list;
  }
  calculateListProgress(list: MediaList, user: User): number {
      const total = list.items.length;
      if (total === 0) return 0;
      const totalProgressValue = list.items.reduce((acc, item) => {
        if (user.watchedMovieIds.includes(item.movie.id)) return acc + 100;
        if (user.watchingMovieIds.includes(item.movie.id)) {
            const duration = parseInt(item.movie.duration) || 120;
            const current = user.watchProgress[item.movie.id] || 0;
            const p = Math.min(99, (current / duration) * 100);
            return acc + p;
        }
        return acc;
      }, 0);
      return Math.round(totalProgressValue / total);
  }
  async createList(title: string, description: string, movies: any[], privacy: PrivacyLevel, category: ListCategory, patchImage?: string): Promise<void> {
    await delay(500);
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Must be logged in");
    const newList: MediaList = {
      id: `l_${Date.now()}`,
      creatorId: user.id,
      creatorName: user.name,
      creatorAvatar: user.avatar,
      title,
      description,
      category,
      privacy,
      items: movies.map(m => ({ movie: m, status: WatchStatus.UNWATCHED, progressMinutes: 0 })),
      reactions: [],
      comments: []
    };
    if (patchImage) {
        newList.badgeReward = {
            id: `patch_${newList.id}`,
            name: `${title} Patch`,
            description: `Completed the ${title} list.`,
            icon: patchImage,
            type: BadgeType.COMMUNITY,
            earnedDate: '',
            relatedListId: newList.id
        };
    } else {
        newList.badgeReward = {
            id: `patch_${newList.id}`,
            name: `${title} Master`,
            description: `Completed the ${title} list.`,
            icon: 'fa-ticket-alt',
            type: BadgeType.COMMUNITY,
            earnedDate: '',
            relatedListId: newList.id
        };
    }
    this.data.lists.push(newList);
    await this.checkAchievements(user.id);
    this.save();
  }
  async updateItemStatus(listId: string, movieId: string, status: WatchStatus): Promise<MediaList> {
      const listIndex = this.data.lists.findIndex(l => l.id === listId);
      if (listIndex === -1) throw new Error("List not found");
      const userIndex = this.data.users.findIndex(u => u.id === this.currentUserId);
      if (userIndex !== -1) {
          const user = this.data.users[userIndex];
          if (!user.watchingMovieIds) user.watchingMovieIds = []; 
          if (!user.watchProgress) user.watchProgress = {};
          if (status === WatchStatus.WATCHED) {
              if (!user.watchedMovieIds.includes(movieId)) {
                  user.watchedMovieIds.push(movieId);
              }
              user.watchingMovieIds = user.watchingMovieIds.filter(id => id !== movieId);
              delete user.watchProgress[movieId];
          } else if (status === WatchStatus.WATCHING) {
              if (!user.watchingMovieIds.includes(movieId)) {
                  user.watchingMovieIds.push(movieId);
              }
              user.watchedMovieIds = user.watchedMovieIds.filter(id => id !== movieId);
              if (user.watchProgress[movieId] === undefined) {
                  user.watchProgress[movieId] = 0;
              }
          } else if (status === WatchStatus.UNWATCHED) {
              user.watchedMovieIds = user.watchedMovieIds.filter(id => id !== movieId);
              user.watchingMovieIds = user.watchingMovieIds.filter(id => id !== movieId);
              delete user.watchProgress[movieId];
          }
          this.data.users[userIndex] = user;
          this.save();
      }
      const list = this.data.lists[listIndex];
      const totalItems = list.items.length;
      if (userIndex !== -1) {
          const user = this.data.users[userIndex];
          const watchedCount = list.items.filter(item => user.watchedMovieIds.includes(item.movie.id)).length;
          if (totalItems > 0 && totalItems === watchedCount && list.badgeReward) {
              if (!user.badges.find(b => b.id === list.badgeReward?.id)) {
                  user.badges.push({
                      ...list.badgeReward,
                      relatedListId: listId, 
                      earnedDate: new Date().toLocaleDateString()
                  });
                  this.data.users[userIndex] = user;
                  this.save();
              }
          }
      }
      return await this.getListById(listId) as MediaList;
  }
  async updateProgressMinutes(listId: string, movieId: string, minutes: number): Promise<void> {
      const userIndex = this.data.users.findIndex(u => u.id === this.currentUserId);
      if (userIndex > -1) {
          const user = this.data.users[userIndex];
          if (!user.watchProgress) user.watchProgress = {};
          user.watchProgress[movieId] = minutes;
          if (!user.watchingMovieIds.includes(movieId) && !user.watchedMovieIds.includes(movieId)) {
              user.watchingMovieIds.push(movieId);
          }
          const list = this.data.lists.find(l => l.id === listId);
          if (list) {
              const item = list.items.find(i => i.movie.id === movieId);
              if (item) {
                  const duration = parseInt(item.movie.duration) || 0;
                  if (duration > 0 && minutes >= duration) {
                      await this.updateItemStatus(listId, movieId, WatchStatus.WATCHED);
                      return; 
                  }
              }
          }
          this.data.users[userIndex] = user;
          this.save();
      }
  }
}

export const db = new LocalDatabase();