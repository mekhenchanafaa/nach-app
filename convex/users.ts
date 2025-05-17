import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if name is already taken
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existingUser) {
      throw new Error("Name already taken");
    }

    // Create the new user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      password: args.password,
      isOnline: true,
      blockedUsers: [],
    });

    return userId;
  },
});

export const login = query({
  args: {
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!user || user.password !== args.password) {
      return null;
    }

    return user;
  },
});

export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const searchUsers = query({
  args: {
    searchTerm: v.string(),
    currentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (!args.searchTerm) return [];
    
    const users = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.gte("name", args.searchTerm))
      .filter((q) => q.lt(q.field("name"), args.searchTerm + "\uffff"))
      .collect();

    // Filter out the current user and users that already have a friendship
    const filteredUsers = [];
    for (const user of users) {
      if (user._id === args.currentUserId) continue;

      const existingFriendship = await ctx.db
        .query("friendships")
        .withIndex("by_users", (q) =>
          q.eq("userId1", args.currentUserId).eq("userId2", user._id)
        )
        .first();

      if (!existingFriendship) {
        filteredUsers.push(user);
      }
    }

    return filteredUsers;
  },
});

export const blockUser = mutation({
  args: {
    userId: v.id("users"),
    userToBlockId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const blockedUsers = user.blockedUsers || [];
    if (!blockedUsers.includes(args.userToBlockId)) {
      blockedUsers.push(args.userToBlockId);
    }

    await ctx.db.patch(args.userId, {
      blockedUsers,
    });
  },
});

export const unblockUser = mutation({
  args: {
    userId: v.id("users"),
    userToUnblockId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const blockedUsers = user.blockedUsers || [];
    const index = blockedUsers.indexOf(args.userToUnblockId);
    if (index > -1) {
      blockedUsers.splice(index, 1);
    }

    await ctx.db.patch(args.userId, {
      blockedUsers,
    });
  },
});

export const deleteAccount = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Delete all friendships
    const friendships = await ctx.db
      .query("friendships")
      .filter((q) =>
        q.or(
          q.eq(q.field("userId1"), args.userId),
          q.eq(q.field("userId2"), args.userId)
        )
      )
      .collect();

    for (const friendship of friendships) {
      await ctx.db.delete(friendship._id);
    }

    // Delete all messages
    const messages = await ctx.db
      .query("messages")
      .filter((q) =>
        q.or(
          q.eq(q.field("senderId"), args.userId),
          q.eq(q.field("receiverId"), args.userId)
        )
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the user
    await ctx.db.delete(args.userId);
  },
});
