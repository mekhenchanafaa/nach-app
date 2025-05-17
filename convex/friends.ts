import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendFriendRequest = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if a friendship already exists
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) =>
        q.eq("userId1", args.fromUserId).eq("userId2", args.toUserId)
      )
      .first();

    if (existingFriendship) {
      throw new Error("Friendship request already exists");
    }

    // Create new friendship request
    return await ctx.db.insert("friendships", {
      userId1: args.fromUserId,
      userId2: args.toUserId,
      status: "pending",
      actionUserId: args.fromUserId,
    });
  },
});

export const getFriendRequests = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) =>
        q.eq("userId2", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Fetch the requester's info for each request
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => ({
        ...request,
        requester: await ctx.db.get(request.userId1),
      }))
    );

    return requestsWithUsers;
  },
});

export const getFriends = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const friendships = await ctx.db
      .query("friendships")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "accepted"),
          q.or(
            q.eq(q.field("userId1"), args.userId),
            q.eq(q.field("userId2"), args.userId)
          )
        )
      )
      .collect();

    const friends = await Promise.all(
      friendships.map(async (friendship) => {
        const friendId =
          friendship.userId1 === args.userId
            ? friendship.userId2
            : friendship.userId1;
        return await ctx.db.get(friendId);
      })
    );

    return friends.filter(Boolean); // Remove any null values
  },
});

export const acceptFriendRequest = mutation({
  args: {
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new Error("Friendship request not found");
    }

    await ctx.db.patch(args.friendshipId, {
      status: "accepted",
    });
  },
});

export const refuseFriendRequest = mutation({
  args: {
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new Error("Friendship request not found");
    }

    await ctx.db.delete(args.friendshipId);
  },
});
