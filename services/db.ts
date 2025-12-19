
import { MediaList, User, WatchStatus, PrivacyLevel, UserRole, Strike, AdminLog, BannedEmail, Report, ReportReason, Notification, Media, Reaction, Badge, BadgeType, ListCategory, NotificationSettings, ActivityItem, Comment, MediaType, ListItem, Season } from '../types';
import { CURRENT_USER, MOCK_LISTS, ADMIN_USER, ADDITIONAL_USERS, MOCK_MOVIES, SYSTEM_BADGES } from './mockData';
import { omdbService } from './omdb';

const DB_KEY = 'watchquest_security_db_v1';
const SESSION_KEY = 'watchquest_session_v1';

const STRIKE_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 30 * 6;

interface Schema {
  users: User[];
  lists: MediaList[];
  reports: Report[];
  notifications: Notification[];
  adminLogs: AdminLog[];
  blacklist: BannedEmail[];
  globalBadges: Badge[];
}

class LocalDatabase {
  private data: Schema;
  private currentUserId: string | null = null;

  constructor() {
    const stored = localStorage.getItem(DB_KEY);
    this.currentUserId = localStorage.getItem(SESSION_KEY);

    if (stored) {
      this.data = JSON.parse(stored);
      
      // MIGRATION: Ensure all top-level collections exist
      if (!this.data.reports) this.data.reports = [];
      if (!this.data.notifications) this.data.notifications = [];
      if (!this.data.adminLogs) this.data.adminLogs = [];
      if (!this.data.blacklist) this.data.blacklist = [];
      if (!this.data.globalBadges) this.data.globalBadges = Object.values(SYSTEM_BADGES);

      // MIGRATION: Ensure user properties exist
      this.data.users.forEach(u => {
        if (!u.hiddenPatchIds) u.hiddenPatchIds = [];
        if (!u.hiddenBadgeIds) u.hiddenBadgeIds = [];
        if (!u.strikes) u.strikes = [];
        if (u.isPermanentlyBanned === undefined) u.isPermanentlyBanned = false;
        if (!u.followedListIds) u.followedListIds = [];
        if (!u.followingIds) u.followingIds = [];
      });

      // MIGRATION: Ensure list properties exist
      this.data.lists.forEach(l => {
        if (!l.reactions) l.reactions = [];
        if (!l.comments) l.comments = [];
      });

      this.cleanupExpiredStrikes();
    } else {
      this.data = {
        users: [
          { ...CURRENT_USER, strikes: [], isPermanentlyBanned: false, hiddenPatchIds: [], hiddenBadgeIds: [] },
          { ...ADMIN_USER, strikes: [], isPermanentlyBanned: false, hiddenPatchIds: [], hiddenBadgeIds: [] },
          ...ADDITIONAL_USERS.map(u => ({ ...u, strikes: [], isPermanentlyBanned: false, hiddenPatchIds: [], hiddenBadgeIds: [] }))
        ],
        lists: MOCK_LISTS,
        reports: [],
        notifications: [],
        adminLogs: [],
        blacklist: [],
        globalBadges: Object.values(SYSTEM_BADGES)
      };
      this.save();
    }
  }

