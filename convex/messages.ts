import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    content: v.string(),
    senderId: v.id("users"),
    receiverId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get both users to check blocking status
    const sender = await ctx.db.get(args.senderId);
    const receiver = await ctx.db.get(args.receiverId);

    if (!sender || !receiver) {
      throw new Error("User not found");
    }

    // Check if either user has blocked the other
    const senderBlocked = receiver.blockedUsers?.includes(args.senderId);
    const receiverBlocked = sender.blockedUsers?.includes(args.receiverId);

    if (senderBlocked || receiverBlocked) {
      throw new Error("Cannot send message due to blocking");
    }

    return await ctx.db.insert("messages", {
      content: args.content,
      senderId: args.senderId,
      receiverId: args.receiverId,
    });
  },
});

export const getMessages = query({
  args: {
    user1Id: v.id("users"),
    user2Id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("senderId"), args.user1Id),
            q.eq(q.field("receiverId"), args.user2Id)
          ),
          q.and(
            q.eq(q.field("senderId"), args.user2Id),
            q.eq(q.field("receiverId"), args.user1Id)
          )
        )
      )
      .order("asc") // Changed from "desc" to "asc"
      .collect();

    return messages;
  },
});