  private save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
  }

  private createNotification(userId: string, type: Notification['type'], actor: User, targetId?: string, targetPreview?: string) {
    const newNotification: Notification = {
      id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      actorId: actor.id,
      actorName: actor.name,
      actorAvatar: actor.avatar,
      targetId,
      targetPreview,
      isRead: false,
      timestamp: Date.now()
    };
    if (!this.data.notifications) this.data.notifications = [];
    this.data.notifications.push(newNotification);
    this.save();
  }

  private cleanupExpiredStrikes() {
    const now = Date.now();
    let changed = false;
    this.data.users.forEach(u => {
      const activeStrikes = u.strikes.filter(s => s.expiresAt > now);
      if (activeStrikes.length !== u.strikes.length) {
        u.strikes = activeStrikes;
        changed = true;
      }
    });
    if (changed) this.save();
  }

  async loginUser(handle: string, pass: string) {
    const u = this.data.users.find(usr => (usr.handle === handle || usr.email === handle) && usr.password === pass);
    if (!u) throw new Error("Credenciais inválidas.");
    if (u.isPermanentlyBanned) throw new Error(`Conta banida: ${u.banReason}`);
    this.currentUserId = u.id;
    localStorage.setItem(SESSION_KEY, u.id);
    return u;
  }

  async registerUser(name: string, handle: string, email: string, pass: string, avatar?: string) {
    if (this.data.blacklist.some(b => b.email === email.toLowerCase())) throw new Error("Este e-mail está banido permanentemente.");
    if (this.data.users.find(u => u.handle === handle)) throw new Error("Handle already taken.");
    if (this.data.users.find(u => u.email === email)) throw new Error("Email already registered.");

    const newUser: User = {
      id: `u_${Date.now()}`,
      name,
      handle,
      email,
      password: pass,
      role: UserRole.USER,
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      bio: '',
      country: '',
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
      notificationSettings: { likes: true, comments: true, follows: true, mentions: true },
      strikes: [],
      isPermanentlyBanned: false,
      hiddenPatchIds: [],
      hiddenBadgeIds: []
    };

    this.data.users.push(newUser);
    this.save();
    this.currentUserId = newUser.id;
    localStorage.setItem(SESSION_KEY, newUser.id);
    return newUser;
  }

  async getCurrentUser() { return this.data.users.find(u => u.id === this.currentUserId) || null; }
  async getUserById(id: string) { return this.data.users.find(u => u.id === id) || null; }

  async updateUser(userId: string, update: Partial<User>) {
    const userIndex = this.data.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");
    this.data.users[userIndex] = { ...this.data.users[userIndex], ...update };
    this.save();
    return this.data.users[userIndex];
  }

  async getFeed() { return this.data.lists.filter(l => l.privacy === PrivacyLevel.PUBLIC).sort((a, b) => b.id.localeCompare(a.id)); }
  async getListById(id: string) { return this.data.lists.find(l => l.id === id) || null; }
  async getMyLists() { return this.data.lists.filter(l => l.creatorId === this.currentUserId); }
  async getUserLists(userId: string) { return this.data.lists.filter(l => l.creatorId === userId && l.privacy === PrivacyLevel.PUBLIC); }
  async getFollowedLists() {
    const me = await this.getCurrentUser();
    if (!me) return [];
    return this.data.lists.filter(l => me.followedListIds.includes(l.id));
  }

  async createList(title: string, description: string, items: Media[], privacy: PrivacyLevel, category: ListCategory, badgeImage?: string) {
    const me = await this.getCurrentUser();
    if (!me) throw new Error("Auth required");
    
    const newList: MediaList = {
      id: `l_${Date.now()}`,
      creatorId: me.id,
      creatorName: me.name,
      creatorAvatar: me.avatar,
      title,
      description,
      category,
      privacy,
      items: items.map(m => {
        const isSeries = m.type !== MediaType.MOVIE;
        return { 
          media: m, 
          status: WatchStatus.UNWATCHED,
          currentSeason: isSeries ? 1 : undefined,
          currentEpisode: isSeries ? 0 : undefined,
          watchedHistory: isSeries ? [] : undefined
        };
      }),
      reactions: [],
      comments: [],
      badgeReward: badgeImage ? {
        id: `b_reward_${Date.now()}`,
        name: `${title} Master`,
        description: `Awarded for completing the ${title} list.`,
        icon: badgeImage,
        type: BadgeType.COMMUNITY,
        relatedListId: `l_${Date.now()}`
      } : undefined
    };

    if (newList.badgeReward) newList.badgeReward.relatedListId = newList.id;
    this.data.lists.push(newList);
    this.save();
    return newList;
  }

  async syncSeasonEpisodes(listId: string, mediaId: string, seasonNumber: number) {
    const list = await this.getListById(listId);
    if (!list) return null;
    const item = list.items.find(i => i.media.id === mediaId);
    
    if (item && item.media.seasonsData) {
      const seasonIdx = item.media.seasonsData.findIndex(s => s.seasonNumber === seasonNumber);
      if (seasonIdx === -1) return list;

      const season = item.media.seasonsData[seasonIdx];
      if (!season.episodes || season.episodes.length === 0) {
        const episodes = await omdbService.getSeasonEpisodes(mediaId, seasonNumber);
        if (episodes.length > 0) {
          item.media.seasonsData[seasonIdx].episodes = episodes;
          item.media.seasonsData[seasonIdx].episodesCount = episodes.length;
          this.save();
        }
      }
    }
    return list;
  }

  async updateItemStatus(listId: string, mediaId: string, status: WatchStatus) {
    const list = await this.getListById(listId);
    if (!list) return null;
    const item = list.items.find(i => i.media.id === mediaId);
    if (item) {
      item.status = status;
      if (status === WatchStatus.WATCHED) {
        if (item.media.type === MediaType.MOVIE) {
          const duration = parseInt(item.media.duration) || 120;
          item.progressMinutes = duration;
        } else if (item.media.seasonsData) {
          item.currentSeason = item.media.seasonsData.length;
          const history: string[] = [];
          item.media.seasonsData.forEach(s => {
             const count = s.episodesCount || 10;
             for(let e=1; e<=count; e++) history.push(`S${s.seasonNumber}E${e}`);
          });
          item.watchedHistory = history;
          item.currentEpisode = item.media.seasonsData[item.media.seasonsData.length - 1].episodesCount || 0;
        }
      } else if (status === WatchStatus.UNWATCHED) {
        item.progressMinutes = 0;
        item.currentSeason = item.media.type === MediaType.MOVIE ? undefined : 1;
        item.currentEpisode = item.media.type === MediaType.MOVIE ? undefined : 0;
        item.watchedHistory = item.media.type === MediaType.MOVIE ? undefined : [];
      }
      this.save();
    }
    return list;
  }

  async setSeriesMarkers(listId: string, mediaId: string, season: number, episode: number) {
    const list = await this.getListById(listId);
    if (!list) return null;
    const item = list.items.find(i => i.media.id === mediaId);
    
    if (item && item.media.type !== MediaType.MOVIE && item.media.seasonsData) {
      item.currentSeason = season;
      item.currentEpisode = episode;
      
      if (!item.watchedHistory) item.watchedHistory = [];

      item.watchedHistory = item.watchedHistory.filter(h => {
        const match = h.match(/S(\d+)E(\d+)/);
        if (match) {
          const s = parseInt(match[1]);
          const e = parseInt(match[2]);
          if (s === season) {
            return e <= episode;
          }
        }
        return true;
      });

      for (let e = 1; e <= episode; e++) {
        const epKey = `S${season}E${e}`;
        if (!item.watchedHistory.includes(epKey)) {
          item.watchedHistory.push(epKey);
        }
      }
      
      const totalEpsEstimated = item.media.seasonsData.reduce((acc, s) => acc + (s.episodesCount || 10), 0);
      
      if (item.watchedHistory.length >= totalEpsEstimated) {
        item.status = WatchStatus.WATCHED;
      } else if (item.watchedHistory.length > 0) {
        item.status = WatchStatus.WATCHING;
      } else {
        item.status = WatchStatus.UNWATCHED;
      }

      this.save();
    }
    return list;
  }

  async updateDetailedProgress(listId: string, mediaId: string, season: number, episode: number) {
    const list = await this.getListById(listId);
    if (!list) return null;
    const item = list.items.find(i => i.media.id === mediaId);
    if (item && item.media.type !== MediaType.MOVIE && item.media.seasonsData) {
      item.currentSeason = season;
      item.currentEpisode = episode;
      
      const epKey = `S${season}E${episode}`;
      if (!item.watchedHistory) item.watchedHistory = [];
      if (!item.watchedHistory.includes(epKey)) {
        item.watchedHistory.push(epKey);
      } else {
        item.watchedHistory = item.watchedHistory.filter(h => h !== epKey);
      }

      const totalEpsEstimated = item.media.seasonsData.reduce((acc, s) => acc + (s.episodesCount || 10), 0);
      if (item.watchedHistory.length >= totalEpsEstimated) {
        item.status = WatchStatus.WATCHED;
      } else if (item.watchedHistory.length > 0) {
        item.status = WatchStatus.WATCHING;
      } else {
        item.status = WatchStatus.UNWATCHED;
      }

      this.save();
    }
    return list;
  }

  async updateMinutesProgress(listId: string, mediaId: string, minutes: number) {
    const list = await this.getListById(listId);
    if (!list) return null;
    const item = list.items.find(i => i.media.id === mediaId);
    if (item && item.media.type === MediaType.MOVIE) {
      const duration = parseInt(item.media.duration) || 120;
      item.progressMinutes = Math.min(duration, Math.max(0, minutes));
      
      if (item.progressMinutes === duration) {
        item.status = WatchStatus.WATCHED;
      } else if (item.progressMinutes > 0) {
        item.status = WatchStatus.WATCHING;
      } else {
        item.status = WatchStatus.UNWATCHED;
      }
      this.save();
    }
    return list;
  }

  async calculateListProgress(list: MediaList) {
    if (!list.items.length) return 0;
    const totalProgress = list.items.reduce((acc, item) => {
      if (item.status === WatchStatus.WATCHED) return acc + 100;
      
      if (item.media.type === MediaType.MOVIE) {
        const duration = parseInt(item.media.duration) || 120;
        const current = item.progressMinutes || 0;
        return acc + (current / duration * 100);
      } else {
        const totalSeasons = item.media.totalSeasons || 1;
        const totalEpsEstimated = item.media.seasonsData?.reduce((sAcc, s) => sAcc + (s.episodesCount || 10), 0) || (totalSeasons * 10);
        const watched = item.watchedHistory?.length || 0;
        return acc + (watched / Math.max(1, totalEpsEstimated) * 100);
      }
    }, 0);
    return Math.round(totalProgress / list.items.length);
  }

  async findSimilarLists(title: string) { return this.data.lists.filter(l => l.title.toLowerCase().includes(title.toLowerCase())).slice(0, 3); }
  
  async searchGlobalMovies(query: string) { 
    const local = MOCK_MOVIES.filter(m => m.title.toLowerCase().includes(query.toLowerCase()));
    const remote = await omdbService.searchMovies(query);
    const combined = [...local, ...remote];
    const seen = new Set();
    return combined.filter(m => {
        const duplicate = seen.has(m.id);
        seen.add(m.id);
        return !duplicate;
    });
  }

  async searchLists(query: string) { return this.data.lists.filter(l => l.title.toLowerCase().includes(query.toLowerCase()) && l.privacy === PrivacyLevel.PUBLIC); }
  async searchUsers(query: string) { return this.data.users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.handle.toLowerCase().includes(query.toLowerCase())); }

  async followUser(targetId: string) {
    const me = await this.getCurrentUser();
    const target = await this.getUserById(targetId);
    if (!me || !target || me.id === targetId) return;
    if (!me.followingIds.includes(targetId)) {
      me.followingIds.push(targetId);
      me.following++;
      target.followers++;
      this.createNotification(targetId, 'follow', me);
      this.save();
    }
  }

  async unfollowUser(targetId: string) {
    const me = await this.getCurrentUser();
    const target = await this.getUserById(targetId);
    if (!me || !target) return;
    me.followingIds = me.followingIds.filter(id => id !== targetId);
    me.following = Math.max(0, me.following - 1);
    target.followers = Math.max(0, target.followers - 1);
    this.save();
  }

  async getFollowers(userId: string) { return this.data.users.filter(u => u.followingIds.includes(userId)); }
  async getFollowing(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) return [];
    return this.data.users.filter(u => user.followingIds.includes(u.id));
  }

  async toggleReaction(listId: string, emoji: string) {
    const me = await this.getCurrentUser();
    const list = await this.getListById(listId);
    if (!me || !list) return [];
    
    if (!list.reactions) list.reactions = [];
    
    // Garantir exclusividade: apenas uma reação por usuário
    const existingReactionIndex = list.reactions.findIndex(r => r.userId === me.id);

    if (existingReactionIndex !== -1) {
        const currentEmoji = list.reactions[existingReactionIndex].emoji;
        if (currentEmoji === emoji) {
            // Desmarcar (toggle off) se for o mesmo emoji
            list.reactions.splice(existingReactionIndex, 1);
        } else {
            // Substituir pelo novo se for diferente
            list.reactions[existingReactionIndex].emoji = emoji;
            list.reactions[existingReactionIndex].timestamp = Date.now();
        }
    } else {
        // Nova reação
        list.reactions.push({ id: `re_${Date.now()}`, userId: me.id, emoji, timestamp: Date.now() });
        if (list.creatorId !== me.id) {
            this.createNotification(list.creatorId, 'like', me, list.id, `reacted ${emoji} to your list "${list.title}"`);
        }
    }
    
    this.save();
    return [...list.reactions];
  }

  async addComment(listId: string, text: string, replyToId?: string) {
    const me = await this.getCurrentUser();
    const list = await this.getListById(listId);
    if (!me || !list) throw new Error("Not found");
    
    if (!list.comments) list.comments = [];
    
    const newComment: Comment = { 
      id: `c_${Date.now()}`, 
      userId: me.id, 
      userName: me.name, 
      userAvatar: me.avatar, 
      text, 
      timestamp: Date.now(), 
      replies: [] 
    };

    if (replyToId) {
      const parent = list.comments.find(c => c.id === replyToId);
      if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(newComment);
      }
    } else {
        list.comments.push(newComment);
    }
    
    if (list.creatorId !== me.id) {
        this.createNotification(list.creatorId, 'comment', me, list.id, `commented on your list "${list.title}"`);
    }

    this.save();
    return { ...list };
  }

  async getGlobalBadges() { return this.data.globalBadges; }
  async createGlobalBadge(name: string, description: string, icon: string) {
    const newBadge: Badge = {
      id: `gb_${Date.now()}`,
      name,
      description,
      icon,
      type: BadgeType.OFFICIAL,
      earnedDate: new Date().toISOString().split('T')[0]
    };
    this.data.globalBadges.push(newBadge);
    this.save();
    return newBadge;
  }

  async grantBadgeToUser(userId: string, badgeId: string) {
    const user = await this.getUserById(userId);
    const badge = this.data.globalBadges.find(b => b.id === badgeId);
    if (!user || !badge) return;
    if (!user.badges.some(b => b.id === badgeId)) {
      user.badges.push({ ...badge, earnedDate: new Date().toISOString().split('T')[0] });
      const admin = await this.getCurrentUser();
      this.createNotification(userId, 'mention', admin!, undefined, `Achievement unlocked: ${badge.name}`);
      this.save();
    }
  }

  async getListStats(listId: string) { return { followers: this.data.users.filter(u => u.followedListIds.includes(listId)).length, completers: 0 }; }
  async getReports() { return this.data.reports; }
  async getAllUsers() { return this.data.users; }
  async getDashboardStats() {
    return {
      totalUsers: this.data.users.length,
      bannedUsers: this.data.users.filter(u => u.isPermanentlyBanned).length,
      pendingReports: this.data.reports.filter(r => r.status === 'pending').length,
      activeWarnings: this.data.users.reduce((acc, u) => acc + u.strikes.length, 0)
    };
  }
  async getNotifications() { return (this.data.notifications || []).filter(n => n.userId === this.currentUserId).sort((a,b) => b.timestamp - a.timestamp); }
  async markAllNotificationsRead() { 
    if (this.data.notifications) {
        this.data.notifications.forEach(n => { if(n.userId === this.currentUserId) n.isRead = true; }); 
        this.save(); 
    }
  }
  async getUnreadNotificationCount() { return (this.data.notifications || []).filter(n => n.userId === this.currentUserId && !n.isRead).length; }
  async updateNotificationSettings(settings: NotificationSettings) {
    const me = await this.getCurrentUser();
    if (me) { me.notificationSettings = settings; this.save(); }
  }
  async resetData() { localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); window.location.reload(); }
  async getAchievementStats(userId: string) {
    const user = await this.getUserById(userId);
    const lists = this.data.lists.filter(l => l.creatorId === userId);
    return { listsCreated: lists.length, moviesAdded: lists.reduce((acc, l) => acc + l.items.length, 0), likesGiven: 0, followers: user?.followers || 0, daysJoined: user ? Math.floor((Date.now() - user.joinedAt) / (1000 * 60 * 60 * 24)) : 0 };
  }
  async getActivityFeed(): Promise<ActivityItem[]> {
    const me = await this.getCurrentUser();
    if (!me) return [];
    const feed: ActivityItem[] = [];
    const followedUsers = this.data.users.filter(u => me.followingIds.includes(u.id));
    followedUsers.forEach(u => {
      this.data.lists.filter(l => l.creatorId === u.id).forEach(l => feed.push({ id: `act_l_${l.id}`, type: 'list_created', user: u, timestamp: parseInt(l.id.split('_')[1] || Date.now().toString()), data: l }));
      u.badges.forEach(b => feed.push({ id: `act_b_${b.id}`, type: 'badge_earned', user: u, timestamp: Date.now(), data: b }));
    });
    return feed.sort((a, b) => b.timestamp - a.timestamp);
  }
  async followList(listId: string) {
    const me = await this.getCurrentUser();
    if (me && !me.followedListIds.includes(listId)) { me.followedListIds.push(listId); this.save(); }
  }
  async unfollowList(listId: string) {
    const me = await this.getCurrentUser();
    if (me) { me.followedListIds = me.followedListIds.filter(id => id !== listId); this.save(); }
  }
  async submitReport(targetId: string, targetType: 'list' | 'user', reason: ReportReason, details: string) {
    const reporter = await this.getCurrentUser();
    if (!this.data.reports) this.data.reports = [];
    this.data.reports.push({ id: `rep_${Date.now()}`, reporterId: reporter?.id || 'anon', reporterName: reporter?.name || 'Anônimo', targetId, targetType, reason, details, timestamp: Date.now(), status: 'pending' });
    this.save();
  }
  async respondToReport(reportId: string, adminResponse: string) {
    const report = this.data.reports.find(r => r.id === reportId);
    if (report) {
      report.adminResponse = adminResponse;
      report.status = 'resolved';
      report.respondedAt = Date.now();
      if (report.reporterId !== 'anon') {
        const admin = await this.getCurrentUser();
        this.createNotification(report.reporterId, 'admin_response', admin!, report.targetId, "Sua denúncia foi analisada.");
      }
      this.save();
    }
  }
  async issueStrike(userId: string, reason: string) {
    const admin = await this.getCurrentUser();
    const user = this.data.users.find(u => u.id === userId);
    if (user && admin) {
      if (!user.strikes) user.strikes = [];
      user.strikes.push({ id: `stk_${Date.now()}`, reason, timestamp: Date.now(), expiresAt: Date.now() + STRIKE_EXPIRATION_MS, issuedByAdminId: admin.id });
      this.createNotification(userId, 'strike_alert', admin, undefined, `Warning applied: ${reason}`);
      if (user.strikes.length >= 3) await this.banUser(userId, "Accumulation of 3 active warnings.");
      this.save();
    }
  }
  async banUser(userId: string, reason: string) {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.isPermanentlyBanned = true;
      user.banReason = reason;
      if (!this.data.blacklist) this.data.blacklist = [];
      if (!this.data.blacklist.some(b => b.email === user.email)) this.data.blacklist.push({ email: user.email.toLowerCase(), bannedAt: Date.now(), reason });
      this.save();
    }
  }
}

export const db = new LocalDatabase();
